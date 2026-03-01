/**
 * Chrome extension API polyfill for Gliffy in Pake/desktop.
 * In Pake WebView, chrome may exist but be incomplete — we always ensure i18n, runtime.getManifest, storage.local and splash fallback.
 */
(function () {
  var _storage = {};
  window.chrome = window.chrome || {};
  chrome.runtime = chrome.runtime || {};
  chrome.i18n = chrome.i18n || {};
  chrome.storage = chrome.storage || {};
  chrome.storage.local = chrome.storage.local || {};

  // Always provide getManifest (Pake may have chrome but no getManifest)
  if (typeof chrome.runtime.getManifest !== "function") {
    chrome.runtime.getManifest = function () { return { version: "1.0.32" }; };
  }
  chrome.runtime.lastError = null;

  if (typeof chrome.i18n.getMessage !== "function") {
    chrome.i18n.getMessage = function (name) {
      if (name === "DESKTOP_SPLASH_LOADING") return "Loading...";
      return name || "";
    };
  }

  if (typeof chrome.storage.local.get !== "function") {
    chrome.storage.local.get = function (keys, callback) {
      if (!callback) return;
      var out = {};
      var k = Array.isArray(keys) ? keys : (keys == null ? Object.keys(_storage) : [keys]);
      for (var i = 0; i < k.length; i++) {
        if (_storage.hasOwnProperty(k[i])) out[k[i]] = _storage[k[i]];
      }
      setTimeout(function () { callback(out); }, 0);
    };
  }
  if (typeof chrome.storage.local.set !== "function") {
    chrome.storage.local.set = function (obj, callback) {
      for (var key in obj) if (obj.hasOwnProperty(key)) _storage[key] = obj[key];
      if (typeof callback === "function") setTimeout(callback, 0);
    };
  }

  function forceHideSplash() {
    var splash = document.getElementById("splash");
    if (splash && splash.style.display !== "none") {
      splash.style.display = "none";
      var ed = document.getElementById("editor");
      if (ed) ed.focus();
    }
  }

  function scheduleFallback() {
    setTimeout(forceHideSplash, 2500);
    setTimeout(forceHideSplash, 5000);
  }

  if (document.readyState === "complete") {
    scheduleFallback();
  } else {
    window.addEventListener("load", scheduleFallback);
    document.addEventListener("DOMContentLoaded", scheduleFallback);
  }
})();
