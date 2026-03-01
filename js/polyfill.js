(function () {
  "use strict";

  var _isTauri = !!(window.__TAURI__ && window.__TAURI__.core);

  function _invoke(cmd, args) {
    return window.__TAURI__.core.invoke(cmd, args);
  }

  // ── chrome.runtime / chrome.i18n / chrome.storage.local ──────────────
  var _storage = {};
  window.chrome = window.chrome || {};
  chrome.runtime = chrome.runtime || {};
  chrome.i18n = chrome.i18n || {};
  chrome.storage = chrome.storage || {};
  chrome.storage.local = chrome.storage.local || {};
  chrome.runtime.lastError = null;

  if (typeof chrome.runtime.getManifest !== "function") {
    chrome.runtime.getManifest = function () {
      return { version: "1.0.36" };
    };
  }
  if (typeof chrome.i18n.getMessage !== "function") {
    chrome.i18n.getMessage = function (n) {
      if (n === "DESKTOP_SPLASH_LOADING") return "Loading...";
      return n || "";
    };
  }
  if (typeof chrome.storage.local.get !== "function") {
    chrome.storage.local.get = function (keys, cb) {
      if (!cb) return;
      var out = {},
        k = Array.isArray(keys)
          ? keys
          : keys == null
          ? Object.keys(_storage)
          : [keys];
      for (var i = 0; i < k.length; i++) {
        if (_storage.hasOwnProperty(k[i])) out[k[i]] = _storage[k[i]];
      }
      setTimeout(function () { cb(out); }, 0);
    };
  }
  if (typeof chrome.storage.local.set !== "function") {
    chrome.storage.local.set = function (obj, cb) {
      for (var key in obj)
        if (obj.hasOwnProperty(key)) _storage[key] = obj[key];
      if (typeof cb === "function") setTimeout(cb, 0);
    };
  }

  // ── chrome.app.window (stub) ─────────────────────────────────────────
  chrome.app = chrome.app || {};
  chrome.app.window = chrome.app.window || {};
  if (typeof chrome.app.window.create !== "function") {
    chrome.app.window.create = function (_url, _opts, cb) {
      if (typeof cb === "function") cb(null);
    };
  }

  // ── chrome.fileSystem polyfill ───────────────────────────────────────

  chrome.fileSystem = chrome.fileSystem || {};

  // ShimFileEntry wraps either a local File (from <input>) or a native path from Tauri dialog
  function ShimFileEntry(file, name, nativePath) {
    this._file = file || null;
    this._nativePath = nativePath || null;
    this.name = name || (file ? file.name : "untitled.gliffy");
    this.fullPath = nativePath || this.name;
    this.isFile = true;
    this.isDirectory = false;
  }

  ShimFileEntry.prototype.file = function (successCb, errorCb) {
    if (this._file) {
      successCb(this._file);
    } else if (this._nativePath && _isTauri) {
      _invoke("read_file_content", { path: this._nativePath })
        .then(function (bytes) {
          var blob = new Blob([new Uint8Array(bytes)], { type: "text/plain" });
          successCb(blob);
        })
        .catch(function (e) {
          if (errorCb) errorCb(e);
        });
    } else if (errorCb) {
      errorCb(new Error("No file data"));
    }
  };

  ShimFileEntry.prototype.createWriter = function (cb) {
    var self = this;
    var writer = {
      onwriteend: null,
      onerror: null,
      error: null,
      truncate: function () {
        if (this.onwriteend) this.onwriteend({});
      },
      seek: function () {},
      write: function (blob) {
        var w = this;
        if (self._nativePath && _isTauri) {
          var reader = new FileReader();
          reader.onload = function () {
            var arr = new Uint8Array(reader.result);
            _invoke("write_file_content", {
              params: { path: self._nativePath, data: Array.from(arr) },
            })
              .then(function () {
                if (w.onwriteend) w.onwriteend({});
              })
              .catch(function (e) {
                w.error = e;
                if (w.onerror) w.onerror(e);
              });
          };
          reader.readAsArrayBuffer(blob);
        } else {
          // Fallback: browser download
          var a = document.createElement("a");
          var url = URL.createObjectURL(blob);
          a.href = url;
          a.download = self.name;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);
          if (w.onwriteend) w.onwriteend({});
        }
      },
    };
    cb(writer);
  };

  ShimFileEntry.prototype.remove = function (successCb) {
    if (typeof successCb === "function") successCb();
  };

  ShimFileEntry.prototype.getMetadata = function (successCb) {
    var mod = this._file ? new Date(this._file.lastModified) : new Date();
    successCb({ modificationTime: mod });
  };

  chrome.fileSystem.chooseEntry = function (opts, cb) {
    if (!cb) return;
    var type = opts.type || "openFile";

    if (type === "openWritableFile" || type === "openFile") {
      if (_isTauri) {
        var filters = [];
        if (opts.accepts) {
          for (var i = 0; i < opts.accepts.length; i++) {
            var a = opts.accepts[i];
            if (a.extensions) {
              filters.push({ name: a.extensions.join("/"), extensions: a.extensions });
            }
          }
        }
        _invoke("open_file_dialog", { params: { filters: filters } })
          .then(function (result) {
            if (result) {
              _invoke("read_file_content", { path: result.path })
                .then(function (bytes) {
                  var blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
                  var file = new File([blob], result.name, { type: blob.type });
                  cb(new ShimFileEntry(file, result.name, result.path));
                })
                .catch(function () { cb(null); });
            } else {
              cb(null);
            }
          })
          .catch(function () { cb(null); });
      } else {
        // Fallback: <input type="file">
        var input = document.createElement("input");
        input.type = "file";
        var exts = [];
        if (opts.accepts) {
          for (var ii = 0; ii < opts.accepts.length; ii++) {
            var aa = opts.accepts[ii];
            if (aa.extensions) {
              for (var jj = 0; jj < aa.extensions.length; jj++) {
                exts.push("." + aa.extensions[jj]);
              }
            }
          }
        }
        if (exts.length) input.accept = exts.join(",");
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener("change", function () {
          document.body.removeChild(input);
          if (input.files && input.files.length > 0) {
            cb(new ShimFileEntry(input.files[0], input.files[0].name));
          } else {
            cb(null);
          }
        });
        input.addEventListener("cancel", function () {
          document.body.removeChild(input);
          cb(null);
        });
        input.click();
      }
    } else if (type === "saveFile") {
      var suggestedName = opts.suggestedName || "untitled";
      var ext = "";
      if (opts.accepts && opts.accepts[0] && opts.accepts[0].extensions) {
        ext = opts.accepts[0].extensions[0];
      }
      if (ext && suggestedName.indexOf("." + ext) === -1) {
        suggestedName += "." + ext;
      }

      if (_isTauri) {
        var saveFilters = [];
        if (opts.accepts) {
          for (var si = 0; si < opts.accepts.length; si++) {
            var sa = opts.accepts[si];
            if (sa.extensions) {
              saveFilters.push({ name: sa.extensions.join("/"), extensions: sa.extensions });
            }
          }
        }
        _invoke("save_file_dialog", {
          params: { suggestedName: suggestedName, filters: saveFilters },
        })
          .then(function (result) {
            if (result) {
              var fileName = result.path.replace(/\\/g, "/").split("/").pop();
              cb(new ShimFileEntry(null, fileName, result.path));
            } else {
              cb(null);
            }
          })
          .catch(function () { cb(null); });
      } else {
        cb(new ShimFileEntry(null, suggestedName));
      }
    } else {
      cb(null);
    }
  };

  chrome.fileSystem.getWritableEntry = function (entry, cb, errCb) {
    if (typeof cb === "function") cb(entry);
  };

  chrome.fileSystem.getDisplayPath = function (entry, cb) {
    if (typeof cb === "function") cb(entry._nativePath || entry.name || entry.fullPath || "");
  };

  // ── webkitStorageInfo / webkitRequestFileSystem polyfill ─────────────
  // Backed by IndexedDB for auto-save (temp drafts) across sessions.

  var IDB_NAME = "GliffyFS";
  var IDB_STORE = "files";
  var _idbReady = null;

  function _getIDB() {
    if (_idbReady) return _idbReady;
    _idbReady = new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "path" });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
    return _idbReady;
  }

  function IDBFileEntry(path) {
    this.name = path.split("/").pop();
    this.fullPath = "/" + path;
    this._path = path;
    this.isFile = true;
    this.isDirectory = false;
  }

  IDBFileEntry.prototype.file = function (successCb, errorCb) {
    var p = this._path;
    _getIDB().then(function (db) {
      var tx = db.transaction(IDB_STORE, "readonly");
      var req = tx.objectStore(IDB_STORE).get(p);
      req.onsuccess = function () {
        if (req.result && req.result.data !== undefined) {
          var blob = new Blob([req.result.data], { type: "text/plain" });
          blob.lastModified = req.result.lastModified || Date.now();
          successCb(blob);
        } else {
          successCb(new Blob([""], { type: "text/plain" }));
        }
      };
      req.onerror = function () { if (errorCb) errorCb(req.error); };
    });
  };

  IDBFileEntry.prototype.createWriter = function (cb) {
    var p = this._path;
    var writer = {
      onwriteend: null,
      onerror: null,
      error: null,
      truncate: function () { if (this.onwriteend) this.onwriteend({}); },
      seek: function () {},
      write: function (blob) {
        var self = this;
        var reader = new FileReader();
        reader.onload = function () {
          _getIDB().then(function (db) {
            var tx = db.transaction(IDB_STORE, "readwrite");
            tx.objectStore(IDB_STORE).put({
              path: p,
              data: reader.result,
              lastModified: Date.now(),
            });
            tx.oncomplete = function () { if (self.onwriteend) self.onwriteend({}); };
            tx.onerror = function () {
              self.error = tx.error;
              if (self.onerror) self.onerror(tx.error);
            };
          });
        };
        reader.readAsText(blob);
      },
    };
    cb(writer);
  };

  IDBFileEntry.prototype.remove = function (successCb, errorCb) {
    var p = this._path;
    _getIDB().then(function (db) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(p);
      tx.oncomplete = function () { if (typeof successCb === "function") successCb(); };
      tx.onerror = function () { if (typeof errorCb === "function") errorCb(tx.error); };
    });
  };

  IDBFileEntry.prototype.getMetadata = function (successCb, errorCb) {
    var p = this._path;
    _getIDB().then(function (db) {
      var tx = db.transaction(IDB_STORE, "readonly");
      var req = tx.objectStore(IDB_STORE).get(p);
      req.onsuccess = function () {
        var mod = req.result ? new Date(req.result.lastModified) : new Date();
        successCb({ modificationTime: mod });
      };
      req.onerror = function () { if (errorCb) errorCb(req.error); };
    });
  };

  function IDBDirEntry(path) {
    this.name = path ? path.split("/").pop() : "";
    this.fullPath = "/" + path;
    this._path = path;
    this.isFile = false;
    this.isDirectory = true;
  }

  IDBDirEntry.prototype.getFile = function (name, opts, successCb, errorCb) {
    var filePath = this._path ? this._path + "/" + name : name;
    if (opts && opts.create) {
      _getIDB().then(function (db) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        var store = tx.objectStore(IDB_STORE);
        var req = store.get(filePath);
        req.onsuccess = function () {
          if (!req.result) {
            store.put({ path: filePath, data: "", lastModified: Date.now() });
          }
          tx.oncomplete = function () { successCb(new IDBFileEntry(filePath)); };
        };
        req.onerror = function () { if (errorCb) errorCb(req.error); };
      });
    } else {
      successCb(new IDBFileEntry(filePath));
    }
  };

  IDBDirEntry.prototype.getDirectory = function (name, opts, successCb) {
    var dirPath = this._path ? this._path + "/" + name : name;
    successCb(new IDBDirEntry(dirPath));
  };

  IDBDirEntry.prototype.createReader = function () {
    var dirPath = this._path;
    return {
      readEntries: function (successCb, errorCb) {
        var prefix = dirPath ? dirPath + "/" : "";
        _getIDB().then(function (db) {
          var tx = db.transaction(IDB_STORE, "readonly");
          var req = tx.objectStore(IDB_STORE).getAll();
          req.onsuccess = function () {
            var results = [], seen = {}, items = req.result || [];
            for (var i = 0; i < items.length; i++) {
              var p = items[i].path;
              if (prefix && p.indexOf(prefix) !== 0) continue;
              if (!prefix && p.indexOf("/") !== -1) continue;
              var rest = prefix ? p.substring(prefix.length) : p;
              if (rest.indexOf("/") === -1) {
                results.push(new IDBFileEntry(p));
              } else {
                var subDir = rest.split("/")[0];
                var subPath = prefix + subDir;
                if (!seen[subPath]) {
                  seen[subPath] = true;
                  results.push(new IDBDirEntry(subPath));
                }
              }
            }
            successCb(results);
          };
          req.onerror = function () { if (errorCb) errorCb(req.error); };
        });
      },
    };
  };

  IDBDirEntry.prototype.removeRecursively = function (successCb, errorCb) {
    var prefix = this._path ? this._path + "/" : "";
    _getIDB().then(function (db) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      var store = tx.objectStore(IDB_STORE);
      var req = store.getAll();
      req.onsuccess = function () {
        var items = req.result || [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].path.indexOf(prefix) === 0) store.delete(items[i].path);
        }
      };
      tx.oncomplete = function () { if (typeof successCb === "function") successCb(); };
      tx.onerror = function () { if (typeof errorCb === "function") errorCb(tx.error); };
    });
  };
  IDBDirEntry.prototype.remove = IDBDirEntry.prototype.removeRecursively;

  if (!window.webkitStorageInfo) {
    window.webkitStorageInfo = {
      requestQuota: function (_type, size, successCb) {
        if (typeof successCb === "function") successCb(size);
      },
      queryUsageAndQuota: function (_type, successCb) {
        if (typeof successCb === "function") successCb(0, 50 * 1024 * 1024);
      },
    };
  }
  if (!window.PERSISTENT) window.PERSISTENT = 1;
  if (!window.TEMPORARY) window.TEMPORARY = 0;
  if (!window.webkitRequestFileSystem) {
    window.webkitRequestFileSystem = function (_type, _size, successCb, errCb) {
      _getIDB()
        .then(function () {
          successCb({ name: "GliffyIDBFS", root: new IDBDirEntry("") });
        })
        .catch(function (e) { if (errCb) errCb(e); });
    };
  }

  // ── Splash screen fallback ──────────────────────────────────────────
  function forceHideSplash() {
    var s = document.getElementById("splash");
    if (s && s.style.display !== "none") {
      s.style.display = "none";
      var e = document.getElementById("editor");
      if (e) e.focus();
    }
  }
  function scheduleFallback() {
    setTimeout(forceHideSplash, 2500);
    setTimeout(forceHideSplash, 5000);
  }
  if (document.readyState === "complete") scheduleFallback();
  else {
    window.addEventListener("load", scheduleFallback);
    document.addEventListener("DOMContentLoaded", scheduleFallback);
  }
})();
