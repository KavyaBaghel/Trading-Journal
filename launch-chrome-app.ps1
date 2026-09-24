$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $appRoot 'index.html'
$serverScript = Join-Path $appRoot 'local-server.ps1'
$profilePath = Join-Path $appRoot '.chrome-app-profile'
$logPath = Join-Path $appRoot 'chrome-app-launch.log'
$port = 8787

function Write-AppLog([string]$Message) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $logPath -Value "[$stamp] $Message"
}

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "App file not found: $indexPath"
}

if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "Local server not found: $serverScript"
}

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $chrome) {
  throw 'Google Chrome was not found. Install Chrome, then run this launcher again.'
}

function Test-AppServer([int]$Port) {
  $client = $null
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(700)) { return $false }
    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) { $client.Close() }
  }
}

try {
  if (-not (Test-AppServer $port)) { throw 'Server is not running.' }
} catch {
  Write-AppLog 'Starting local server.'
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $serverScript,
    '-Root', $appRoot,
    '-Port', "$port"
  )

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-AppServer $port) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    Write-AppLog 'Local server did not become ready.'
    throw 'The local app server did not start.'
  }
}

$appVersion = [System.IO.File]::GetLastWriteTimeUtc($indexPath).Ticks
$appUrl = "http://127.0.0.1:$port/index.html?v=$appVersion"
$args = @(
  "--app=$appUrl",
  "--user-data-dir=$profilePath",
  '--no-first-run',
  '--disable-background-mode'
)

Write-AppLog "Opening Chrome app window: $appUrl"
Start-Process -FilePath $chrome -ArgumentList $args
