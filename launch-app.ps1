param(
  [string]$Tab = ''
)

$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $appRoot 'index.html'
$serverScript = Join-Path $appRoot 'local-server.ps1'
$ragScript = Join-Path $appRoot 'rag_server.py'
$profilePath = Join-Path $appRoot '.app-profile'
$logPath = Join-Path $appRoot 'app-launch.log'
$port = 8787
$ragPort = 8790

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

$edgeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)

$edge = $edgeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $edge) {
  throw 'Microsoft Edge was not found. Install Edge or open index.html manually in a browser.'
}

function Test-AppServer([int]$Port) {
  $client = $null
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect('localhost', $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(700)) { return $false }
    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) { $client.Close() }
  }
}

function Get-PythonExe {
  $localAppData = $env:LOCALAPPDATA
  $progFiles = $env:ProgramFiles
  $candidates = @(
    "$localAppData\Programs\Python\Python313\python.exe",
    "$localAppData\Programs\Python\Python312\python.exe",
    "$localAppData\Programs\Python\Python311\python.exe",
    "$localAppData\Programs\Python\Python310\python.exe",
    "$progFiles\Python313\python.exe",
    "$progFiles\Python312\python.exe",
    "$progFiles\Python311\python.exe",
    "$progFiles\Python310\python.exe",
    'py.exe',
    'python.exe'
  )
  foreach ($candidate in $candidates) {
    try {
      if ($candidate -like '*\*') {
        if (Test-Path -LiteralPath $candidate) {
          $logFile = [System.IO.Path]::GetTempFileName()
          $p = Start-Process -FilePath $candidate -ArgumentList '-c', '"import MetaTrader5; print(1)"' -NoNewWindow -PassThru -Wait -RedirectStandardOutput $logFile -ErrorAction SilentlyContinue
          $out = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { '' }
          Remove-Item $logFile -ErrorAction SilentlyContinue
          if ($p.ExitCode -eq 0 -and $out.Trim() -eq '1') {
            return $candidate
          }
        }
      }
    } catch {}
  }
  foreach ($candidate in $candidates) {
    try {
      if ($candidate -like '*\*') {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
      } else {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source -notlike '*hermes*') { return $cmd.Source }
      }
    } catch {}
  }
  return 'python.exe'
}
    } catch {}
  }
  return $null
}

function Start-RagServer {
  if (-not (Test-Path -LiteralPath $ragScript)) { return }
  if (Test-AppServer $ragPort) { return }

  $python = Get-PythonExe
  if (-not $python) {
    Write-AppLog 'Python was not found, so RAG server was not started.'
    return
  }

  Write-AppLog 'Starting ChromaDB/Ollama RAG server.'
  Start-Process -FilePath $python -WindowStyle Hidden -WorkingDirectory $appRoot -ArgumentList @($ragScript)
}

Start-RagServer

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
  for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-AppServer $port) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    Write-AppLog 'Local server did not become ready.'
    Write-AppLog 'Falling back to direct file launch.'
    $fileUrl = [System.Uri]::new($indexPath).AbsoluteUri
    if ($Tab) {
      $safeTab = [uri]::EscapeDataString($Tab)
      $fileUrl = "$fileUrl#$safeTab"
    }
    Start-Process $fileUrl
    return
  }
}

$appVersion = [System.IO.File]::GetLastWriteTimeUtc($indexPath).Ticks
$appUrl = "http://localhost:$port/index.html?v=$appVersion"
if ($Tab) {
  $safeTab = [uri]::EscapeDataString($Tab)
  $appUrl = "$appUrl#$safeTab"
}
$args = @(
  "--app=$appUrl",
  "--user-data-dir=$profilePath",
  '--class=Journall',
  '--no-first-run',
  '--disable-features=Translate',
  '--disable-background-mode'
)

try {
  Write-AppLog "Opening app window: $appUrl"
  Start-Process -FilePath $edge -ArgumentList $args
} catch {
  Write-AppLog "App-mode launch failed: $($_.Exception.Message)"
  Start-Process $appUrl
}
