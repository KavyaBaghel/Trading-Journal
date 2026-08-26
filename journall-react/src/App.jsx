// Phase 1 debug: preserve the Phase 0 terminal shell and mount only a development-only Firebase read proof.
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useTrades } from './hooks/useTrades'
import './index.css'

function FirebaseDebugView() {
  const { error: authError, loading: authLoading, signInWithGoogle, user } = useAuth()
  const trades = useTrades(user)

  const debugData = {
    authenticated: Boolean(user),
    authLoading,
    user: user
      ? { uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null }
      : null,
    stateDocumentExists: trades.exists,
    mainTradeCount: trades.mainTradeCount,
    tradingPageTradeCount: trades.tradingPageTradeCount,
    mergedTradeCount: trades.trades.length,
    sampleRecordShape: trades.trades[0] ? Object.keys(trades.trades[0]).sort() : [],
    legacyStorageKeys: trades.storageKeys,
    authError: authError?.message ?? null,
    tradeReadError: trades.error?.message ?? null,
  }

  return (
    <section data-dev-only="firebase-debug">
      <p>DEV ONLY / FIREBASE READ CHECK</p>
      {!authLoading && !user ? <button type="button" onClick={signInWithGoogle}>Sign in with Google</button> : null}
      <pre>{JSON.stringify(debugData, null, 2)}</pre>
    </section>
  )
}

function App() {
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8 sm:py-8">
      <section className="terminal-shell" aria-label="Journall React migration scaffold">
        <header className="terminal-header">
          <div className="brand-lockup" aria-label="Journall React">
            <span className="brand-mark" aria-hidden="true">J</span>
            <span className="brand-name">JOURNALL</span>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-context">REACT</span>
          </div>
          <div className="window-controls" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </header>

        <div className="signal-rail" aria-hidden="true" />

        <div className="terminal-content">
          <p className="eyebrow">PHASE 1 / READ-ONLY DATA CHECK</p>
          <h1>Firebase connection probe.</h1>
          <p className="status-copy">
            Development mode can authenticate with the existing Google flow and read the legacy Firestore trade state without changing it.
          </p>

          <div className="status-panel">
            <span className="status-indicator" aria-hidden="true" />
            <span>READ-ONLY MODE</span>
            <span className="status-separator" aria-hidden="true">/</span>
            <span>FIREBASE DEBUG</span>
          </div>

          {import.meta.env.DEV ? (
            <AuthProvider>
              <FirebaseDebugView />
            </AuthProvider>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default App
