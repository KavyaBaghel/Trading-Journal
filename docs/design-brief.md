# design-brief.md

## Purpose
The locked visual direction for the full redesign. Every page-level Codex prompt should reference this so the aesthetic stays consistent across all 12 pages instead of drifting per session.

## Reference quality bar (not to copy directly — hit this tier of polish)
Aceternity UI (ui.aceternity.com), Reactbits, Motion.dev, Kokonut UI, Uiverse, Refero Design (styles.refero.design), V0 templates, Manus.im — referenced for component polish, motion quality, and layout craft.

## Core aesthetic
Dark, premium, slightly technical product feel — a financial terminal, not a generic AI-startup landing page.

- **Base:** near-black background
- **Accent:** amber/gold, used sparingly — one confident accent color, not a rainbow. Chosen deliberately because this is a gold (XAUUSD) trading journal — the color ties directly to the product's subject matter. Do NOT use purple/violet — it reads as generic "AI-generated" and was explicitly rejected.
- **Terminal-window motif** somewhere in the shell/hero — fits a trading tool's identity
- **Bento grid layout** for dashboard/feature sections
- **Colored left-stripe accents** on cards or nav items (using the amber accent)
- **Dot-grid texture + subtle radial glow** in hero/background areas — used sparingly, not on every page/section
- **Glassmorphism/liquid-glass panels** for elevated surfaces (modals, cards that need to stand out)
- **Soft corner radius, real drop shadows** for depth (not flat/flush design)
- **Micro-interactions:** hover states, animated arrows, subtle icon accents on lucide icons
- **Checkmark bullets** for feature/checklist-style lists
- **Copy style:** em dashes, "it's not X, it's Y" style microcopy where it earns its place — used sparingly, not forced everywhere

## Hard avoid (reads as cheap/templated)
- Purple/violet as an accent color
- Fake testimonials, fake/placeholder product demo screenshots
- Skeleton loaders
- Neon colors, rainbow gradients, harsh/unrefined gradients, basic pastel palettes
- Pure white backgrounds
- Generic cookie-cutter 3-pricing-tier layout (not applicable here anyway — no payment flow)
- ToS/privacy-policy boilerplate sections (not applicable — internal tool)

## Technical stack constraint (IMPORTANT — read before executing any redesign prompt)
The app is a single index.html file, vanilla JS, no build step, no bundler. shadcn/ui (React) and Framer Motion (npm package) are NOT directly usable without a full React migration, which is out of scope for this redesign (see decisions.md for why this was ruled out).

Instead, hit the same visual tier with build-step-free equivalents:
- **Tailwind CSS via CDN** — utility classes, no build needed
- **Hand-styled "shadcn-style" components** — recreate that visual language (soft radius, subtle borders, glass panels) directly in Tailwind/CSS, without the actual shadcn React package
- **Motion (formerly Motion One)** via CDN — same creators as Framer Motion, same physics-based animation quality, vanilla JS version, no build step required
- **lucide** (already in use in this file via `lucide.createIcons()`) — NOT `lucide-react`, since there's no React here

## Animation priorities
Two tiers, both matter since this is a daily-use dashboard, not a landing page:
1. **Micro-interactions** (higher frequency, used constantly): hover states, smooth tab/page transitions, number count-ups on stat changes, button/card feedback on interaction
2. **Entrance/reveal animations** (lower frequency, used for polish): cards fading/sliding in on page load, staggered reveals for grids — used tastefully, not on literally everything, so it doesn't feel like a landing-page gimmick during daily trading use

## What stays untouched
- All logic — see preserve-ids.md for the full list of IDs/data-attributes that must not change
- The login page — already good, explicitly out of scope for this redesign
- Data model / field names — see data-model.md
