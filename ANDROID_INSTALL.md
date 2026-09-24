# Install Journall on Android

Journall is now installable as an Android PWA.

## Install from Chrome

1. Open the hosted Journall website in Chrome on Android.
2. Wait for the app to load once.
3. Tap the `Install Journall` button if it appears.
4. If the button does not appear, tap the Chrome three-dot menu.
5. Tap `Install app` or `Add to Home screen`.
6. Open Journall from the Android home screen like a normal app.

## Notes

- This is not an APK yet. It is a PWA, which is the best fit for the current single-file website.
- Offline launch works after the first successful load because the service worker caches the app shell.
- Google sign-in only works on a hosted HTTPS website, not from `file://`.
- Local laptop mode still works separately on your Windows machine.

## If you want an APK later

Use Trusted Web Activity or Capacitor to wrap the hosted PWA into an APK/AAB for Play Store or direct APK sharing.
