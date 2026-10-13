$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
$iconPath = Join-Path $projectRoot 'assets\app.ico'
if (-not (Test-Path -LiteralPath $electronPath -PathType Leaf)) {
  throw '项目 Electron 运行时不存在，请先在项目目录执行 npm ci。'
}
if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
  throw '项目图标不存在。'
}
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
}
