$ErrorActionPreference = 'Stop'
$path = "C:\Users\cnjac\Trading-Journal\index.html"

try {
    [string[]]$lines = Get-Content -Path $path -Encoding UTF8
} catch {
    Write-Host "FAILED to read file: $_" -ForegroundColor Red
    exit 1
}

$errors = @()

$removals = @(
    @{ Label="Markup: bypassAuthBtn button (line 3369)"; Start=3369; End=3369;
       FirstMustContain='id="bypassAuthBtn"'; LastMustContain='id="bypassAuthBtn"' },

    @{ Label="Function: window.bypassAuthAndOpenLocal (11369-11373)"; Start=11369; End=11373;
       FirstMustContain='window.bypassAuthAndOpenLocal = function(){'; LastMustContain='};' },

    @{ Label="Auto-resume bypass check (11487-11491)"; Start=11487; End=11491;
       FirstMustContain='Run early bypass check'; LastMustContain='}' },

    @{ Label="const bypassAuthBtn (11509)"; Start=11509; End=11509;
       FirstMustContain="getElementById('bypassAuthBtn')"; LastMustContain="getElementById('bypassAuthBtn')" },

    @{ Label="isBypassed block in initFirebaseAuth (11952-11964)"; Start=11953; End=11964;
       FirstMustContain='const isBypassed ='; LastMustContain='}' },

    @{ Label="CSS block 1: #bypassAuthBtn + :hover (15662-15674)"; Start=15662; End=15674;
       FirstMustContain='#bypassAuthBtn {'; LastMustContain='}' },

    @{ Label="CSS block 2: #bypassAuthBtn + :hover (16175-16193)"; Start=16175; End=16193;
       FirstMustContain='#bypassAuthBtn {'; LastMustContain='}' },

    @{ Label="CSS single line: #bypassAuthBtn.jl-link (16838)"; Start=16838; End=16838;
       FirstMustContain='#bypassAuthBtn.jl-link'; LastMustContain='#bypassAuthBtn.jl-link' },

    @{ Label="Stray status text (12122)"; Start=12122; End=12122;
       FirstMustContain="Sign in to use the website version."; LastMustContain="Sign in to use the website version." }
)

foreach ($r in $removals) {
    $firstLine = $lines[$r.Start - 1]
    $lastLine  = $lines[$r.End - 1]
    if ($firstLine -notmatch [regex]::Escape($r.FirstMustContain)) {
        $errors += "$($r.Label): line $($r.Start) does not contain expected text. Found: $firstLine"
    }
    if ($lastLine -notmatch [regex]::Escape($r.LastMustContain)) {
        $errors += "$($r.Label): line $($r.End) does not contain expected text. Found: $lastLine"
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`n=== VERIFICATION FAILED - NOTHING WAS CHANGED ===" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    exit 1
}

Write-Host "All line-number ranges verified. Proceeding." -ForegroundColor Green

$toDelete = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($r in $removals) {
    for ($n = $r.Start; $n -le $r.End; $n++) { [void]$toDelete.Add($n) }
}

$kept = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
    $lineNum = $i + 1
    if (-not $toDelete.Contains($lineNum)) {
        $kept.Add($lines[$i])
    }
}
$lines = $kept.ToArray()

$listenerText = "if(bypassAuthBtn) bypassAuthBtn.addEventListener('click', window.bypassAuthAndOpenLocal);"
$idx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match [regex]::Escape($listenerText)) { $idx = $i; break }
}
if ($idx -eq -1) {
    Write-Host "`nERROR: could not find bypassAuthBtn listener line. Output NOT written." -ForegroundColor Red
    exit 1
}
Write-Host "Removing bypassAuthBtn listener (found at new line $($idx+1))" -ForegroundColor Yellow
if ($idx -eq 0) { $before = @() } else { $before = $lines[0..($idx-1)] }
if ($idx -eq $lines.Count-1) { $after = @() } else { $after = $lines[($idx+1)..($lines.Count-1)] }
$lines = $before + $after

Set-Content -Path "$path.new" -Value $lines -Encoding UTF8
Write-Host "`nDone. Wrote $path.new" -ForegroundColor Green
