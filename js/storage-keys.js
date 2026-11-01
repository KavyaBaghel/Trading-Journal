/* Storage key registry. Names only: no behaviour, no reads, no writes.
   Source of truth for the key list is docs/storage-keys.md. Never rename a value: existing users' data lives under these names.
   Keys that start with viz, viztrade, krishna or journall (plus theme, selectedDate) are synced to Firestore by the auth module;
   jl* keys stay on the device. Always read and write through localStorage.setItem/removeItem so the sync patch runs. */
(function () {
  var K = Object.freeze({
  JL_ACCOUNT_SETTINGS: 'jlAccountSettings',
  JL_CIRCUIT_DISMISSED: 'jlCircuitDismissed',
  JL_DAY_LOCK_LOSSES: 'jlDayLockLosses',
  JL_DAY_LOCK_PEEK_UNTIL: 'jlDayLockPeekUntil',
  JL_DAY_LOCK_UNLOCKED: 'jlDayLockUnlocked',
  JL_GOALS2: 'jlGoals2',
  JL_IMPORT: 'jlImport',
  JL_JOURNALS: 'jlJournals',
  JL_OPEN_POSITIONS: 'jlOpenPositions',
  JL_PREFS: 'jlPrefs',
  JL_STREAK: 'jlStreak',
  JL_WEAK_SNOOZE_UNTIL: 'jlWeakSnoozeUntil',
  JL_WEEKEND_PREVIEW: 'jl_weekend_preview',
  JLIMG_PROFILE_AVATAR_DEV: 'jlimg_profile_avatar_dev',
  JLIMG_PROFILE_AVATAR_V1: 'jlimg_profile_avatar_v1',
  JLIMG_PROFILE_COVER_DEV: 'jlimg_profile_cover_dev',
  JLIMG_PROFILE_COVER_V1: 'jlimg_profile_cover_v1',
  JOURNALL_ACCOUNT_CONFIG_V1: 'journall_account_config_v1',
  JOURNALL_ACTIVE_UID: 'journall_active_uid',
  JOURNALL_AI_FOCUS_V1: 'journall_ai_focus_v1',
  JOURNALL_AI_PINS_V1: 'journall_ai_pins_v1',
  JOURNALL_AI_RULE_V1: 'journall_ai_rule_v1',
  JOURNALL_BROKER_SYNC_SETTINGS: 'journall_broker_sync_settings',
  JOURNALL_CHALLENGES_V1: 'journall_challenges_v1',
  JOURNALL_CONFLUENCE_LIST_V1: 'journall_confluence_list_v1',
  JOURNALL_CUSTOM_USERNAME: 'journall_custom_username',
  JOURNALL_DELETED_JOURNALS: 'journall_deleted_journals',
  JOURNALL_DELETED_TRADES: 'journall_deleted_trades',
  JOURNALL_ONBOARDING_COMPLETED: 'journall_onboarding_completed',
  JOURNALL_PAYOUTS_V1: 'journall_payouts_v1',
  JOURNALL_PLAYBOOK_V1: 'journall_playbook_v1',
  JOURNALL_PROFILE_AVATAR_IMG: 'journall_profile_avatar_img',
  JOURNALL_PROFILE_COVER_IMG: 'journall_profile_cover_img',
  JOURNALL_PROFILE_V1: 'journall_profile_v1',
  JOURNALL_PROP_SCOPE_V1: 'journall_prop_scope_v1',
  JOURNALL_SHOTS_V1: 'journall_shots_v1',
  JOURNALL_STUDY_NOTES_V1: 'journall_study_notes_v1',
  JOURNALL_TOOLS_PIP_V1: 'journall_tools_pip_v1',
  JOURNALL_USER_EMAIL: 'journall_user_email',
  KRISHNA_DAILY_JOURNAL: 'krishna_daily_journal',
  KRISHNA_JOURNAL_FORM_DRAFT: 'krishna_journal_form_draft',
  KRISHNA_JOURNAL_PAGE_ENTRIES: 'krishna_journal_page_entries',
  KRISHNA_PSYCHOLOGY_FORM_DRAFT: 'krishna_psychology_form_draft',
  KRISHNA_TOMORROW_RULE: 'krishna_tomorrow_rule',
  SELECTED_DATE: 'selectedDate',
  THEME: 'theme',
  VIZTRADE_TRADES: 'viztrade_trades',
  VIZTRADE_TRADING_PAGE_TRADES: 'viztrade_trading_page_trades',
  });
  var D = Object.freeze({
    /* dynamic key builders, same strings the code builds today */
    jlPsy: function (stage, name) { return 'jlPsy:' + stage + ':' + name; },
    jlOvChk: function (isoDate) { return 'jlOvChk:' + isoDate; },
    customUsername: function (uid) { return 'journall_custom_username_' + uid; },
    userEmail: function (uid) { return 'journall_user_email_' + uid; },
    userName: function (uid) { return 'journall_user_name_' + uid; }
  });
  window.JL_KEYS = Object.freeze({ keys: K, dyn: D });
})();
