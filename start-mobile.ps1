$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $appRoot 'local-server.ps1'
$port = 8787

function Get-LanAddress {
  $addresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object {
      $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
      -not $_.IPAddressToString.StartsWith('127.')
    }
  return ($addresses | Select-Object -First 1).IPAddressToString
}

$lanIp = Get-LanAddress
if (-not $lanIp) {
  throw 'Could not find a Wi-Fi/LAN IP address. Connect this PC to Wi-Fi and try again.'
}

$url = "http://$lanIp`:$port/index.html"

Write-Host ''
Write-Host "Krishna's Journal mobile app is starting..." -ForegroundColor Cyan
Write-Host ''
Write-Host "Open this on your phone while connected to the same Wi-Fi:" -ForegroundColor Yellow
Write-Host $url -ForegroundColor Green
Write-Host ''
Write-Host 'Keep this window open while using the mobile app.'
Write-Host 'If Windows Firewall asks, allow private network access.'
Write-Host ''

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $serverScript -Root $appRoot -Host '0.0.0.0' -Port $port
