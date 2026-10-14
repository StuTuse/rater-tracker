$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $projectRoot 'node_modules\electron\dist'
$sourceElectron = Join-Path $sourceDirectory 'electron.exe'
$iconPath = Join-Path $projectRoot 'assets\app.ico'
if (-not (Test-Path -LiteralPath $sourceElectron -PathType Leaf)) {
  throw '项目 Electron 运行时不存在，请先在项目目录执行 npm ci。'
}
if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
  throw '项目图标不存在。'
}
# Chromium can abort before loading application code when launched from a
# managed workspace. Copy bytes into a normal per-user directory, inheriting
# that directory's permissions rather than changing workspace security rules.
$runtimeVersion = (Get-Content -LiteralPath (Join-Path $sourceDirectory 'version') -Raw).Trim()
if ($runtimeVersion -notmatch '^\d+\.\d+\.\d+([-.][A-Za-z0-9.-]+)?$') {
  throw 'Electron 运行时版本无效。'
}
$runtimeHash = (Get-FileHash -LiteralPath $sourceElectron -Algorithm SHA256).Hash.Substring(0, 12)
$runtimeDirectory = Join-Path $env:LOCALAPPDATA "RaterTrackerDevRuntime\electron-$runtimeVersion-$runtimeHash"
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$runtimeFileCount = 0
foreach ($sourceFile in (Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse)) {
  $relativePath = $sourceFile.FullName.Substring($sourceDirectory.Length + 1)
  $destination = Join-Path $runtimeDirectory $relativePath
  $sourceHash = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash
  $matches = (Test-Path -LiteralPath $destination -PathType Leaf) -and
    ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $sourceHash)
  if (-not $matches) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $sourceFile.FullName -Destination $destination -Force
  }
  if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $sourceHash) {
    throw "运行时文件校验失败：$relativePath"
  }
  $runtimeFileCount++
}
$electronPath = Join-Path $runtimeDirectory 'electron.exe'
$desktopDirectory = [Environment]::GetFolderPath('DesktopDirectory')
$shortcutPath = Join-Path $desktopDirectory 'Rater & Tracker（开发验收）.lnk'
$shellObject = New-Object -ComObject WScript.Shell
$shortcut = $shellObject.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronPath
$shortcut.Arguments = '"' + $projectRoot + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = $iconPath + ',0'
$shortcut.Description = '打开项目最新源码；保存改动后退出并重新打开即可验收。'
$shortcut.Save()
$verified = $shellObject.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $electronPath -or $verified.Arguments -ne ('"' + $projectRoot + '"')) {
  throw '快捷方式目标检查失败。'
}
[pscustomobject]@{
  Shortcut = $shortcutPath
  Target = $verified.TargetPath
  Arguments = $verified.Arguments
  WorkingDirectory = $verified.WorkingDirectory
  RuntimeVersion = $runtimeVersion
  VerifiedRuntimeFiles = $runtimeFileCount
}
