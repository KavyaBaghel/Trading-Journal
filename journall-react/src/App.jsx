// Phase 2 routing: preserve Phase 1 data boundaries while mapping legacy tabs into a state-only React Router shell.
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ModalProvider } from './components/layout/ModalProvider'
import { useLocalTradeStoreBridge } from './hooks/useLocalTradeStoreBridge'
import { MinimalDebugView } from './components/layout/MinimalDebugView'
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

function App() {
  useLocalTradeStoreBridge()

  return (
    <AuthProvider>
      <ModalProvider>
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
          </AppShell>
        </MemoryRouter>
        {import.meta.env.DEV ? <MinimalDebugView /> : null}
      </ModalProvider>
    </AuthProvider>
  )
}

export default App
