# Calm Ledger — Rebuild Master Plan

> **This is the canonical resume file.** A fresh session should read this file first, and only this file, before touching code. It tells you exactly what's done, what decisions are already settled (don't re-litigate them), and the next concrete action.

## 0. What this project is

A personal finance app for exactly one person (the owner, email-gated via `ALLOWED_EMAIL`). Hosted on Vercel, backed by Supabase. Transactions/tags/accounts are entered **manually** — there is no bank sync, and none is planned. The core value the app needs to deliver is: fast, low-friction manual entry, and a genuinely excellent analysis section that makes sense of the data.

This plan supersedes the old `plan.md`/`stages.md` (generic AI-drafted feature lists from an earlier session, kept for history in git but no longer authoritative). The prior app was functionally reasonable but visually and conceptually basic — flat dark theme, hand-rolled conic-gradient donuts, letter-only collapsed nav icons, no motion design. This rebuild is a full design + analysis overhaul, not a bug-fix pass.

## 1. Resume Here

**Current phase: P4 — Dashboard rebuild (dispatched to a subagent — check §7 before starting work)**

P0-P3 are done, including the light/dark theme system (added mid-flight, see P1.5) and a full Analysis rebuild. From here, P4/P5/P6 are being run as separate worktree-isolated agents per the user's request for coordinated multi-agent execution — see §7 for status of each before picking up any of them yourself, to avoid duplicating or conflicting with in-flight work.

How to resume in a new session:
1. Read this file top to bottom (it's short).
2. Skim the last 1-2 entries in `PROGRESS.md` for session-level detail.
3. Run `git log --oneline -15` to see what's actually landed.
4. Pick up at the phase marked `in progress`, or start the next `not started` phase.

## 2. Decisions already made (do not re-litigate)

- **Backend stays Supabase, framework stays Next.js 14 (App Router) + TanStack Query.** It's already hosted, has working auth/RLS, and there's no reason to migrate infra for a single-user app. Effort goes into UI/UX and analysis depth, not backend churn.
- **Existing data is real and precious.** All schema changes are additive migrations only (new files under `supabase/migrations/`). Never edit or drop existing migrations/tables/columns.
- **Theme: refined "Liquid Glass," now with both dark and light palettes and a manual toggle.** (Revised 2026-09-03 — originally dark-only, the user asked for a light theme too.) Dark is still the default; a `ThemeToggle` in the header flips `data-theme` on `<html>` and persists to `localStorage`. No system-preference auto-switching — it's an explicit toggle, not `prefers-color-scheme`-driven. See P1.5 below for how this was retrofitted.
- **Multi-agent execution from P4 onward.** (Added 2026-09-03.) The user asked for coordinated subagents on the remaining phases instead of one linear session. Foundational/cross-cutting work (design tokens, chart primitives, theming) is done directly since it requires holding the whole design system in context; phases with low file overlap (P4 Dashboard, P5 manual entry, P6 CRUD screens) are handed to worktree-isolated agents with tight briefs pointing at this file. Whoever picks this file up next should check §7 (Agent dispatch log) for in-flight or completed agent work before starting anything new.
- **New dependencies:** `framer-motion` (motion/springs/page transitions), `lucide-react` (icon set, tree-shakeable). Charts are **hand-built SVG components** (`components/charts/*`), not a third-party chart library — full control over the glass look, no bundle bloat, no theming fights.
- **Git workflow:** commit locally after each completed phase, with a clear message. No pushes unless asked.
- **Analysis is the flagship section.** It gets built right after the shell + chart primitives exist (P3), ahead of restyling every CRUD screen.
- **App name stays "Calm Ledger"** (already renamed in a recent session) — not revisiting naming.

## 3. Architecture snapshot (as of rebuild kickoff)

- `app/*/page.tsx` — thin server route wrappers; real UI lives in `components/*Client.tsx`.
- Data fetching: client components use TanStack Query + `utils/supabase/client.ts`; a few server helpers remain in `lib/data.ts` (used less as pages moved to client-fetch — see `PROGRESS.md` session 25-31 history).
- Domain types: `lib/types.ts`. Finance math: `lib/finance.ts` (balances, monthly totals). Analysis/date helpers: `lib/insights.ts`.
- Offline: `lib/offline-sync.ts` + `components/SyncManager.tsx` — localStorage mutation outbox flushed when back online. Keep this working; don't regress offline quick-add.
- Auth: `middleware.ts` redirects unauthenticated users to `/login`; Supabase RLS enforces `user_id = auth.uid()` everywhere.
- Data model (`supabase/migrations/0001`–`0005`): `accounts`, `categories`, `tags` + `transaction_tags`, `transactions`, `people` + `people_ledger` (IOU tracking), `goals` + `goal_contributions`, `limits`, `recurring_rules`, `user_preferences`.

## 4. Phase roadmap

Legend: ⬜ not started · 🟨 in progress · ✅ done

### P0 — Foundation & docs ✅
- [x] Full repo audit (every file read/understood)
- [x] Rewrite `PLAN.md` as the canonical resumable doc
- [x] Fold `stages.md` facts in here, retire it
- [x] Decisions log established

### P1 — Design tokens + shell rebuild ✅
- [x] Added `framer-motion`, `lucide-react`
- [x] Moved every authenticated route into an `app/(app)/` route group with a single shared `layout.tsx` that mounts `AppShell` once — previously every `page.tsx` wrapped itself in `<AppShell>`, which meant the whole shell (sidebar, header, sync manager) remounted on every navigation. Now it persists, which is also what makes route transitions animate instead of hard-cutting.
- [x] Rebuilt design tokens in `globals.css`: elevation scale (`--bg-0`..`--bg-3`), categorical chart palette (`--chart-1`..`--chart-8`), motion tokens, radii scale, a real three-tier glass system (`.glass-1`/`.surface-card`, `.glass-2`/`.glass-nav`, `.glass-3`)
- [x] Added `.ambient-field` — fixed drifting gradient blobs behind the glass. **Gotcha hit and fixed:** an opaque `background` on `html`/`body` gets promoted by the browser to the canvas paint layer, which sits behind *everything* including fixed, negative-z-index descendants regardless of z-index — so the ambient blobs were invisible until that background was removed from `html`/`body` and left only on `.ambient-field` itself. If backgrounds look flat/dead in a later phase, check for this again.
- [x] Loaded real fonts via `next/font/google` (Inter + JetBrains Mono) — previously `'Inter'` was referenced by name with nothing actually loading it
- [x] Rebuilt `Sidebar.tsx` — lucide icons instead of letter initials, animated active-pill via `layoutId`, spring collapse animation
- [x] Rebuilt `AppShell.tsx`/`HeaderActions.tsx` — floating glass header, simplified actions (online status, search/command-palette trigger, quick-add, auth)
- [x] New `MobileDock.tsx` — floating glass bottom dock (icon nav + active pill) replacing the old hamburger slide-out drawer, plus a separate elevated FAB for quick-add
- [x] New `CommandPalette.tsx` — Cmd+K modal, fuzzy-ish substring filter over `lib/nav.ts`'s `ALL_DESTINATIONS`, arrow-key navigation, a "Quick spend" action; also openable from the header search button via a custom event
- [x] New `PageTransition.tsx` — `AnimatePresence` fade/slide keyed by pathname, works now that the shell persists across nav
- [x] Restyled `login`/`LoginForm` to match (glass card, `.field`/`.btn-primary`)
- [x] Verified visually: installed a headless Chromium (Playwright) locally since no browser tool was available, screenshotted via a temporary `/login/preview` route (middleware treats `/login/*` as public), iterated on the glass/ambient contrast until it actually read as glass, then deleted the temp route before committing
- [x] `npm run build` and `npm run lint` both pass

**Note for later phases:** many CRUD pages (`GoalsClient`, `LimitsClient`, `PeopleClient`, `TagsClient`, etc.) still hand-roll their own `<h1 className="text-3xl font-semibold">` page headers instead of using the shared `.page-header`/`.page-title` classes. They still render correctly with the new tokens (the underlying CSS vars are unchanged), just not yet visually consistent with pages that do use `.page-header`. P6 should normalize this.

### P1.5 — Light/dark theme retrofit ✅
Added mid-flight after P3 was already in progress, when the user asked for both themes with a toggle instead of dark-only. Retrofit, not a rewrite — the whole design system is CSS custom properties, so this was additive:
- [x] Restructured `globals.css`: theme-independent tokens (radii, motion) stay in plain `:root`; color/surface tokens moved under `:root, :root[data-theme='dark']` (default) and a new `:root[data-theme='light']` block
- [x] New tokens needed for full theme parity beyond the original palette: `--glass-1/2/3-bg`, `--glass-specular(-strong)`, `--glass-shade`, `--ambient-blob-opacity`, `--ambient-spot-opacity`, `--ambient-grain-opacity`/`-blend`, `--track`, `--on-accent` (text color on accent-filled surfaces — near-black in dark mode since accent is bright, white in light mode since accent is deeper), `--fab-shadow`, `--active-pill-bg`/`-border`, `--accent-wash`
- [x] Hunted down and replaced every component with hardcoded `rgba(255,255,255,...)` / hardcoded accent-rgb values (`Sidebar`, `MobileDock`, `CommandPalette`, `AnalysisClient`) — these silently broke in light mode otherwise since they didn't reference the themed tokens
- [x] `components/ThemeToggle.tsx` — sun/moon icon button (animated crossfade), flips `data-theme`, persists to `localStorage` (`fin.theme`), also updates the `<meta name="theme-color">` tag for the browser chrome
- [x] Pre-hydration theme script in `app/layout.tsx` via `next/script strategy="beforeInteractive"` — reads `localStorage` before paint so a stored light preference doesn't flash dark first
- [x] Placed the toggle in `HeaderActions` (next to Search/Quick/Logout) — visible on every authenticated screen
- [x] Verified both themes visually (see P3 verification below — same pass covered both)
- [x] `npm run build`/`lint` pass

**Note for P4/P5/P6 agents:** the token system means you should almost never need theme-specific code — just use `var(--token-name)` (or the matching Tailwind class like `bg-[--bg-secondary]`, `text-[--text-primary]`) and both themes work automatically. The only time you need to think about theme explicitly is if you introduce a **new** raw color (a hardcoded hex/rgba) instead of an existing token — don't do that; add a token to both theme blocks in `globals.css` instead, the way `--on-accent` etc. were added above.

### P2 — Chart primitive library ✅
Hand-built, SVG + framer-motion, styled to the glass system. All live in `components/charts/`, sharing geometry helpers from `lib/charts.ts` (Catmull-Rom path smoothing, point normalization, arc/circumference math, categorical `--chart-1..8` palette, heatmap intensity bucketing).
- [x] `Sparkline.tsx` — small inline line + optional gradient fill, animated draw-in via `pathLength`
- [x] `AreaChart.tsx` — responsive (ResizeObserver-based), smoothed curve, gradient fill, hover crosshair + tooltip, sparse x-axis labels
- [x] `DonutChart.tsx` — multi-segment ring using stacked `<circle>` stroke-dasharray/offset (not conic-gradient), animated per-segment, hover to highlight + dim others, click-through via `onSliceClick`, legend chips
- [x] `BarChart.tsx` — one component, `orientation: 'vertical' | 'horizontal'`, animated bar grow-in, hover value labels (vertical), inline value (horizontal)
- [x] `HeatmapCalendar.tsx` — GitHub-style week-column grid, configurable week count/end date, hover tooltip, `onDayClick`
- [x] `RadialProgress.tsx` — single ring, value can exceed 1.0 to signal over-budget (color swaps to `--danger`)
- [x] Added `--track` token (`rgba(255,255,255,0.1)`) after the first visual pass showed ring/donut unfilled tracks were nearly invisible against `--hairline` (0.08) — rings need a bit more contrast than a border does
- [x] Verified all six visually via the same temporary-preview-route + headless-Chromium workflow as P1, then deleted the route
- [x] `npm run build` and `npm run lint` pass

**Notes for P3 (which consumes these):**
- None of these are wired into `AnalysisClient`/`DashboardClient` yet — P2 only built and visually verified the primitives in isolation. That wiring is P3/P4.
- All chart components are client components (`"use client"`) — fine to use directly from `AnalysisClient`/`DashboardClient` (already client components), but if a *server* component ever needs to render one, don't pass inline functions as props to it from a server component (React will throw "Functions cannot be passed directly to Client Components") — pass primitive data and let the client component define its own formatters, the way `PreviewShowcase` had to during P2's own verification.
- `DonutChart` renders butt-cap segments when there's more than one slice (rounded caps only for a single-slice ring) — intentional, avoids visual gaps between adjacent segments.

### P3 — Analysis section rebuild (flagship) ✅
`components/AnalysisClient.tsx` fully rebuilt on the P2 chart primitives, backed by new pure-function analysis logic in `lib/analysis.ts` (period ranges + comparisons, net worth series, cashflow by month, category tree aggregation with parent/child rollup, tag aggregation, essential/discretionary split, narrative insight generation, z-score anomaly detection).

Sections, top to bottom: period switcher (This month / Last month / Last 30 / Last 90 / This year / All time) → narrative insight strip → 4 stat tiles with vs-previous deltas → net worth area chart + cashflow bars → categories (donut with click-to-drill-down into subcategories + ranked list with deltas) + essential/discretionary donut → tags leaderboard + unusual-transactions list → daily-spend heatmap (links each day to `/whathappened?date=`) → budgets/goals/people tie-in row (radial progress rings, over-100% budgets swap to danger color).

- [x] `lib/analysis.ts` — all the derived-data logic, kept out of the component so it's independently reasoned about/testable
- [x] Real bug caught and fixed during visual QA: `this_month`/`this_year` were comparing month/year-to-date against the **entire** previous period, which made every delta trivially and misleadingly negative early in a period (3 days into September vs. all of August always looks "down ~90%"). Fixed to compare against the same number of elapsed days in the previous period.
- [x] **Important product-scope finding, not a code bug:** `transaction_tags` exists in the schema (migration 0001) with working RLS, but nothing in the app has ever let a user attach a tag to a transaction — `TagsClient` only manages tag *definitions*. Tag analysis here is built and will work correctly the moment tags get attached to transactions, but until then it shows an empty state ("No transactions have tags attached yet..."). **This is now the first thing P5 must fix** — wire a tag multi-select into the transaction add/edit form in `TransactionsClient.tsx` (not into `QuickAdd`, which is deliberately minimal/fast). Sequencing this way (read-side now, write-side in P5) avoided rework: the analysis query already does the `transaction_tags(tag_id, tags(id,name,color))` join, nothing here needs to change once P5 ships.
- [x] Verified visually (mock dataset, both themes, period switching, drill-down click) via the same temporary-preview-route + headless-Chromium workflow as P1/P2 — see P1.5 for why this pass covered theming too
- [x] `npm run build`/`lint` pass

**Deferred/cut from the original backlog (§5) to keep this phase shippable — pick up later if it earns its place:**
- Per-category trend sparklines in the category list (backlog mentioned this; the `Sparkline` primitive exists and works, just not wired in here — would need a daily/weekly series per category, cut for time)
- Custom date-range picker (only presets for now)
- Saved views/segments (still needs a new table — P7 territory anyway)
- A dedicated anomalies "page" — currently just a top-3 list, which is enough signal without over-building a rarely-used surface

### P4 — Dashboard rebuild 🟨 (dispatched — see §7)
Rebuild `DashboardClient.tsx` on the new chart primitives + glass system; keep the widget show/hide concept but restyle it. Touches: `components/DashboardClient.tsx`, `lib/dashboard.ts`. Low overlap with P5/P6.

### P5 — Manual entry UX 🟨 (dispatched — see §7)
Two things, in this order:
1. **Wire tags into transaction entry** (see P3's finding above — this is now the priority item, not optional polish). Add a tag multi-select to the add/edit transaction form in `TransactionsClient.tsx`, save to `transaction_tags` on submit, load existing tags when editing. Leave `QuickAdd.tsx` alone (deliberately minimal/fast, no tags there).
2. Restyle `QuickAdd`/`QuickAddModal`/`TransactionsClient` (853 lines, the biggest component) onto the glass design system. Keep the offline-outbox behavior in `lib/offline-sync.ts` intact — don't touch that mechanism, only the UI around it.

### P6 — Remaining screens visual pass ✅
Ran as a worktree-isolated agent (branch `worktree-agent-a0717a34abd80656e`, committed there — not yet merged to `main`, per the dispatch instructions to commit locally and leave merging to whoever picks this up next). The worktree had branched before P1-P3 landed, so the first step was fast-forwarding it onto `main` to pick up the design tokens/shell/chart primitives it depended on.

Touched: `AccountsClient`, `CategoriesClient`, `TagsClient`, `PeopleClient`, `GoalsClient`, `LimitsClient`, `RecurringRulesClient`, `CalendarClient`, `WhatHappenedClient` (all restyled onto `.glass-1`/`.surface-card`/`.data-row`/`.field`/`.btn-*`/`.kicker`), plus their route wrappers under `app/(app)/*/page.tsx` normalized onto `.page-header`/`.page-title`/`.page-copy` (the inconsistency flagged back in P1). Also picked up `app/(app)/manage/page.tsx` and `app/(app)/more/page.tsx` per the optional scope note — both got real icons on their link tiles instead of plain text rows. `BackupRestoreClient`/`app/(app)/settings/page.tsx` were already fully on the design system from an earlier session; only a stale "dark-first" copy line on the settings page got corrected to mention the light/dark toggle.

Design judgment calls worth recording:
- **Goals** — replaced the flat progress bar with `RadialProgress`: a small 44px ring inline in each list row (no label, just the ring, to avoid clutter at that size) and a large 140px ring with percentage + sublabel in the detail panel.
- **Limits** — this needed a real (not just cosmetic) change: `LimitsClient` had no visibility into transactions at all, so there was nothing to compute a spent-vs-budget ratio from. Added a `transactions` prop (fetched in `limits/page.tsx` via `getTransactions` with a `transaction_tags` join, reusing `TransactionWithTags` from `lib/analysis.ts`) and a small local `spentForLimit` helper that respects each limit's own scope (category/tag/overall) and period (current calendar month, or current week starting Sunday, for `weekly`). Each limit now renders a `RadialProgress` ring that correctly swaps to `--danger` past 100% (verified with a mock 144%-over-budget limit in preview QA).
- **Calendar** — kept the month-grid concept (not the GitHub-style `HeatmapCalendar` primitive used in Analysis) since a monthly calendar with day numbers is a genuinely different, more useful shape for this screen than a week-column heatmap; instead gave it real month navigation (prev/this-month/next, previously the grid only ever showed the current month with no way to look back) and intensity-scaled day backgrounds (`--danger` tint scaled by that day's spend against the month's max) plus a clearer today ring.
- **What happened** — added a proper date-nav control bar (prev/next chevrons + native date input, `.glass-1` pill) replacing the old plain form, "Jump to today" link, colored stat tiles (income/expense/transfer each tinted), and per-transaction type icons/colors in the journal list.
- **Tags / People** — both were still on pre-redesign raw Tailwind (`border-border`, `bg-bg-secondary`, etc., not the glass classes) despite those tokens themselves being theme-safe; fully converted. Added a small curated color-swatch picker (reusing `--chart-1..8`) for both tag colors and person avatar colors instead of a bare hex text field, so users aren't forced to know hex codes for a cosmetic choice — the underlying `color`/`avatar_color` text field is unchanged, this is presentation only.
- **Accounts** — added a "Total across N accounts" summary tile above the list (sums the same `calculateAccountBalances` already used per-row) and a per-type icon (bank/cash/wallet/credit/other).
- No functional/data-model changes anywhere except the Limits `transactions` prop threading described above — everything else is a pure visual pass, same mutations/queries as before.

Deferred: didn't touch `QuickSpendSettings.tsx` (used by `manage/page.tsx`) — it wasn't in the explicit component list and reads as reasonably consistent already (token-based, just not using the `.field`/`.btn-*` component classes); worth a follow-up pass if another phase touches manual entry again.

Verified visually across all 10 screens + Manage/More in both themes via the same temporary-preview-route + headless-Chromium workflow as P1-P3 (`app/login/preview/p6/*`, deleted before commit) — mock data for the 7 components that accept props directly, and small preview-only mirror components (also deleted) for `CalendarClient`/`WhatHappenedClient` since those fetch via `useQuery`+Supabase internally with no data props and this environment has no Supabase credentials configured.
`npm run build`/`lint` pass.

### P7 — Data model additions ⬜
Concrete additions TBD when we get here (don't design prematurely). Candidates noted during P3 if analysis needs new columns/tables (e.g. saved analysis views/filters). Additive migrations only, next file is `0006_*.sql`.

### P8 — Polish ⬜
PWA re-check, performance pass, a11y pass (focus states, reduced-motion already respected in old CSS — preserve it), empty states, keyboard shortcuts.

### P9 — Deploy & sign-off ⬜
Verify on Vercel (`fin-psi-umber.vercel.app`, Supabase project ref `ifxgrybtyeqikxwkucpp`), manual QA pass, close out.

## 5. Analysis section feature backlog (the flagship — detail for P3)

- **Overview**: net worth trend (area chart, computed from account balances over time), income/expense/savings-rate trend, cashflow summary for selected period.
- **Category analysis**: interactive donut with drill-down into subcategories, top-movers vs. previous period (delta callouts), per-category trend sparklines, essential vs. non-essential split (the `is_essential` field already exists and is unused in UI today).
- **Tag analysis**: tag leaderboard, spend-by-tag over time, since tags are the user's primary manual-entry organizing tool — this needs to be first-class, not an afterthought.
- **Calendar heatmap**: GitHub-style daily spend intensity, replacing the current plain month grid.
- **Comparisons**: this-month-vs-last, custom range vs. custom range, year-over-year, with clear delta/percentage callouts.
- **Narrative insights**: short auto-generated text callouts ("You spent 34% more on Dining this month, driven mostly by 5 transactions tagged #weekend") — computed client-side from existing data, no external AI call needed.
- **Anomaly flags**: transactions that are statistical outliers vs. that category's own history.
- **Budgets/limits tie-in**: progress rings with projected-overrun date given current pace.
- **Goals tie-in**: progress rings, projected completion date from contribution velocity.
- **People ledger tie-in**: net owed/owing trend folded into net worth view.
- **Saved views** (later): persist a custom filter/segment for quick recall — likely needs a small new table (P7 candidate).

## 6. Non-goals

- No bank-sync/Plaid-style integration — manual entry is intentional.
- No multi-user/tenant support — this is explicitly single-user.
- No third-party chart library, no CSS framework beyond existing Tailwind + hand-rolled tokens.
- No backend rewrite (Supabase stays).

## 7. Agent dispatch log

Multi-agent execution started 2026-09-03 per the user's request. Each row is one dispatched agent; update this table (don't just append prose) whenever you dispatch, resume, or land one, so the next session — human or agent — knows what's in flight without guessing from git log alone.

| Phase | Status | Branch / worktree | Notes |
|---|---|---|---|
| P4 Dashboard | dispatched | _fill in when launched_ | Rebuild `DashboardClient.tsx` on chart primitives |
| P5 Manual entry UX | dispatched | _fill in when launched_ | Tag wiring first, then restyle |
| P6 CRUD screens | merged | `worktree-agent-a0717a34abd80656e` (clean merge, no conflicts; re-verified build+lint on merged `main`) | Visual pass across 10 screens + Manage/More; Limits also gained real spent-vs-budget tracking (see P6 notes) |

When an agent finishes: merge its worktree branch, run `npm run build`/`lint` on the merged result yourself (an agent's own green build doesn't guarantee it still builds after merging with other concurrent agents' changes), update the phase's checklist in §4 to ✅ with the same level of detail as P1-P3 above, update this table's status to `merged`, and commit.

## 8. Reference facts

- Supabase project ref: `ifxgrybtyeqikxwkucpp`
- Vercel app URL: `https://fin-psi-umber.vercel.app/`
- Secrets live in `.env.local` (gitignored) / Vercel env vars — never commit them.
