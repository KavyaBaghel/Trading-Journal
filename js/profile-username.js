/* Step 3.5: user name. Two live keys: journall_custom_username and journall_custom_username_<uid>. Default = Google display name. */
(function(){
  var ls=localStorage;
  function email(){var u=window.currentUser;if(u&&u.email&&u.email!=='local@journall.app')return u.email.trim();
    var a=ls.getItem(JL_KEYS.keys.JOURNALL_ACTIVE_UID);if(a){var e=ls.getItem(JL_KEYS.dyn.userEmail(a));if(e)return e.trim()}
    var l=(ls.getItem(JL_KEYS.keys.JOURNALL_USER_EMAIL)||'').trim();return(l&&l.indexOf('local@')<0)?l:''}
  function uid(){return(window.currentUser&&window.currentUser.uid)||ls.getItem(JL_KEYS.keys.JOURNALL_ACTIVE_UID)||'local'}
  window.getActiveUserEmail=function(){return email()||'Signed in'};
  window.getActiveUserName=function(){
    var c=(ls.getItem(JL_KEYS.dyn.customUsername(uid()))||'').trim();if(c)return c;
    var u=window.currentUser;if(u&&u.displayName&&u.displayName!=='Local Trader')return u.displayName.trim();
    var e=email();if(e&&e.indexOf('@')>0)return e.split('@')[0];return 'Trader'};
  window.jlResolveUserName=window.getActiveUserName;
  window.jlSaveUserName=function(v){v=String(v||'').trim().slice(0,40);if(!v)return;
    ls.setItem(JL_KEYS.keys.JOURNALL_CUSTOM_USERNAME,v);ls.setItem(JL_KEYS.dyn.customUsername(uid()),v)};
  window.rememberFirebaseUserProfile=function(user){
    if(!user||user.uid==='local_user')return;
    var prev=ls.getItem(JL_KEYS.keys.JOURNALL_ACTIVE_UID);
    if(prev&&prev!==user.uid){ls.removeItem(JL_KEYS.keys.JOURNALL_CUSTOM_USERNAME);ls.removeItem('journall_user_name')}
    ls.setItem(JL_KEYS.keys.JOURNALL_ACTIVE_UID,user.uid);
    if(user.email){ls.setItem(JL_KEYS.keys.JOURNALL_USER_EMAIL,user.email.trim());ls.setItem(JL_KEYS.dyn.userEmail(user.uid),user.email.trim())}
    if(user.displayName){ls.setItem(JL_KEYS.dyn.userName(user.uid),user.displayName.trim());
      if(!ls.getItem(JL_KEYS.dyn.customUsername(user.uid))){ls.setItem(JL_KEYS.dyn.customUsername(user.uid),user.displayName.trim());ls.setItem(JL_KEYS.keys.JOURNALL_CUSTOM_USERNAME,user.displayName.trim())}}
    if(user.photoURL)ls.setItem(JL_KEYS.dyn.userPhoto(user.uid),user.photoURL)};
  window.renderUserProfile=function(){if(typeof window.jlRefreshName==='function')window.jlRefreshName()};
  window.refreshSignedInProfile=function(){if(window.currentUser&&window.currentUser.uid!=='local_user')window.rememberFirebaseUserProfile(window.currentUser);window.renderUserProfile()};
})();
