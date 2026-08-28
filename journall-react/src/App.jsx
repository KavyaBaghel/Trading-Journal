// Phase 2 routing: preserve Phase 1 data boundaries while mapping legacy tabs into a state-only React Router shell.
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useLocalTradeStoreBridge } from './hooks/useLocalTradeStoreBridge'
import { AppShell } from './layouts/AppShell'
import AICoach from './pages/AICoach'
import AccountSettings from './pages/AccountSettings'
import Analytics from './pages/Analytics'
import Calendar from './pages/Calendar'
import Goals from './pages/Goals'
import Journal from './pages/Journal'
import Psychology from './pages/Psychology'
import TodaysSummary from './pages/TodaysSummary'
import Trades from './pages/Trades'
import UploadData from './pages/UploadData'
import UserProfile from './pages/UserProfile'
import Widgets from './pages/Widgets'
import { useTradeStore } from './store/useTradeStore'
import './index.css'

const VIEWS = [
  { id: 'tradingpage', label: "Today's Summary", path: '/tradingpage', shortLabel: '01' },
  { id: 'dashboard', label: 'Analytics', path: '/dashboard', shortLabel: '02' },
  { id: 'grid', label: 'Trades', path: '/grid', shortLabel: '03' },
  { id: 'journalpage', label: 'Journal', path: '/journalpage', shortLabel: '04' },
  { id: 'calendar', label: 'Calendar', path: '/calendar', shortLabel: '05' },
  { id: 'psychology', label: 'Psychology', path: '/psychology', shortLabel: '06' },
  { id: 'goals', label: 'Goals', path: '/goals', shortLabel: '07' },
  { id: 'accountsettings', label: 'Account Settings', path: '/accountsettings', shortLabel: '08' },
  { id: 'ailab', label: 'AI Coach', path: '/ailab', shortLabel: '09' },
  { id: 'widgets', label: 'Widgets', path: '/widgets', shortLabel: '10' },
  { id: 'userprofile', label: 'User Profile', path: '/userprofile', shortLabel: '11' },
  { id: 'uploadcsv', label: 'Upload Data', path: '/uploadcsv', shortLabel: '12' },
]

const LEGACY_TAB_PATHS = Object.fromEntries(VIEWS.map((view) => [view.id, view.path]))

function LegacyHashRouteSync() {
  const navigate = useNavigate()

  useEffect(() => {
    function openLegacyHash() {
      const legacyTab = window.location.hash.replace('#', '').trim()
      const path = LEGACY_TAB_PATHS[legacyTab]
      if (path) navigate(path, { replace: true })
    }

    openLegacyHash()
    window.addEventListener('hashchange', openLegacyHash)
    return () => window.removeEventListener('hashchange', openLegacyHash)
  }, [navigate])

  return null
}

function FirebaseDebugView() {
  const { error: authError, loading: authLoading, signInWithGoogle, user } = useAuth()
  const refreshLocalStorage = useLocalTradeStoreBridge()
  const tradeStore = useTradeStore()

  const debugData = {
    activeTradeSource: tradeStore.source,
    localStorageOrigin: window.location.origin,
    authenticated: Boolean(user),
    authLoading,
    user: user
      ? { uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null }
      : null,
    mainTradeCount: tradeStore.tradeCounts.main,
    tradingPageTradeCount: tradeStore.tradeCounts.tradingPage,
    myTradesCount: tradeStore.tradeCounts.myTrades,
    mergedTradeCount: tradeStore.tradeCounts.merged,
    sampleRecordShape: tradeStore.trades[0] ? Object.keys(tradeStore.trades[0]).sort() : [],
    legacySyncedStorageKeys: tradeStore.syncedStorageKeys,
    accountConfig: tradeStore.accountConfig,
    accountMetrics: tradeStore.accountMetrics,
    localSnapshotStatus: tradeStore.status,
    firestoreHookStatus: 'Deprecated for Phase 1; retained in src/hooks/useTrades.js and not invoked.',
    authError: authError?.message ?? null,
  }

  return (
    <section data-dev-only="firebase-debug">
      <p>DEV ONLY / FIREBASE READ CHECK</p>
      {!authLoading && !user ? <button type="button" onClick={signInWithGoogle}>Sign in with Google</button> : null}
      <button type="button" onClick={refreshLocalStorage}>Refresh local storage</button>
      <pre>{JSON.stringify(debugData, null, 2)}</pre>
    </section>
  )
}

function App() {
  return (
    <MemoryRouter initialEntries={['/tradingpage']}>
      <LegacyHashRouteSync />
      <AppShell views={VIEWS}>
        <Routes>
          <Route path="/tradingpage" element={<TodaysSummary />} />
          <Route path="/dashboard" element={<Analytics />} />
          <Route path="/grid" element={<Trades />} />
          <Route path="/journalpage" element={<Journal />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/psychology" element={<Psychology />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/accountsettings" element={<AccountSettings />} />
          <Route path="/ailab" element={<AICoach />} />
          <Route path="/widgets" element={<Widgets />} />
          <Route path="/userprofile" element={<UserProfile />} />
          <Route path="/uploadcsv" element={<UploadData />} />
          <Route path="*" element={<TodaysSummary />} />
        </Routes>

        {import.meta.env.DEV ? (
          <AuthProvider>
            <FirebaseDebugView />
          </AuthProvider>
        ) : null}
      </AppShell>
    </MemoryRouter>
  )
}

export default App
