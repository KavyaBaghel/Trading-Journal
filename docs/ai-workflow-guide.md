# agents.md

## Purpose
This document defines how AI tools are allowed to work on this codebase (Journall trading journal, single index.html file). Read this before making any edits.

## Roles

**Claude (planning/diagnosis)**
- Has no direct file or machine access.
- Diagnoses issues, decides what needs to change, writes precise, scoped edit prompts (exact IDs, exact line references where possible, exact markup/CSS to add or remove).
- Reviews every diff Codex produces before it gets committed.

**Codex (execution)**
- Has real file access on the user's machine.
- Only acts on narrow, pre-scoped prompts from Claude — never given the whole file to "explore" freely. This already burned its context window once on a 3-part edit; keep prompts scoped to specific line ranges/sections.
- Makes only the requested edits, nothing else. Reports a diff when done.

**Manus AI (research/planning only)**
- Good for research, drafting planning docs (design-brief.md, architecture.md, etc.), gathering UI references.
- Does NOT get direct code-editing access to this repo. See "The Manus Incident" below for why.
- If Manus is ever used for code edits in the future, it must work on an isolated branch with no push access to main, same diff-review process as Codex.

## The Manus Incident (documented lesson, do not repeat)
Manus AI previously pushed unsupervised redesign commits directly to the `main` branch without any review:
- `b05de37` — "Premium Transformation: Motion.dev, Kokonut UI, and Manus.im inspired design"
- `39d7f0f` — "Full Transformation: Aceternity & ReactBits inspired design system"

This caused multiple conflicting `.sidebar` width rules (80px, 220px, 250px, 260px, 280px all competing), a full header-bar restructure that added a search box and "Command Center" fallback title text, and silently dropped the sidebar's "Daily Rules" panel and its profile card. It took a full debugging day to trace and restore. The root cause was not "which AI tool" — it was **an AI given unsupervised push access to a production branch**.

## Hard rules going forward
1. Nothing gets pushed to `main` without the user reviewing a diff first. No exceptions, regardless of which tool made the change.
2. Any AI doing code edits gets narrow, scoped prompts — not "redesign this file" or "explore and fix issues."
3. Every id="..." and data-tab="..." in preserve-ids.md must remain unchanged. Visible text/labels/styling can change freely; the underlying attributes cannot.
4. Large efforts (like the full visual redesign) are executed one page/section at a time, each tested locally before moving to the next — never one giant all-at-once edit.
5. Redesign work happens on a dev branch, merged to main only after a full manual pass-through test.
6. After every deploy, the service worker must be manually unregistered to see changes reflected on the live site (known issue — see known-issues.md) — always verify against a hard-refreshed, cache-cleared view before declaring something fixed or broken.

## Standard workflow loop
1. Claude diagnoses and writes a scoped prompt.
2. Codex executes only that scoped change, returns a diff.
3. User pastes the diff to Claude for review.
4. Claude checks: correct scope, no orphaned references, no duplicate IDs, preserve-ids.md respected.
5. User tests locally (reload app, click through the specific feature that changed).
6. Commit + push only after local testing passes.
7. Check GitHub Actions tab for successful deploy.
8. Hard-refresh + unregister service worker on the live site.
9. Confirm live site matches intent before moving to the next task.
