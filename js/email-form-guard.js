/* Bug #2: the email/password form has no auth wiring yet. It must never submit natively:
   a native GET submit puts ?email=...&password=... in the URL (history, logs, referrers). */
(function(){
  try{
    var u = new URL(location.href);
    if(u.searchParams.has('password') || u.searchParams.has('email')){
      u.searchParams.delete('password');
      u.searchParams.delete('email');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  }catch(e){}

  var form = document.getElementById('jlEmailForm');
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var pw = document.getElementById('jlPasswordInput');
      if(pw) pw.value = '';
      var status = document.getElementById('jlStatusText');
      if(status) status.textContent = 'Email sign-in is not available yet. Use Continue with Google.';
    });
  }

  var toggle = document.getElementById('jlTogglePw');
  var input = document.getElementById('jlPasswordInput');
  var icon = document.getElementById('jlEyeIcon');
  if(toggle && input){
    var EYE = '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>';
    var EYE_OFF = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1.5 12 1.5 12a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 10.5 7 10.5 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    toggle.addEventListener('click', function(){
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      toggle.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      if(icon) icon.innerHTML = reveal ? EYE_OFF : EYE;
    });
  }
})();
