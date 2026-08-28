// Phase 2 shell: compact terminal placeholder for deferred legacy views; color use remains within Journall's locked tokens.
export function ViewPlaceholder({ title }) {
  return (
    <section className="border border-terminal-border bg-terminal p-6 md:p-8" aria-labelledby={`${title}-heading`}>
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal">ROUTE READY</p>
      <h2 id={`${title}-heading`} className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">This legacy view is available in the shared React shell. Its migration is intentionally deferred.</p>
    </section>
  )
}
