/* Step 3.5: user name. Two live keys: journall_custom_username and journall_custom_username_<uid>. Default = Google display name. */
(function(){
  var ls=localStorage;
  function email(){var u=window.currentUser;if(u&&u.email&&u.email!=='local@journall.app')return u.email.trim();
    var a=ls.getItem('journall_active_uid');if(a){var e=ls.getItem('journall_user_email_'+a);if(e)return e.trim()}
    var l=(ls.getItem('journall_user_email')||'').trim();return(l&&l.indexOf('local@')<0)?l:''}
  function uid(){return(window.currentUser&&window.currentUser.uid)||ls.getItem('journall_active_uid')||'local'}
  window.getActiveUserEmail=function(){return email()||'Signed in'};
  window.getActiveUserName=function(){
    var c=(ls.getItem('journall_custom_username_'+uid())||'').trim();if(c)return c;
    var u=window.currentUser;if(u&&u.displayName&&u.displayName!=='Local Trader')return u.displayName.trim();
    var e=email();if(e&&e.indexOf('@')>0)return e.split('@')[0];return 'Trader'};
  window.jlResolveUserName=window.getActiveUserName;
  window.jlSaveUserName=function(v){v=String(v||'').trim().slice(0,40);if(!v)return;
    ls.setItem('journall_custom_username',v);ls.setItem('journall_custom_username_'+uid(),v)};
  window.rememberFirebaseUserProfile=function(user){
    if(!user||user.uid==='local_user')return;
    var prev=ls.getItem('journall_active_uid');
    if(prev&&prev!==user.uid){ls.removeItem('journall_custom_username');ls.removeItem('journall_user_name')}
    ls.setItem('journall_active_uid',user.uid);
    if(user.email){ls.setItem('journall_user_email',user.email.trim());ls.setItem('journall_user_email_'+user.uid,user.email.trim())}
    if(user.displayName){ls.setItem('journall_user_name_'+user.uid,user.displayName.trim());
      if(!ls.getItem('journall_custom_username_'+user.uid)){ls.setItem('journall_custom_username_'+user.uid,user.displayName.trim());ls.setItem('journall_custom_username',user.displayName.trim())}}
    if(user.photoURL)ls.setItem('journall_user_photo_'+user.uid,user.photoURL)};
  window.renderUserProfile=function(){if(typeof window.jlRefreshName==='function')window.jlRefreshName()};
  window.refreshSignedInProfile=function(){if(window.currentUser&&window.currentUser.uid!=='local_user')window.rememberFirebaseUserProfile(window.currentUser);window.renderUserProfile()};
})();
