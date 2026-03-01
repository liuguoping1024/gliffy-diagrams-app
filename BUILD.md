# Gliffy Diagrams 桌面应用 — 构建说明

本项目用 [Pake](https://github.com/tw93/Pake)（基于 Tauri）把原 Chrome 商店的 Gliffy Diagrams 扩展打包成 Windows 桌面应用，不依赖 Chrome 或扩展商店。

## 构建思路

1. 将 Gliffy Chrome 扩展的前端文件（HTML/CSS/JS）放入 Pake 的 `src-tauri/../dist` 目录
2. 配置 `pake.json` 为 `url_type: "local"`，入口指向 `index.html`
3. 运行 `tauri build --features cli-build`，Tauri 会将所有前端资源编译进 exe

> **注意**：Tauri 在编译时把前端嵌入 exe，修改 exe 同目录的文件不会生效，必须重新编译。

## 环境要求

- **Node.js** >= 18（推荐 22+）
- **Rust** >= 1.85（首次会自动安装）
- **pnpm**（版本不限，设 `COREPACK_ENABLE_STRICT=0` 可绕过版本检查）
- **Windows**：首次编译约需 10–15 分钟

## 构建步骤

### 1. 安装依赖

```powershell
cd download\Pake-main
$env:COREPACK_ENABLE_STRICT="0"
pnpm install
```

### 2. 准备前端资源

将修改后的 Gliffy 文件复制到 Pake 的 dist 目录：

```powershell
# 在项目根目录执行
Remove-Item -Recurse -Force "download\Pake-main\dist\*"
Copy-Item -Path "download\Gliffy Diagrams 1.0.36\*" -Destination "download\Pake-main\dist" -Recurse -Force
```

### 3. 编译

```powershell
cd download\Pake-main
$env:COREPACK_ENABLE_STRICT="0"
npx --yes @tauri-apps/cli build --config "src-tauri/.pake/tauri.conf.json" --features cli-build
```

产物位置：
- **exe**：`download\Pake-main\src-tauri\target\release\pake.exe`
- **MSI**：`download\Pake-main\src-tauri\target\release\bundle\msi\Gliffy Diagrams_1.0.36_x64_en-US.msi`

### 4. 输出

将 `pake.exe` 复制到 `Gliffy Diagrams App\` 即可作为便携版使用。MSI 可直接分发安装。

## 已对 Gliffy 做的修改

相对于原始 Chrome 扩展（v1.0.36），做了以下改动：

### 路径修正
- `index.html`、`editor.html`：`/css/...`、`/js/...` 改为相对路径 `css/...`、`js/...`，使其在 Tauri 本地协议下正常加载

### Chrome API Polyfill（内联在 index.html 中）
- **`chrome.runtime.getManifest()`**：返回 `{ version: "1.0.36" }`
- **`chrome.i18n.getMessage()`**：返回启动画面文案 "Loading..."
- **`chrome.storage.local.get/set`**：用内存对象模拟，支持 Gliffy 的 getLocalStorage / ready 流程
- **Splash fallback**：2.5s / 5s 后强制隐藏启动画面，防止因联网请求失败导致永远卡在 Loading

### 移除注册对话框
- `js/offline.js`：跳过 `__showRegister()`，直接走 `__showTips()` 路径，启动时不再弹出 "Register Gliffy Diagrams" 表单

### 自定义图标
- 用原始 `gliffy_128.png` 生成 256x256 和 32x32 的 `.ico` 文件，替换默认图标

## 配置文件

关键配置位于 `download\Pake-main\src-tauri\.pake\`：

- **`pake.json`**：窗口配置，`url_type: "local"`，入口 `index.html`
- **`tauri.conf.json`**：产品名 "Gliffy Diagrams"，版本 1.0.36，图标路径

## 在 Chrome 中调试

如需调试前端问题，可用本地 HTTP 服务在 Chrome 中运行：

```powershell
cd "Gliffy Diagrams App"
python -m http.server 8765
```

然后在 Chrome 中打开 `http://localhost:8765`，按 F12 查看 Console 报错。

> 注意：Chrome 调试改动的是本地文件，确认无误后需重新执行「准备前端资源 → 编译」才能生效到 exe 中。
