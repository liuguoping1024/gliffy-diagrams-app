# Embedded Pake

This directory is a modified copy of [Pake](https://github.com/tw93/Pake) **V3.17.6**
(commit `9f4ec6f`), reduced to what a Windows build of Gliffy Diagrams needs.
Pake is licensed under GPL-3.0-or-later: see [LICENSE](LICENSE), [LICENSE-EXCEPTION](LICENSE-EXCEPTION)
and [TRADEMARK.md](TRADEMARK.md).

Build from the repository root with `.\build.ps1`. See [BUILD.md](../BUILD.md).

## Changes from upstream

Most of the Gliffy code is in one new file, `src-tauri/src/app/gliffy.rs`. Everything else is a small hook:

| File (under `src-tauri/`) | Change |
|---|---|
| `src/app/gliffy.rs` | **New.** File dialogs, file read/write limited to paths picked in a dialog, atomic save, window close handshake, unit tests |
| `src/app/mod.rs` | Declares the `gliffy` module |
| `src/lib.rs` | Imports, the dialog plugin, `GliffyState`, the six commands, and the `intercept_close` call in `CloseRequested` |
| `build.rs` | Adds the six commands to the app manifest (commands missing here are rejected at runtime) |
| `capabilities/default.json` | Grants the six `allow-*` permissions |
| `Cargo.toml` | Package renamed to `gliffy-diagrams` (Pake's trademark policy), version, and `tauri-plugin-dialog = "=2.6.0"` |
| `Cargo.lock` | Upstream's lockfile plus the dialog plugin and its dependencies |
| `src/inject/event.js` | Turns off Pake's right-click menu, which replaced Gliffy's own |
| `pake.json` | Loads local `index.html`, maximized, no tray, no hide-on-close, Pake web shortcuts off |
| `tauri.conf.json`, `tauri.windows.conf.json` | App name, identifier, version, icons |

Removed: sample-app icons, macOS and Linux configuration, and Pake's CLI, docs and tests.

## Upgrading Pake

1. Replace `src-tauri` with the new upstream version and re-apply the table above.
2. Set `tauri-plugin-dialog` to the release built for the Tauri version in the new `Cargo.lock`, and keep the `=` pin.
3. Update the CLI version in `build.ps1` and the toolchain in `rust-toolchain.toml` to match upstream.

Never run a plain `cargo update`. It moves Tauri away from the version Pake is written for, which
breaks the build with errors such as `no method named cast` from two copies of `windows-core`.
