# Design Brief v2 — Purple/Black Direction (supersedes v1 gold direction)

## Core aesthetic
Dark, premium, technical product feel — a financial terminal, not a generic
AI-startup landing page. Dark mode only for now; light mode is a future,
separate pass.

- **Base:** black background
- **Accent:** #494fdf (purple) only, used sparingly — one confident accent
  color, not a rainbow
- **Typography:** Geist, for its geometric/technical feel
- **Terminal-window motif** somewhere in the shell/hero
- **Bento grid layout** for dashboard/feature sections
- **Colored left-stripe accents** on cards/nav items, using the purple accent
- **Dot-grid texture + subtle radial glow**, used sparingly (hero/background
  areas only, not every section)
- **Glassmorphism/liquid-glass panels** for elevated surfaces (modals,
  standout cards)
- **Soft corner radius, real drop shadows** for depth
- **Hover micro-interactions**: subtle, fast lift/fade — not rich
  spring-based animation
- **Lucide icons** stay in use, no change

## Reference sites (visual inspiration only — this app has no build step,
no React, no npm — everything must be hand-coded in vanilla CSS/JS)
- Motion.dev — animation principles/timing, recreate via CSS transitions
- Reactbits — component motion patterns
- Uiverse.io — the ONE source with directly copy-pasteable plain CSS/HTML;
  can be adapted closer to as-is
- Refero Design (styles.refero.design) — layout/spacing rhythm
- Aceternity UI — bento grids, hero glow, terminal motifs
- Kokonut UI — component polish reference
- Bklit UI — chart/data-viz styling reference
- Manus.im — overall polish tier reference

## Hard avoid
- Purple as the ONLY accent is fine, but no additional harsh/loud gradients
- Rainbow coloring, neon colors
- Pure white backgrounds
- Fake testimonials
- Fake/placeholder product demo screenshots
- 3-pricing-tier layouts
- 3-feature-cards-in-a-row marketing pattern
- Emojis in UI copy
- Em dashes in UI copy
- Checkmark bullet lists as generic decoration
- Sparkle icons or animated arrows as generic decoration
- Skeleton loaders
- TOS/privacy boilerplate sections

## Technical stack constraint
Single index.html file, vanilla JS, no build step, no bundler, no new
external dependencies. Hand-written CSS using the existing custom-property
system. Lucide via lucide.createIcons() only (not lucide-react).
