$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $appRoot 'Krishna Journal Chrome.vbs'
$fallbackLauncher = Join-Path $appRoot 'Krishna Journal Chrome.bat'
$icon = Join-Path $appRoot 'assets\app-icon.ico'
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Krishna Trading Journal'
$shortcutPath = Join-Path $desktop 'Krishna Journal Chrome.lnk'
$startShortcutPath = Join-Path $startMenu 'Krishna Journal Chrome.lnk'

if (-not (Test-Path -LiteralPath $launcher)) {
  $launcher = $fallbackLauncher
}

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Chrome launcher not found: $launcher"
}

New-Item -ItemType Directory -Force -Path $startMenu | Out-Null

$shell = New-Object -ComObject WScript.Shell
foreach ($path in @($shortcutPath, $startShortcutPath)) {
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $launcher
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.WindowStyle = 7
  $shortcut.Description = "Krishna's Trading Journal App for Chrome"
  if (Test-Path -LiteralPath $icon) {
    $shortcut.IconLocation = $icon
  }
  $shortcut.Save()
}

Write-Host "Chrome shortcut created: $shortcutPath"
Write-Host "Chrome Start Menu shortcut created: $startShortcutPath"
