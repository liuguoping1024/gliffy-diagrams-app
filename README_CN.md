# 项目来由

我以前使用过 Gliffy Diagrams，在 Chrome 浏览器的应用中，我甚至可以通过桌面快捷方式直接打开这个本地的 Chrome 应用。

[Gliffy Diagrams（博客参考）](https://blog.csdn.net/u011035397/article/details/121316115)

但是现在 Chrome 浏览器不再支持此功能了，Gliffy Diagrams 这家公司已被收购，不会再有新的更新了。

于是我决定利用原来的 Gliffy Diagrams 离线包，使用 [Cursor](https://cursor.com) 作为 AI 辅助开发工具，重新实现这个桌面应用。

# Gliffy Diagrams App

[English](README.md)

基于 [Pake](https://github.com/tw93/Pake)（Tauri）打包的 Gliffy Diagrams 独立桌面应用，无需 Chrome 或浏览器扩展。

## 使用方式

**Windows**：下载后双击 `gliffy-diagrams.exe` 即可运行，所有资源已打包在可执行文件内，无需安装。

也可从 [Releases](https://github.com/liuguoping1024/gliffy-diagrams-app/releases) 下载 MSI 安装包进行安装。

从源码构建请看 [BUILD.md](BUILD.md)。

## 功能特点

- 离线绘图编辑器 — 无需联网即可使用
- 轻量级原生桌面应用（约 12 MB）
- 原生的打开、保存、导出对话框，崩溃后可恢复草稿
- 基于原版 Gliffy Diagrams Chrome 扩展（v1.0.36）

## 特别鸣谢

- [Pake](https://github.com/tw93/Pake) — 基于 Tauri 的轻量级网页打包桌面应用工具，本项目的核心依赖。修改后的 Pake V3.17.6 内嵌在 [`pake/`](pake/README.md) 目录，遵循 Pake 的 GPL-3.0 许可证。

## 许可证

本项目免费、非商业，但各部分的许可证不同：

- **`pake/`**：修改过的 Pake，遵循 GPL-3.0-or-later。详见 [pake/LICENSE](pake/LICENSE)，改动清单见 [pake/README.md](pake/README.md)。
- **Gliffy Diagrams 编辑器**（`editor.html`、`js/` 的大部分、`css/`、`data/`、`images/`、`thirdparty/`）：Gliffy 所有的专有软件，适用其 [EULA](Gliffy_End_User_License_Agreement_Gliffy_Plugins.html)。这部分**不是**开源软件，本仓库不授予任何相关权利。
- **`thirdparty/` 中的第三方库**：遵循各自的许可证。

本项目与 Gliffy、Pake 均无关联，也未获得其认可。

## 版本

1.0.37
