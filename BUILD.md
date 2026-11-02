# Gliffy Diagrams 桌面应用 — 构建说明

本项目把原 Chrome 商店的 Gliffy Diagrams 前端打包成 Windows 桌面应用。构建所需的一切都在本仓库里，改过的 Pake 内嵌在 [`pake/`](pake/README.md) 目录。

## 环境要求

- **Node.js** >= 20
- **rustup**：首次构建时会自动安装 [`pake/rust-toolchain.toml`](pake/rust-toolchain.toml) 指定的 Rust 版本
- **WebView2 运行时**：Windows 10/11 通常已自带

不需要 pnpm，也不需要单独安装 Tauri CLI 或 Pake CLI。

## 构建

在项目根目录执行：

```powershell
.\build.ps1        # 便携版：release\gliffy-diagrams.exe
.\build.ps1 -Msi   # 另外生成 MSI 安装包，也在 release\ 下
```

首次编译约 10 分钟，之后再编译通常要几分钟。脚本做两件事：

1. 把前端文件复制到 `pake\dist`（构建时生成，不纳入版本管理）
2. 运行 `tauri build --locked`，把前端嵌入 exe

> **注意**：前端是编译进 exe 的，修改 `js/` 等文件后必须重新构建才会生效。

## 项目结构

| 路径 | 说明 |
|---|---|
| `index.html`、`js/polyfill.js` | 外层页面和 Chrome API 兼容层 |
| `editor.html`、`js/editor.js`、`js/offline.js` | Gliffy 编辑器（运行在 iframe 中） |
| `js/app.js`、`js/desktopCommon.js` | 外层页面的动作处理和文件读写 |
| `pake/` | 内嵌的 Pake，改动清单见 [pake/README.md](pake/README.md) |

## 相对原版 Chrome 应用的改动

**文件操作**
- `chrome.fileSystem` 由 `js/polyfill.js` 实现，通过 Tauri 命令调用原生对话框和文件读写
- 原生命令只能读写用户在对话框里选过的文件；保存时先写临时文件再替换，中途失败不会损坏原文件
- 保存失败会提示具体原因，不再卡死界面

**单窗口**
- 只有一个窗口：打开或新建会替换当前文档，有未保存内容时先询问
- 帮助和 EULA 页面在窗口内以覆盖层显示
- 关闭窗口时如有未保存内容会询问；如果页面无响应，2 秒后直接退出

**自动保存**
- 崩溃或被强制结束后，下次启动恢复最新的草稿，顶部显示提示，可以继续或丢弃
- 恢复的草稿保存时会弹出另存为，不会直接覆盖原文件

**右键菜单**
- 关闭了 Pake 注入的右键菜单，它会顶替 Gliffy 自己的菜单
- 选中多个图形或一个组时，图形菜单增加对齐和分布

**其他**
- `index.html`、`editor.html` 使用相对路径
- 启动时不显示注册对话框（`js/offline.js`）
- “不再显示提示”的设置会保留；其余 `chrome.storage` 数据只在本次运行期间有效

## 在 Chrome 中调试前端

```powershell
python -m http.server 8765
```

然后打开 `http://localhost:8765`，按 F12 查看报错。这种方式下没有 Tauri：打开文件用浏览器的文件选择框，保存变成下载。

## 常见问题

**`no method named cast` 或其他 `windows-core` 相关错误**：依赖版本漂移了。不要运行 `cargo update`，用 `git checkout pake/src-tauri/Cargo.lock` 恢复锁文件。

**`the 'cargo.exe' binary ... is not applicable`**：Rust 工具链没装完整。运行 `rustup toolchain uninstall 1.95.0`，再重新构建。

**界面窗口没有最大化**：窗口大小记录在 `%APPDATA%\com.gliffy.diagrams\.window-state.json`，删除后恢复默认。
