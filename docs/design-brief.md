# design-brief.md

## Purpose
The locked visual direction for the full redesign. Every page-level Codex prompt should reference this so the aesthetic stays consistent across all 12 pages instead of drifting per session.

## Reference quality bar (not to copy directly — hit this tier of polish)
Linear and TradingView define the layout and density standard. Additional component/micro-interaction references: Reactbits, Uiverse, Refero Design (styles.refero.design), Aceternity UI (ui.aceternity.com), Motion.dev (for animation principles), Kokonut UI, Nklit UI, and Manus.im. Use these for hover states, transitions, and subtle motion polish, not for overall layout.

## Core aesthetic
Dark, premium, slightly technical product feel — a financial terminal, not a generic AI-startup landing page.

- **Base:** near-black background
- **Accent:** amber/gold only, used sparingly. No purple/violet, no rainbow coloring, no neon colors, no harsh or basic pastel gradients.
- **Terminal-window motif** somewhere in the shell or hero, but keep it understated and functional.
- **Bento grid layout** for dashboard and feature sections.
- **Colored left-stripe accents** on cards or nav items, using the amber accent.
- **Dot-grid texture + subtle radial glow** in hero/background areas, used sparingly.
- **Glassmorphism/liquid-glass panels** for elevated surfaces such as modals and priority cards.
- **Soft corner radius, real drop shadows** for depth.
- **Hover micro-interactions and subtle transitions** inspired by modern component libraries and motion systems.
- **Lucide icons** stay in use where already present.
- **Typography:** Inter is already acceptable. Geist or Space Grotesk are also acceptable if they fit the terminal feel better, but choose intentionally and keep the decision consistent.

## Hard avoid (reads as cheap/templated)
- Purple/violet as an accent color
- Harsh/loud gradients, rainbow coloring, neon colors, or basic pastel color schemes
- Pure white backgrounds
- Fake testimonials
- Fake or placeholder product demos/screenshots
- Three feature cards in a row as a marketing pattern
- Three pricing tiers or pricing-table layouts
- Emojis in UI copy
- Em dashes in UI copy
- "It's not X, it's Y" copy patterns
- Checkmark bullet lists used as generic decoration
- Sparkle icons or animated arrows used as generic decoration
- Skeleton loaders
- TOS/privacy boilerplate pages or sections

## Technical stack constraint (IMPORTANT — read before executing any redesign prompt)
The app is a single index.html file, vanilla JS, no build step, no bundler. No new external dependencies of any kind should be introduced for this redesign.

Use hand-written CSS and the existing custom-property system already in the file (`--canvas`, `--gold`, `--card`, `--hairline`, `--surface-2`, etc.), plus vanilla JS only where needed for interaction polish.

Allowed:
- **Hand-styled components** — recreate the desired visual language directly in CSS, without adding framework or component dependencies
- **lucide** (already in use in this file via `lucide.createIcons()`) — not `lucide-react`, since there's no React here

For motion, use plain CSS transitions/keyframes and minimal vanilla JS patterns such as `IntersectionObserver` for staggered reveals. Do not add Tailwind, Motion, or any other new library.

## Animation priorities
Two tiers, both matter since this is a daily-use dashboard, not a landing page:
1. **Micro-interactions** (higher frequency, used constantly): hover states, smooth tab/page transitions, number count-ups on stat changes, button/card feedback on interaction
2. **Entrance/reveal animations** (lower frequency, used for polish): cards fading/sliding in on page load, staggered reveals for grids — used tastefully, not on literally everything, so it doesn't feel like a landing-page gimmick during daily trading use

## What stays untouched
- All logic — see preserve-ids.md for the full list of IDs/data-attributes that must not change
- The login page — already good, explicitly out of scope for this redesign
- Data model / field names — see data-model.md
