# Background

I used to use Gliffy Diagrams as a Chrome app — I could even launch it directly from a desktop shortcut.

[Gliffy Diagrams (blog reference)](https://blog.csdn.net/u011035397/article/details/121316115)

However, Chrome no longer supports this. Gliffy Diagrams was acquired, and there will be no further updates.

So I decided to rebuild the app from the original Gliffy Diagrams offline package, using [Cursor](https://cursor.com) as my AI-assisted development tool.

# Gliffy Diagrams App

[中文说明](README_CN.md)

A standalone desktop application for Gliffy Diagrams, built with [Pake](https://github.com/tw93/Pake) (Tauri). No Chrome or browser extension required.

## Usage

**Windows**: Download and double-click `gliffy-diagrams.exe` to run. All resources are bundled inside the executable — no installation needed.

Alternatively, install via the MSI installer from [Releases](https://github.com/liuguoping1024/gliffy-diagrams-app/releases).

To build from source, see [BUILD.md](BUILD.md).

## Features

- Offline diagram editor — works without internet
- Lightweight (~12 MB) native desktop app
- Native open, save and export dialogs, with draft recovery after a crash
- Based on the original Gliffy Diagrams Chrome extension (v1.0.36)

## Acknowledgements

- [Pake](https://github.com/tw93/Pake) — A lightweight tool for turning any webpage into a desktop app, powered by Tauri. This project would not exist without it. A modified copy of Pake V3.17.6 lives in [`pake/`](pake/README.md) under Pake's GPL-3.0 license.

## License

This project is free and non-commercial, but its parts are licensed differently:

- **`pake/`**: a modified copy of Pake, under GPL-3.0-or-later. See [pake/LICENSE](pake/LICENSE) and [pake/README.md](pake/README.md) for the changes.
- **Gliffy Diagrams editor** (`editor.html`, most of `js/`, `css/`, `data/`, `images/`, `thirdparty/`): proprietary software owned by Gliffy, under its own [EULA](Gliffy_End_User_License_Agreement_Gliffy_Plugins.html). It is **not** open source, and this repository grants no rights to it.
- **Third-party libraries** in `thirdparty/`: under their own licenses.

This project is not affiliated with or endorsed by Gliffy or Pake.

## Version

1.0.37
