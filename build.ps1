# Builds Gliffy Diagrams from this repository.
#   .\build.ps1        portable exe: release\gliffy-diagrams.exe
#   .\build.ps1 -Msi   also builds the MSI installer into release\
# Requires Node.js >= 20 and rustup (it installs the Rust version pinned in pake\rust-toolchain.toml).
param([switch]$Msi)

$ErrorActionPreference = "Stop"
$TauriCli = "@tauri-apps/cli@2.10.0"

$Root = $PSScriptRoot
$Pake = Join-Path $Root "pake"
$Dist = Join-Path $Pake "dist"
$Target = Join-Path $Pake "src-tauri\target\release"
$Release = Join-Path $Root "release"

# Tauri embeds pake\dist into the exe, so it must hold exactly the app's frontend.
if (Test-Path $Dist) { Remove-Item -Recurse -Force $Dist }
New-Item -ItemType Directory -Force $Dist | Out-Null
$Frontend = @(
    "index.html", "editor.html", "static.html",
    "Gliffy_End_User_License_Agreement_Gliffy_Plugins.html", "Gliffy_User_Manual_Gliffy_Online.html",
    "_locales", "css", "data", "images", "js", "thirdparty"
)
foreach ($Item in $Frontend) {
    Copy-Item -Recurse (Join-Path $Root $Item) $Dist
}

$BuildArgs = @("--yes", "--package=$TauriCli", "--", "tauri", "build")
if (-not $Msi) { $BuildArgs += "--no-bundle" }
# Never let cargo move dependencies: Pake only compiles against its locked Tauri version.
$BuildArgs += @("--", "--locked")

Push-Location $Pake
try {
    & npx.cmd @BuildArgs
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

New-Item -ItemType Directory -Force $Release | Out-Null
Copy-Item (Join-Path $Target "gliffy-diagrams.exe") $Release -Force
if ($Msi) {
    Copy-Item (Join-Path $Target "bundle\msi\*.msi") $Release -Force
}
Write-Host "Built: $Release"
