param(
  [Parameter(Mandatory=$true)]
  [string]$Root,

  [string]$ListenHost = '127.0.0.1',

  [int]$Port = 8787
)

$ErrorActionPreference = 'Stop'

$rootPath = [System.IO.Path]::GetFullPath($Root)
$ipAddress = if ($ListenHost -eq '0.0.0.0' -or $ListenHost -eq '*') {
  [System.Net.IPAddress]::Any
} elseif ($ListenHost -eq '127.0.0.1' -or $ListenHost -eq 'localhost') {
  [System.Net.IPAddress]::Loopback
} else {
  [System.Net.IPAddress]::Parse($ListenHost)
}
$listener = [System.Net.Sockets.TcpListener]::new($ipAddress, $Port)
$listener.Start()

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8'; break }
    '.css' { 'text/css; charset=utf-8'; break }
    '.js' { 'text/javascript; charset=utf-8'; break }
    '.json' { 'application/json; charset=utf-8'; break }
    '.webmanifest' { 'application/manifest+json; charset=utf-8'; break }
    '.png' { 'image/png'; break }
    '.jpg' { 'image/jpeg'; break }
    '.jpeg' { 'image/jpeg'; break }
    default { 'application/octet-stream' }
  }
}

function Send-Response($Stream, [int]$Status, [string]$StatusText, [byte[]]$Body, [string]$ContentType) {
  $headers = @(
    "HTTP/1.1 $Status $StatusText",
    "Content-Type: $ContentType",
    "Content-Length: $($Body.Length)",
    "Cache-Control: no-store",
    "Connection: close",
    '',
    ''
  ) -join "`r`n"
  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

function Invoke-OllamaProxy($Stream, [string]$Method, [string]$RawPath, [byte[]]$BodyBytes) {
  if ($Method -eq 'OPTIONS') {
    Send-Response $Stream 204 'No Content' ([byte[]]::new(0)) 'text/plain; charset=utf-8'
    return
  }

  if ($Method -ne 'GET' -and $Method -ne 'POST') {
    $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
    Send-Response $Stream 405 'Method Not Allowed' $body 'text/plain; charset=utf-8'
    return
  }

  $targetPath = $RawPath -replace '^/ollama', ''
  if ([string]::IsNullOrWhiteSpace($targetPath)) { $targetPath = '/' }
  $targetUrl = "http://127.0.0.1:11434$targetPath"

  try {
    $request = [System.Net.HttpWebRequest]::Create($targetUrl)
    $request.Method = $Method
    $request.Timeout = 120000
    $request.ReadWriteTimeout = 120000
    $request.ContentType = 'application/json'

    if ($Method -eq 'POST') {
      $request.ContentLength = $BodyBytes.Length
      $requestStream = $request.GetRequestStream()
      $requestStream.Write($BodyBytes, 0, $BodyBytes.Length)
      $requestStream.Close()
    }

    $response = $request.GetResponse()
    try {
      $responseStream = $response.GetResponseStream()
      $memory = [System.IO.MemoryStream]::new()
      $responseStream.CopyTo($memory)
      Send-Response $Stream ([int]$response.StatusCode) $response.StatusDescription $memory.ToArray() 'application/json; charset=utf-8'
    } finally {
      $response.Close()
    }
  } catch [System.Net.WebException] {
    $err = $_.Exception
    if ($err.Response) {
      $statusCode = [int]$err.Response.StatusCode
      $statusText = $err.Response.StatusDescription
      $responseStream = $err.Response.GetResponseStream()
      $memory = [System.IO.MemoryStream]::new()
      if ($responseStream) { $responseStream.CopyTo($memory) }
      Send-Response $Stream $statusCode $statusText $memory.ToArray() 'application/json; charset=utf-8'
      $err.Response.Close()
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"Ollama proxy failed: $($err.Message)`"}")
      Send-Response $Stream 502 'Bad Gateway' $body 'application/json; charset=utf-8'
    }
  } catch {
    $body = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"Ollama proxy failed: $($_.Exception.Message)`"}")
    Send-Response $Stream 502 'Bad Gateway' $body 'application/json; charset=utf-8'
  }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 2000
    $stream.WriteTimeout = 5000
    $buffer = New-Object byte[] 4096
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) { continue }

    $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
    $headerEnd = $request.IndexOf("`r`n`r`n")
    $headerBytesLength = if ($headerEnd -ge 0) { $headerEnd + 4 } else { $read }
    $requestLine = ($request -split "`r?`n")[0]
    $parts = $requestLine -split ' '
    $method = $parts[0]
    $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { '/' }

    $contentLength = 0
    foreach ($line in ($request -split "`r?`n")) {
      if ($line -match '^Content-Length:\s*(\d+)') {
        $contentLength = [int]$matches[1]
        break
      }
    }

    $bodyBytes = [byte[]]::new($contentLength)
    $alreadyReadBodyLength = [Math]::Max(0, $read - $headerBytesLength)
    if ($alreadyReadBodyLength -gt 0 -and $contentLength -gt 0) {
      [Array]::Copy($buffer, $headerBytesLength, $bodyBytes, 0, [Math]::Min($alreadyReadBodyLength, $contentLength))
    }
    $bodyOffset = [Math]::Min($alreadyReadBodyLength, $contentLength)
    while ($bodyOffset -lt $contentLength) {
      $chunkRead = $stream.Read($bodyBytes, $bodyOffset, $contentLength - $bodyOffset)
      if ($chunkRead -le 0) { break }
      $bodyOffset += $chunkRead
    }

    if ($rawPath -like '/ollama/*') {
      Invoke-OllamaProxy $stream $method $rawPath $bodyBytes
      continue
    }

    if ($method -ne 'GET' -and $method -ne 'HEAD') {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
      Send-Response $stream 405 'Method Not Allowed' $body 'text/plain; charset=utf-8'
      continue
    }

    $pathOnly = ($rawPath -split '\?')[0]
    $relative = [System.Uri]::UnescapeDataString($pathOnly.TrimStart('/')).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }

    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relative))
    if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
      Send-Response $stream 403 'Forbidden' $body 'text/plain; charset=utf-8'
      continue
    }

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'
      continue
    }

    $bodyBytes = if ($method -eq 'HEAD') { [byte[]]::new(0) } else { [System.IO.File]::ReadAllBytes($fullPath) }
    Send-Response $stream 200 'OK' $bodyBytes (Get-ContentType $fullPath)
  } catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Server error')
      Send-Response $stream 500 'Internal Server Error' $body 'text/plain; charset=utf-8'
    } catch {}
  } finally {
    $client.Close()
  }
}
