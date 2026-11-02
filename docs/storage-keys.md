# Storage keys

Captured at runtime on `main` @ `bfc121c` (2026-11-01) by wrapping `Storage.prototype.getItem/setItem/removeItem` and clicking all 12 tabs in the browser smoke test (`tests/e2e/smoke.py`, signed in with stubbed Firebase, 40 sample trades). This is the real key list that `docs/REFACTOR_HANDOFF.md` said was unknown.

**Coverage caveat.** Only keys touched during that session are listed. Keys that need a real action (a screenshot upload, deleting a journal, a broker sync, a snooze) can be missing. The "Seen in code only" section lists those, found by reading the source. Dynamic key families are listed separately. Keys ending in `_test_uid` come from the test user and are really `_<uid>` per user.

## How cloud sync decides (from `index.html`, `shouldSyncKey`)

A key is synced to Firestore (`users/{uid}/journallState/main`) when it equals `theme` or `selectedDate`, or starts with `viz`, `viztrade`, `krishna` or `journall`. Exceptions that never sync: `krishna_journal_form_draft`, `krishna_psychology_form_draft`.

Keys starting with `jl` (`jlPrefs`, `jlJournals`, `jlPsy:*` and so on) do **not** match, so they stay on the device unless another script derives them from a synced key (for example `account-sync.js` builds `jlAccountSettings` from the synced `journall_account_config_v1`). Do not rename a key across that boundary without checking.

The auth module assigns its own `setItem`, `removeItem` and `clear` on `localStorage`, so `Object.keys(localStorage)` also returns those three names. A storage layer must call `localStorage.setItem` (not `Storage.prototype.setItem`) or cloud sync stops.

## localStorage keys seen at runtime (49)

### Synced to the cloud (27)

- `journall_account_config_v1`
- `journall_active_uid`
- `journall_ai_focus_v1`
- `journall_ai_pins_v1`
- `journall_ai_rule_v1`
- `journall_broker_sync_settings`
- `journall_challenges_v1`
- `journall_confluence_list_v1`
- `journall_custom_username`
- `journall_custom_username_test_uid`
- `journall_onboarding_completed`
- `journall_payouts_v1`
- `journall_playbook_v1`
- `journall_profile_avatar_img`
- `journall_profile_cover_img`
- `journall_profile_v1`
- `journall_prop_scope_v1`
- `journall_study_notes_v1`
- `journall_tools_pip_v1`
- `journall_user_email`
- `journall_user_email_test_uid`
- `journall_user_name_test_uid`
- `krishna_daily_journal`
- `krishna_journal_page_entries`
- `krishna_tomorrow_rule`
- `viztrade_trades`
- `viztrade_trading_page_trades`

### Device-only (22)

- `jlAccountSettings`
- `jlDayLockLosses`
- `jlDayLockPeekUntil`
- `jlDayLockUnlocked`
- `jlGoals2`
- `jlImport`
- `jlJournals`
- `jlOpenPositions`
- `jlOvChk:2026-10-30`
- `jlPrefs`
- `jlPsy:checklist:items`
- `jlPsy:cooldown:options`
- `jlPsy:debrief:items`
- `jlPsy:live:rules`
- `jlPsy:mind:items`
- `jlPsy:setup:requirements`
- `jlStreak`
- `jl_weekend_preview`
- `jlimg_profile_avatar_dev`
- `jlimg_profile_avatar_v1`
- `jlimg_profile_cover_dev`
- `jlimg_profile_cover_v1`

## sessionStorage keys seen at runtime (2)

- `__seeded` (set by the test harness, not the app)
- `jl_pr_tab_v1`

## Seen in code only (not hit in the smoke run)

Constants found by reading `js/`.

- `journall_shots_v1` (`quick-log.js`, `journal-tab.js`), synced
- `journall_deleted_journals` (`quick-log.js`, `journal-sync.js`), synced
- `journall_deleted_trades` (`quick-log.js`), synced
- `krishna_journal_form_draft` (`journal-tab.js`), never synced
- `jlWeakSnoozeUntil`, `jlCircuitDismissed` (`circuit-breaker.js`), device-only

## Dynamic key families

- `jlPsy:<stage>:<name>` built from `LS_PREFIX` in `psychology-room.js`. Device-only.
- `jlOvChk:<YYYY-MM-DD>` from `ovChkKey()`. Device-only.
- `journall_custom_username_<uid>`, `journall_user_email_<uid>`, `journall_user_name_<uid>`. Synced.
- Profile images in `profile-tab.js`: `journall_profile_{avatar,cover}_img` (synced copy) and `jlimg_profile_{avatar,cover}_{dev,v1}` (device and legacy copies).

## Rules for the storage layer (item 4)

1. Do not rename any key. Existing users have data under these names.
2. Route calls through `localStorage.setItem` / `removeItem`, never around them.
3. Keep the synced / device-only split exactly as listed above.
4. Test with a profile that has real data, and compare the smoke test's `lskeys` against `main`.
