// Phase 0 design: Amber Terminal Ledger — near-black terminal surface, Signal Amber accents, no product data or routes.
import './index.css'

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
          <p className="eyebrow">PHASE 0 / MIGRATION FOUNDATION</p>
          <h1>React surface initialized.</h1>
          <p className="status-copy">
            The legacy vanilla app remains unchanged. This isolated Vite + React shell is ready for the Phase 1 data layer.
          </p>

          <div className="status-panel">
            <span className="status-indicator" aria-hidden="true" />
            <span>THEME ONLINE</span>
            <span className="status-separator" aria-hidden="true">/</span>
            <span>AMBER TERMINAL</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
