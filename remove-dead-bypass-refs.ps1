$path = "C:\Users\cnjac\Trading-Journal\index.html"
$lines = Get-Content -Path $path -Encoding UTF8

$siteA = @{ Start = 11466; End = 11466; Expected = @(
  "  localStorage.removeItem('journall_auth_bypassed');"
) }

$siteB = @{ Start = 12047; End = 12047; Expected = @(
  "      localStorage.removeItem('journall_auth_bypassed');"
) }

$siteC = @{ Start = 12083; End = 12088; Expected = @(
  "    if(localStorage.getItem('journall_auth_bypassed') === '1'){",
  "      window.setAuthLoading(false);",
  "      window.currentUser = { uid: 'local_user', displayName: 'Local Trader', email: 'local@journall.app' };",
  "      window.openSignedInJournal('Opened locally. Cloud sync is disabled.');",
  "      return;",
  "    }"
) }

$siteD = @{ Start = 12112; End = 12115; Expected = @(
  "  if(localStorage.getItem('journall_auth_bypassed') === '1'){",
  "    setGateVisible(false);",
  "    return;",
  "  }"
) }

$sites = @($siteA, $siteB, $siteC, $siteD)

Write-Host "=== PRE-FLIGHT VERIFICATION ===" -ForegroundColor Cyan
$allOk = $true
foreach ($site in $sites) {
  $actual = $lines[($site.Start - 1)..($site.End - 1)]
  $expected = $site.Expected
  if ($actual.Count -ne $expected.Count) {
    Write-Host "MISMATCH at lines $($site.Start)-$($site.End): line count differs" -ForegroundColor Red
    $allOk = $false
    continue
  }
  for ($i = 0; $i -lt $expected.Count; $i++) {
    if ($actual[$i] -ne $expected[$i]) {
      Write-Host "MISMATCH at line $($site.Start + $i):" -ForegroundColor Red
      Write-Host "  Expected: $($expected[$i])" -ForegroundColor Yellow
      Write-Host "  Actual:   $($actual[$i])" -ForegroundColor Yellow
      $allOk = $false
    }
  }
}

if (-not $allOk) {
  Write-Host "`nABORTING. No changes written." -ForegroundColor Red
  exit 1
}

Write-Host "`nAll 4 sites verified. Proceeding..." -ForegroundColor Cyan

$excludeRanges = $sites | ForEach-Object { , @(($_.Start - 1), ($_.End - 1)) }

$newLines = for ($i = 0; $i -lt $lines.Count; $i++) {
  $skip = $false
  foreach ($r in $excludeRanges) {
    if ($i -ge $r[0] -and $i -le $r[1]) { $skip = $true; break }
  }
  if (-not $skip) { $lines[$i] }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines("$path.new", $newLines, $utf8NoBom)

Write-Host "`nWrote $path.new" -ForegroundColor Green
Write-Host "Original line count: $($lines.Count)"
Write-Host "New line count:      $($newLines.Count)"
Write-Host "Removed:             $($lines.Count - $newLines.Count) lines"