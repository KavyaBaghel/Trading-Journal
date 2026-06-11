# Mobile App

This app now has a phone layout and a LAN mobile launcher.

## Open On Phone

1. Connect the PC and phone to the same Wi-Fi.
2. Double-click `Open Mobile App.bat`.
3. A window will show a URL like:

```text
http://192.168.x.x:8787/index.html
```

4. Open that URL on your phone browser.
5. Use the browser menu and choose **Add to Home Screen**.

Keep the `Open Mobile App.bat` window open while using the app on your phone.

## Notes

- Your journal data is stored in the browser/app profile where you use it.
- If you open it from your phone, the phone has its own browser storage.
- Export journals/trades from desktop and import them on mobile if you want the same saved data there.
- Ollama AI runs on the PC. Mobile browsers may not reach `localhost:11434` because `localhost` on the phone means the phone itself.

