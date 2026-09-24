# preserve-ids.md

## Purpose
This is the ground-truth list of every `id="..."` attribute referenced via `getElementById()` in `index.html`, extracted directly from the file (not guessed). During the full visual redesign, **every one of these IDs must remain exactly as-is** — same spelling, same casing, on the same type of element performing the same role. Visible text, styling, layout position, and surrounding markup can all change freely. The ID itself cannot.

## Rule for any AI/tool editing this file
- You may restyle, reposition, rename the *visible* label, or change the wrapping HTML structure around any element below.
- You may NOT rename, remove, or duplicate any `id` value on this list.
- If a redesign requires splitting one element into multiple, the original ID must stay on the element that performs its original role (e.g. the one the JS actually reads/writes).
- If you are unsure whether an element is safe to restructure, treat its ID as load-bearing and ask before proceeding.
- Also preserve every `data-tab="..."` value on nav buttons (tradingpage, dashboard, grid, journalpage, psychology, calendar, reports, widgets, goals, ailab, userprofile) — visible nav labels can change, `data-tab` values cannot.

## Full ID list (alphabetical, extracted from getElementById calls)

accountOnboardingGate, accountPhaseInput, accountSetupMessage, accountSetupPreview, accountSizeInput, accountSyncNote, activeTabTitle, aiChatBox, aiInsights, aiPromptInput, aiReportStatus, aiSnapshot, aiWidgetStatus, analyticsBars, androidInstallBtn, brokerPlatformSelect, brokerSyncBtn, brokerSyncDays, brokerSyncLogin, brokerSyncServer, brokerSyncStatus, btnBrokerSync, btnBrokerSyncText, btnMt5ReportUpload, bypassAuthBtn, calendarGrid, calendarMonthSelect, calendarSummary, calendarTitle, calendarYearSelect, checklistResultIcon, checklistResultSub, checklistResultTitle, cmdDailyLoss, cmdNextAction, cmdRuleBreaks, cmdStatus, cmdTodayPnl, cmdTomorrowRule, cmdTrades, cooldownModalBackdrop, cooldownTimerCircle, ctraderAccountId, ctraderToken, currentBalanceInput, customAvatarInput, customUsernameInput, dayTradesList, dayTradesModalBackdrop, dayTradesModalSub, dayTradesModalTitle, directionHelper, equityHelper, equityKpis, fieldsCtrader, fieldsMatchtrader, fieldsMt5, firebaseAuthBar, firebaseAuthGate, firebaseAuthLoading, firebaseAuthLoadingText, firebaseAuthRetryBtn, firebaseAuthStatus, firebaseGateMessage, firebaseGateSignInBtn, firebaseSignInBtn, firebaseSignOutBtn, goalsBox, googleBtnContent, gridCount, heatmap, journalAiFeedback, journalDate, journalEmotionAfter, journalEmotionBefore, journalEntryConfirmation, journalExitConfirmation, journalGoodEntryPoint, journalId, journalImportStatus, journalImprovement, journallApp, journalMistake, journalPageCount, journalScreenshot, journalScreenshotData, journalScreenshotFileName, journalScreenshotPreview, journalSearch, journalSetupCategory, journalTradeKey, journalTradeResultFilter, journalTradeSelector, journalVideoFileName, journalVideoFrame, journalVideoRemoveBtn, journalVideoStatus, journalVideoUpload, mainCsvUpload, mainUploadStatus, matchtraderEmail, matchtraderPassword, matchtraderUrl, maxDailyLossInput, maxDailyLossType, maxDrawdownType, maxTradesInput, metrics, minRrInput, mistake, mistakeDashboardGrid, mistakeDashboardList, mistakeHelper, mistakeModalBackdrop, mobileActiveTab, mt5ReportFileInput, nameChangeLimitBadge, notes, oldJournalImportFile, outcomePieHelper, phaseDeadlineInput, planText, planTitle, pnlPieHelper, postSessionReview, postSessionStatus, preTradeChecklistProgressFill, preTradeChecklistProgressText, preTradeSetup, profitTargetInput, profitTargetType, profStatBalance, profStatBroker, profStatDeposit, profStatTrades, propBox, propChallengeDashboard, propGoalStatus, psychChecklistCompleteBtn, psychDebriefMistakes, psychDebriefNotes, psychDebriefResult, psychGateStatus, psychLiveCompleteBtn, psychLiveRulesCompleteBtn, psychNextSetupBtn, psychSetupCompleteBtn, psychSetupCriteria, psychSetupCriteriaList, psychTomorrowRule, q, qjModalTitle, qjNotesInput, qjProgressText, qjSetupSelect, qjTradeSummary, quickJournalBackdrop, realAiStatus, reportCards, result, riskPercentInput, riskPipValueInput, riskSlPipsInput, rows, savedJournalList, savedProcess, selectedTradeBox, session, sessionHelper, sessionPieHelper, setupCriteriaRows, setupPerformanceTracker, side, sidebarProfileEmail, sidebarProfileName, sideDailyRules, sideJournaledTrades, sidePendingJournalTrades, sideRuleBreaks, startSyncBtn, syncNowBtn, syncStatus, todayDateLabel, todayInsights, todayMetrics, todayRows, todayTradeCount, topAvatarImg, topProfileEmail, topProfileName, tradingPageBrokerHeader, tradingPageUpload, upload, uploadcsv, uploadStatus, userProfileAvatar, userProfileEmail, userProfileName, weeklyChart, widgetGrid

## Grouped by likely area (for quick reference during page-by-page redesign)

**Shell / Sidebar / Profile widget:** journallApp, activeTabTitle, firebaseAuthBar, firebaseAuthStatus, topAvatarImg, topProfileName, topProfileEmail, sidebarProfileName, sidebarProfileEmail, sideDailyRules, sideRuleBreaks, sideJournaledTrades, sidePendingJournalTrades, mobileActiveTab, androidInstallBtn

**Auth / Onboarding:** firebaseAuthGate, firebaseAuthLoading, firebaseAuthLoadingText, firebaseAuthRetryBtn, firebaseGateMessage, firebaseGateSignInBtn, firebaseSignInBtn, firebaseSignOutBtn, bypassAuthBtn, googleBtnContent, accountOnboardingGate, accountSetupMessage, accountSetupPreview, accountSizeInput, accountPhaseInput, currentBalanceInput, customAvatarInput, customUsernameInput, maxDailyLossInput, maxDailyLossType, maxDrawdownType, maxTradesInput, minRrInput, riskPercentInput, riskPipValueInput, riskSlPipsInput, profitTargetInput, profitTargetType, phaseDeadlineInput

**Today's Summary (→ Overview):** cmdTodayPnl, cmdDailyLoss, cmdTrades, cmdRuleBreaks, cmdNextAction, cmdStatus, cmdTomorrowRule, todayDateLabel, todayMetrics, todayRows, todayTradeCount, todayInsights, tradingPageUpload, tradingPageBrokerHeader, postSessionReview, postSessionStatus

**Analytics:** analyticsBars, equityKpis, equityHelper, outcomePieHelper, pnlPieHelper, sessionPieHelper, sessionHelper, mistakeHelper, directionHelper, heatmap, aiInsights, metrics, weeklyChart

**Trades (→ Trade Log):** gridCount, rows, q (search), result, session, side, mistake, notes

**Journal:** journalDate, journalId, journalTradeKey, journalTradeSelector, journalTradeResultFilter, journalSearch, journalEntryConfirmation, journalExitConfirmation, journalGoodEntryPoint, journalMistake, journalImprovement, journalEmotionBefore, journalEmotionAfter, journalSetupCategory, journalScreenshot, journalScreenshotData, journalScreenshotFileName, journalScreenshotPreview, journalVideoUpload, journalVideoFrame, journalVideoFileName, journalVideoStatus, journalVideoRemoveBtn, journalAiFeedback, journalPageCount, journalImportStatus, oldJournalImportFile, savedJournalList

**Psychology:** psychSetupCriteria, psychSetupCriteriaList, psychSetupCompleteBtn, psychNextSetupBtn, psychLiveCompleteBtn, psychLiveRulesCompleteBtn, psychChecklistCompleteBtn, psychDebriefMistakes, psychDebriefNotes, psychDebriefResult, psychGateStatus, psychTomorrowRule, preTradeSetup, preTradeChecklistProgressFill, preTradeChecklistProgressText, checklistResultIcon, checklistResultSub, checklistResultTitle

**Calendar:** calendarGrid, calendarTitle, calendarMonthSelect, calendarYearSelect, calendarSummary, dayTradesModalBackdrop, dayTradesModalTitle, dayTradesModalSub, dayTradesList

**Reports:** reportCards, aiReportStatus, setupPerformanceTracker, setupCriteriaRows

**Widgets (→ AI Insights):** widgetGrid, aiWidgetStatus

**Goals:** goalsBox, propBox, propChallengeDashboard, propGoalStatus, planTitle, planText

**AI Coach:** aiChatBox, aiPromptInput, realAiStatus, aiSnapshot

**User Profile (→ Account):** userProfileName, userProfileEmail, userProfileAvatar, profStatBalance, profStatBroker, profStatDeposit, profStatTrades, nameChangeLimitBadge

**Broker Sync / Upload:** brokerPlatformSelect, brokerSyncBtn, brokerSyncDays, brokerSyncLogin, brokerSyncServer, brokerSyncStatus, btnBrokerSync, btnBrokerSyncText, btnMt5ReportUpload, mt5ReportFileInput, fieldsMt5, fieldsCtrader, fieldsMatchtrader, ctraderAccountId, ctraderToken, matchtraderEmail, matchtraderPassword, matchtraderUrl, mainCsvUpload, mainUploadStatus, uploadcsv, uploadStatus, upload, startSyncBtn, syncNowBtn, syncStatus, savedProcess

**Modals (Mistake Dashboard, Quick Journal, Cooldown):** mistakeModalBackdrop, mistakeDashboardGrid, mistakeDashboardList, quickJournalBackdrop, qjModalTitle, qjNotesInput, qjProgressText, qjSetupSelect, qjTradeSummary, selectedTradeBox, cooldownModalBackdrop, cooldownTimerCircle
