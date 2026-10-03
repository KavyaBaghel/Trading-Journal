# Journall: define the missing mergeImportedTrades in index.html (adds 23 lines, removes none).
# Run from C:\Users\cnjac\Trading-Journal :   powershell -ExecutionPolicy Bypass -File .\apply_merge_fix.ps1
$ErrorActionPreference = 'Stop'
$path = Join-Path (Get-Location) 'index.html'
$expectBefore = '4B69B71994FE407A11F98AEF17AEAA62'
$expectAfter  = '708B2E0AF4CBB0504B14E6BF6092DAE7'
$before = (Get-FileHash $path -Algorithm MD5).Hash
if ($before -ne $expectBefore) { throw "STOP: index.html hash is $before, expected $expectBefore. Nothing changed." }
$enc = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($path, $enc)
if ($text.Contains('function mergeImportedTrades')) { throw 'STOP: mergeImportedTrades is already defined. Nothing changed.' }
$marker = 'function mergeSyncedStorageMaps('
if (([regex]::Matches($text, [regex]::Escape($marker))).Count -ne 1) { throw 'STOP: marker not found exactly once. Nothing changed.' }
$fix = @'
function mergeImportedTrades(existingTrades, incomingTrades){
  /* Union by trade id (fallback key: date|time|symbol|side|entry|pnl). Never throws. Local/incoming wins field-by-field, but user journal fields already on the stored copy are kept. */
  const keyOf = t => {
    if(!t || typeof t !== 'object') return '';
    if(t.id != null && t.id !== '') return 'id:' + t.id;
    return 'k:' + [t.date, t.time, t.symbol, t.side, t.entry != null ? t.entry : t.openPrice, t.pnl].join('|');
  };
  const merged = new Map();
  (Array.isArray(existingTrades) ? existingTrades : []).forEach(t => { const k = keyOf(t); if(k) merged.set(k, t); });
  (Array.isArray(incomingTrades) ? incomingTrades : []).forEach(t => {
    const k = keyOf(t); if(!k) return;
    const prev = merged.get(k);
    if(!prev){ merged.set(k, t); return; }
    const out = {...prev, ...t};
    if(prev.notes && !t.notes) out.notes = prev.notes;
    if(Array.isArray(prev.mistakes) && prev.mistakes.length && !(Array.isArray(t.mistakes) && t.mistakes.length)) out.mistakes = prev.mistakes;
    if(prev.setup && !t.setup) out.setup = prev.setup;
    if(prev.journaled || t.journaled) out.journaled = true;
    merged.set(k, out);
  });
  return [...merged.values()].sort((a,b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
}

'@
$fix = ($fix -replace "`r`n", "`n") + "`n"   # here-strings drop the final newline; the fix text ends with a blank line
$new = $text.Replace($marker, $fix + $marker)
$tmp = "$path.tmp"
[System.IO.File]::WriteAllText($tmp, $new, $enc)
$after = (Get-FileHash $tmp -Algorithm MD5).Hash
if ($after -ne $expectAfter) { Remove-Item $tmp; throw "STOP: result hash $after, expected $expectAfter. index.html untouched." }
Move-Item $tmp $path -Force
Write-Host "OK: index.html patched ($after). Now run: git diff --stat   (expect 1 file, 23 insertions, 0 deletions)"
