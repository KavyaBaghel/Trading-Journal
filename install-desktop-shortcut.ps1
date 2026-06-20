$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $appRoot 'Journall App.vbs'
$fallbackLauncher = Join-Path $appRoot 'Journall App.bat'
$icon = Join-Path $appRoot 'assets\app-icon.ico'
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = [Environment]::GetFolderPath('Programs')
$startMenu = Join-Path $programs 'Journall'
$oldStartMenu = Join-Path $programs 'Krishna Trading Journal'
$shortcutPath = Join-Path $desktop 'Journall.lnk'
$startShortcutPath = Join-Path $startMenu 'Journall.lnk'
$oldShortcutPath = Join-Path $desktop 'Krishna Trading Journal App.lnk'
$oldStartShortcutPath = Join-Path $oldStartMenu 'Krishna Trading Journal App.lnk'

if (-not (Test-Path -LiteralPath $launcher)) {
  $launcher = $fallbackLauncher
}

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Launcher not found: $launcher"
}

New-Item -ItemType Directory -Force -Path $startMenu | Out-Null
foreach ($oldPath in @($oldShortcutPath, $oldStartShortcutPath)) {
  if (Test-Path -LiteralPath $oldPath) {
    Remove-Item -LiteralPath $oldPath -Force
  }
}

$shell = New-Object -ComObject WScript.Shell
foreach ($path in @($shortcutPath, $startShortcutPath)) {
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $launcher
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.WindowStyle = 7
  $shortcut.Description = "Journall trading journal app"
  if (Test-Path -LiteralPath $icon) {
    $shortcut.IconLocation = $icon
  }
  $shortcut.Save()
}

Write-Host "Shortcut created: $shortcutPath"
Write-Host "Start Menu shortcut created: $startShortcutPath"
