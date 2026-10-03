$path = "C:\Users\cnjac\Trading-Journal\index.html"
$outPath = "C:\Users\cnjac\Trading-Journal\index.html.new"

$lines = Get-Content -Path $path -Encoding UTF8

$startLine = 3336
$endLine   = 3371
$startIdx = $startLine - 1
$endIdx   = $endLine - 1

if ($lines.Count -lt $endLine) {
    Write-Host "ABORT: file has fewer than $endLine lines (has $($lines.Count)). No changes made." -ForegroundColor Red
    exit 1
}

$actualBlock = $lines[$startIdx..$endIdx] | ForEach-Object { $_.Trim() }

$expected = @(
'<div class="firebase-auth-card journall-signin-card" hidden>',
'<div class="jl-logo-wrap">',
'<div class="jl-logo" role="img" aria-label="Journall">',
'<span class="jl-mark">J</span>',
'<span class="jl-wordmark">Journall</span>',
'</div>',
'</div>',
'<div class="jl-heading">',
'<p class="jl-title">Welcome back</p>',
'<p class="jl-subtitle">Sign in to get back to your trades.</p>',
'</div>',
'<button id="firebaseGateSignInBtn" class="jl-btn jl-btn-google" type="button"><span id="googleBtnContent" class="jl-btn-google-content"><svg class="google-logo-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.8l3.3-3.3C17.7 1.6 15 1 12 1 7.3 1 3.4 3.7 1.5 7.7l3.9 3C6.3 7.7 8.9 5.04 12 5.04z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.4 14.7c-.3-.8-.4-1.7-.4-2.7s.1-1.9.4-2.7L1.5 6.3C.5 8.2 0 10.3 0 12.5s.5 4.3 1.5 6.2l3.9-3z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.2 1.2-3.1 0-5.7-2.7-6.6-5.7L1.5 15.7C3.4 19.7 7.3 23 12 23z"/></svg><span>Sign in with Google</span></span></button>',
'<div class="jl-divider">or</div>',
'<form id="jlEmailForm" novalidate>',
'<div class="jl-field">',
'<label for="jlEmailInput">Email</label>',
'<input type="email" id="jlEmailInput" name="email" placeholder="you@example.com" autocomplete="email" required>',
'<span class="jl-error" id="jlEmailError"></span>',
'</div>',
'<div class="jl-field">',
'<label for="jlPasswordInput">Password</label>',
'<div class="jl-field-row">',
'<input type="password" id="jlPasswordInput" name="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8">',
'<button type="button" class="jl-toggle-pw" id="jlTogglePw" aria-label="Show password" aria-pressed="false"><svg id="jlEyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>',
'</div>',
'<span class="jl-error" id="jlPasswordError"></span>',
'<div class="jl-field-meta">',
'<button type="button" class="jl-link" id="jlForgotBtn">Forgot password?</button>',
'</div>',
'</div>',
'<button type="submit" class="jl-btn jl-btn-primary" id="jlEmailBtn"><span class="jl-spinner" aria-hidden="true"></span><span class="jl-btn-label">Sign in</span></button>',
'<p class="jl-status" id="jlStatusText" aria-live="polite"></p>',
'</form>',
'<div id="firebaseGateMessage" class="jl-message">Checking website sign-in...</div>',
'<p class="jl-footnote">By continuing, you agree to Journall''s Terms and Privacy Policy.</p>',
'</div>'
)

if ($actualBlock.Count -ne $expected.Count) {
    Write-Host "ABORT: extracted block has $($actualBlock.Count) lines, expected $($expected.Count). No changes made." -ForegroundColor Red
    exit 1
}

$mismatches = @()
for ($i = 0; $i -lt $expected.Count; $i++) {
    if ($actualBlock[$i] -ne $expected[$i]) {
        $mismatches += "Line $($startLine + $i): expected [$($expected[$i])] but found [$($actualBlock[$i])]"
    }
}

if ($mismatches.Count -gt 0) {
    Write-Host "ABORT: content mismatch, no changes made." -ForegroundColor Red
    $mismatches | ForEach-Object { Write-Host $_ }
    exit 1
}

Write-Host "Preflight check passed: lines $startLine-$endLine match expected content exactly." -ForegroundColor Green

$newBlock = @(
'<div class="jl-logo-wrap">',
'  <div class="jl-logo" role="img" aria-label="Journall">',
'    <span class="jl-mark">J</span>',
'    <span class="jl-wordmark">Journall</span>',
'  </div>',
'</div>',
'<div class="jl-heading">',
'  <p class="jl-title">Welcome back</p>',
'  <p class="jl-subtitle">Sign in to get back to your trades.</p>',
'</div>',
'<form id="jlEmailForm" class="firebase-auth-card journall-signin-card" novalidate hidden>',
'  <button id="firebaseGateSignInBtn" class="jl-btn jl-btn-google" type="button"><span id="googleBtnContent" class="jl-btn-google-content"><svg class="google-logo-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.8l3.3-3.3C17.7 1.6 15 1 12 1 7.3 1 3.4 3.7 1.5 7.7l3.9 3C6.3 7.7 8.9 5.04 12 5.04z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.4 14.7c-.3-.8-.4-1.7-.4-2.7s.1-1.9.4-2.7L1.5 6.3C.5 8.2 0 10.3 0 12.5s.5 4.3 1.5 6.2l3.9-3z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.2 1.2-3.1 0-5.7-2.7-6.6-5.7L1.5 15.7C3.4 19.7 7.3 23 12 23z"/></svg><span>Continue with Google</span></span></button>',
'  <div class="jl-divider">or</div>',
'  <div class="jl-field">',
'    <label for="jlEmailInput">Email</label>',
'    <input type="email" id="jlEmailInput" name="email" placeholder="you@example.com" autocomplete="email" required>',
'    <span class="jl-error" id="jlEmailError"></span>',
'  </div>',
'  <div class="jl-field">',
'    <label for="jlPasswordInput">Password</label>',
'    <div class="jl-field-row">',
'      <input type="password" id="jlPasswordInput" name="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8">',
'      <button type="button" class="jl-toggle-pw" id="jlTogglePw" aria-label="Show password" aria-pressed="false"><svg id="jlEyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>',
'    </div>',
'    <span class="jl-error" id="jlPasswordError"></span>',
'    <div class="jl-field-meta">',
'      <button type="button" class="jl-link" id="jlForgotBtn">Forgot password?</button>',
'    </div>',
'  </div>',
'  <button type="submit" class="jl-btn jl-btn-primary" id="jlEmailBtn"><span class="jl-spinner" aria-hidden="true"></span><span class="jl-btn-label">Sign in</span></button>',
'  <p class="jl-status" id="jlStatusText" aria-live="polite"></p>',
'</form>',
'<div id="firebaseGateMessage" class="jl-message">Checking website sign-in...</div>',
'<p class="jl-footnote">By continuing, you agree to Journall''s Terms and Privacy Policy.</p>'
)

$before = $lines[0..($startIdx - 1)]
$after  = $lines[($endIdx + 1)..($lines.Count - 1)]

$newLines = $before + $newBlock + $after

[System.IO.File]::WriteAllLines($outPath, $newLines, (New-Object System.Text.UTF8Encoding $false))

Write-Host "Wrote $outPath ($($newLines.Count) lines, original had $($lines.Count))." -ForegroundColor Green
Write-Host "Next: review with:" -ForegroundColor Yellow
Write-Host "  git diff --no-index `"$path`" `"$outPath`"" -ForegroundColor Yellow