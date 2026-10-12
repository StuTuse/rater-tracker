$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$installerFile = Join-Path $projectRoot 'release\Rater-Tracker-0.1.0-alpha.1-Setup.exe'
$installDirectory = [IO.Path]::GetFullPath((Join-Path $projectRoot 'runtime-data\install-check'))
$testDataDirectory = Join-Path $projectRoot 'runtime-data\desktop-smoke'
$reportDirectory = Join-Path $projectRoot 'output\install'
if (-not $installDirectory.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected installation target' }
$existing = Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue | Get-ItemProperty | Where-Object DisplayName -eq 'Rater & Tracker'
if ($existing) { throw 'An existing user installation was found; preserve it and skip isolated installer acceptance.' }
New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
$installer = Start-Process -FilePath $installerFile -ArgumentList ('/S /D=' + $installDirectory) -WindowStyle Hidden -PassThru
if (-not $installer.WaitForExit(60000) -or $installer.ExitCode -ne 0) { throw 'Installer failed or timed out' }
$applicationFile = Join-Path $installDirectory 'Rater & Tracker.exe'
if (-not (Test-Path -LiteralPath $applicationFile)) { throw 'Installed executable missing' }
$shortcutFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Rater & Tracker.lnk'
if (-not (Test-Path -LiteralPath $shortcutFile)) { throw 'Desktop shortcut missing' }
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutFile)
if ($shortcut.TargetPath -ne $applicationFile) { throw 'Desktop shortcut target does not match isolated installation' }
$previousTestData = $env:RATER_TEST_DATA
$previousOutput = $env:RATER_SMOKE_OUTPUT
try {
  $env:RATER_TEST_DATA = $testDataDirectory
  $env:RATER_SMOKE_OUTPUT = Join-Path $reportDirectory 'before'
  & node (Join-Path $projectRoot 'scripts\desktop-smoke.mjs') $applicationFile
  if ($LASTEXITCODE -ne 0) { throw 'Installed application smoke failed' }
  $before = Get-Content -Raw (Join-Path $projectRoot 'output\desktop\report.json') | ConvertFrom-Json
  $first = Start-Process -FilePath $applicationFile -ArgumentList '--acceptance-hold' -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2
  $second = Start-Process -FilePath $applicationFile -ArgumentList '--acceptance-hold' -WindowStyle Hidden -PassThru
  if (-not $second.WaitForExit(10000) -or $first.HasExited -or $second.ExitCode -ne 0) { throw 'Single instance check failed' }
  $first.CloseMainWindow() | Out-Null
  if (-not $first.WaitForExit(10000)) { $first.Kill(); $first.WaitForExit() }
  # Reinstall the same build to exercise the actual NSIS update path without rewriting user data.
  $reinstall = Start-Process -FilePath $installerFile -ArgumentList ('/S /D=' + $installDirectory) -WindowStyle Hidden -PassThru
  if (-not $reinstall.WaitForExit(60000) -or $reinstall.ExitCode -ne 0) { throw 'Reinstall failed' }
  & node (Join-Path $projectRoot 'scripts\desktop-smoke.mjs') $applicationFile
  if ($LASTEXITCODE -ne 0) { throw 'Application after reinstall failed' }
  $after = Get-Content -Raw (Join-Path $projectRoot 'output\desktop\report.json') | ConvertFrom-Json
  if ($before.persisted -ne $after.persisted -or $before.revision -ne $after.revision -or $before.userData -ne $after.userData) { throw 'Data changed after reinstall' }
  $result = @{ installed = $true; desktopShortcut = $true; shortcutTarget = $shortcut.TargetPath; singleInstance = $true; reinstalledDataPreserved = $true; xpUnits = $after.persisted; revision = $after.revision; userData = $after.userData; version = $after.version; crossVersionUpgrade = 'not tested'; installationDirectory = $installDirectory }
  $result | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $reportDirectory 'report.json')
  $result | ConvertTo-Json
} finally {
  if ($first -and -not $first.HasExited) { $first.CloseMainWindow() | Out-Null; if (-not $first.WaitForExit(5000)) { $first.Kill() } }
  $env:RATER_TEST_DATA = $previousTestData
  $env:RATER_SMOKE_OUTPUT = $previousOutput
  $uninstallerFile = Join-Path $installDirectory 'Uninstall Rater & Tracker.exe'
  if (Test-Path -LiteralPath $uninstallerFile) {
    $uninstaller = Start-Process -FilePath $uninstallerFile -ArgumentList '/S' -WindowStyle Hidden -PassThru
    if (-not $uninstaller.WaitForExit(60000)) { throw 'Uninstaller timed out; preserve the isolated target for inspection' }
  }
}
