# 将 Gliffy Diagrams 打包为本地桌面应用

本项目用 [Pake](https://github.com/tw93/Pake) 把原 Chrome 商店的 Gliffy Diagrams 应用打包成可在 Windows/macOS/Linux 运行的桌面应用，不依赖 Chrome 或扩展商店。

## 思路

- **Gliffy 目录**（`download/Gliffy Diagrams 1.0.32/`）：来自原 Chrome 扩展，包含前端页面与资源；已将其中的绝对路径（如 `/css/...`）改为相对路径，以便在 Pake 的本地 file 协议下正常加载。
- **Pake**（`download/Pake-main/`）：开源「网页/本地 HTML 打桌面包」工具，基于 Tauri，体积小、跨平台。使用其 **本地 HTML + `--use-local-file`** 模式，把整个 Gliffy 目录打进应用。

## 环境要求

- **Node.js** >= 18（推荐 22+）
- **Rust**：首次打包时若未安装，Pake 会提示安装
- **Windows**：若未装过 Rust，首次打包可能需 10–15 分钟

## 一键打包（推荐）

在项目根目录执行：

```powershell
.\build-gliffy-app.ps1
```

脚本会使用 `download/Gliffy Diagrams 1.0.32/index.html` 作为入口，并自动加上 `--use-local-file`，把整份 Gliffy 资源打进应用。完成后，安装包或可执行文件会出现在当前目录。

## 手动打包

若未全局安装 `pake-cli`，可先安装：

```bash
npm install -g pake-cli
# 或
pnpm add -g pake-cli
```

在项目根目录执行（路径请按实际调整）：

```bash
# Windows 示例（PowerShell）
pake "D:\github\Gliffy-Diagrams\download\Gliffy Diagrams 1.0.32\index.html" --name "Gliffy Diagrams" --use-local-file

# 若在项目根且使用相对路径（需先 cd 到项目根）
pake ".\download\Gliffy Diagrams 1.0.32\index.html" --name "Gliffy Diagrams" --use-local-file
```

**注意**：`--use-local-file` 必须加上，否则只会复制 `index.html`，`css`/`js`/`editor.html` 等会加载失败。

## 可选参数

- `--width 1400 --height 900`：窗口大小
- `--icon path/to/icon.ico`：应用图标（Windows 需 .ico）
- 更多见：`pake --help` 或 [Pake CLI 文档](https://github.com/tw93/Pake/blob/main/docs/cli-usage_CN.md)

## 在 Chrome 中调试

桌面应用里看不到 “Loading” 或有很多报错时，可先在 Chrome 里用本地 HTTP 服务跑同一套前端，方便看 Console 报错、修 polyfill 或逻辑。

在项目根目录执行：

```powershell
.\debug-in-chrome.ps1
```

脚本会启动一个本地 HTTP 服务（默认端口 8765），并提示：

- 在 Chrome 中打开：**http://localhost:8765**
- 按 **F12** 打开开发者工具，在 **Console** 里查看报错

需要本机已安装 **Python**（用 `python -m http.server`）或 **Node**（用 `npx serve`）。调试时改动的文件在 `Gliffy Diagrams App\` 或 `download\Gliffy Diagrams 1.0.32\` 中，修好后重新用 Pake 打包或直接再运行 `pake.exe` 即可。

## 已对 Gliffy 做的修改

为在 Pake 本地 file 协议下正常加载资源，已修改：

- `download/Gliffy Diagrams 1.0.32/index.html`：`/css/...`、`/js/...` 改为相对路径 `css/...`、`js/...`
- `download/Gliffy Diagrams 1.0.32/editor.html`：同上

其余文件未改，仍为原 Chrome 扩展内容。

## 输出说明

- **Windows**：生成 `.msi` 安装包（及可选原始 exe）
- **macOS**：`.dmg` 或 `.app`
- **Linux**：`.deb` / `.AppImage` 等（视 Pake 配置）

运行生成的安装包或可执行文件即可在本地使用 Gliffy Diagrams，无需 Chrome 或网络（离线可用）。
