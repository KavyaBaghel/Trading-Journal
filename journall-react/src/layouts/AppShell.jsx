// Phase 2 shell: restrained financial-terminal framing using only Journall's locked near-black, primary, and signal tokens.
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthStatusBar } from '../components/layout/AuthStatusBar'
import { MobileNav } from '../components/layout/MobileNav'
import { ModalRoot } from '../components/layout/ModalRoot'
import { AuthGate } from '../components/layout/AuthGate'
import { AccountOnboardingGate } from '../components/layout/AccountOnboardingGate'

function viewFromPath(views, pathname) {
  return views.find((view) => view.path === pathname) ?? views[0]
}

export function AppShell({ children, views }) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = viewFromPath(views, location.pathname)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-terminal-border bg-terminal px-4 py-6 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-[10px] border border-signal text-sm font-bold text-signal">J</span>
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-foreground">JOURNALL</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted">REACT TERMINAL</p>
          </div>
        </div>

        <nav className="min-h-0 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {views.map((view) => {
            const active = activeView.id === view.id

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => navigate(view.path)}
                className={`flex w-full items-center gap-3 rounded-[10px] border-l-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-transparent text-muted hover:border-terminal-border hover:bg-background hover:text-foreground'
                }`}
              >
                <span className={`font-mono text-[10px] ${active ? 'text-signal' : 'text-muted'}`}>{view.shortLabel}</span>
                <span>{view.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-6 border-t border-terminal-border pt-4">
          <p className="px-2 font-mono text-[10px] tracking-[0.14em] text-muted">DAILY RULES</p>
          <p className="mt-2 px-2 text-xs leading-5 text-muted">Read-only migration shell. Legacy data remains unchanged.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-terminal-border bg-background/95 px-5 py-4 backdrop-blur md:ml-64 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal">JOURNALL / PHASE 2</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">{activeView.label}</h1>
          </div>
          <AuthStatusBar />
        </div>
      </header>

      <button
        type="button"
        onClick={() => navigate('/userprofile')}
        className="fixed right-5 top-[5.25rem] z-20 flex items-center gap-2 rounded-[10px] border border-terminal-border bg-terminal px-3 py-2 text-left transition-colors hover:border-primary md:top-5"
        aria-label="Open User Profile"
      >
        <span className="grid size-7 place-items-center rounded-full border border-primary text-xs font-bold text-primary">T</span>
        <span className="hidden text-xs text-foreground sm:inline">Trader profile</span>
      </button>

      <main className="px-5 py-8 md:ml-64 md:px-8 pb-16 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <AuthGate>
            <AccountOnboardingGate>
              {children}
            </AccountOnboardingGate>
          </AuthGate>
        </div>
      </main>

      <MobileNav views={views} />
      <ModalRoot />
    </div>
  )
}
