$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $appRoot 'Krishna Trading Journal App.vbs'
$fallbackLauncher = Join-Path $appRoot 'Krishna Trading Journal App.bat'
$icon = Join-Path $appRoot 'assets\app-icon.ico'
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Krishna Trading Journal'
$shortcutPath = Join-Path $desktop 'Krishna Trading Journal App.lnk'
$startShortcutPath = Join-Path $startMenu 'Krishna Trading Journal App.lnk'

if (-not (Test-Path -LiteralPath $launcher)) {
  $launcher = $fallbackLauncher
}

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Launcher not found: $launcher"
}

New-Item -ItemType Directory -Force -Path $startMenu | Out-Null

$shell = New-Object -ComObject WScript.Shell
foreach ($path in @($shortcutPath, $startShortcutPath)) {
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $launcher
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.WindowStyle = 7
  $shortcut.Description = "Krishna's Trading Journal App"
  if (Test-Path -LiteralPath $icon) {
    $shortcut.IconLocation = $icon
  }
  $shortcut.Save()
}

Write-Host "Shortcut created: $shortcutPath"
Write-Host "Start Menu shortcut created: $startShortcutPath"
