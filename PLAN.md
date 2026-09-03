# Calm Ledger — Rebuild Master Plan

> **This is the canonical resume file.** A fresh session should read this file first, and only this file, before touching code. It tells you exactly what's done, what decisions are already settled (don't re-litigate them), and the next concrete action.

## 0. What this project is

A personal finance app for exactly one person (the owner, email-gated via `ALLOWED_EMAIL`). Hosted on Vercel, backed by Supabase. Transactions/tags/accounts are entered **manually** — there is no bank sync, and none is planned. The core value the app needs to deliver is: fast, low-friction manual entry, and a genuinely excellent analysis section that makes sense of the data.

This plan supersedes the old `plan.md`/`stages.md` (generic AI-drafted feature lists from an earlier session, kept for history in git but no longer authoritative). The prior app was functionally reasonable but visually and conceptually basic — flat dark theme, hand-rolled conic-gradient donuts, letter-only collapsed nav icons, no motion design. This rebuild is a full design + analysis overhaul, not a bug-fix pass.

## 1. Resume Here

**Current phase: P2 — Chart primitive library (not started)**

Next concrete action: build `components/charts/Sparkline.tsx` first (simplest, reused everywhere), then `AreaChart`, `DonutChart`, `BarChart`, `HeatmapCalendar`, `RadialProgress` — see P2 checklist below.

How to resume in a new session:
1. Read this file top to bottom (it's short).
2. Skim the last 1-2 entries in `PROGRESS.md` for session-level detail.
3. Run `git log --oneline -15` to see what's actually landed.
4. Pick up at the phase marked `in progress`, or start the next `not started` phase.

## 2. Decisions already made (do not re-litigate)

- **Backend stays Supabase, framework stays Next.js 14 (App Router) + TanStack Query.** It's already hosted, has working auth/RLS, and there's no reason to migrate infra for a single-user app. Effort goes into UI/UX and analysis depth, not backend churn.
- **Existing data is real and precious.** All schema changes are additive migrations only (new files under `supabase/migrations/`). Never edit or drop existing migrations/tables/columns.
- **Theme: dark-only, refined "Liquid Glass".** No light mode. One cohesive dark aesthetic, inspired by iOS's frosted/specular glass — depth via layered translucency, blur, soft inner/outer light, not flat cards with a border.
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

### P2 — Chart primitive library ⬜
Hand-built, SVG + framer-motion, styled to the glass system. Each is a real component with props, not one-off inline markup.
- [ ] `components/charts/Sparkline.tsx`
- [ ] `components/charts/AreaChart.tsx` (gradient fill, animated draw-in)
- [ ] `components/charts/DonutChart.tsx` (replace conic-gradient hack, animated arcs, drill-down capable)
- [ ] `components/charts/BarChart.tsx` (vertical + horizontal variants)
- [ ] `components/charts/HeatmapCalendar.tsx` (GitHub-style daily intensity grid)
- [ ] `components/charts/RadialProgress.tsx` (budget/goal rings, liquid-fill animation)

### P3 — Analysis section rebuild (flagship) ⬜
See §5 for the full feature backlog. Build order: Overview → Categories drill-down → Tags → Calendar heatmap → Comparisons (MoM/YoY) → Narrative insights → People/Goals tie-in.

### P4 — Dashboard rebuild ⬜
Rebuild `DashboardClient.tsx` on the new chart primitives + glass system; keep the widget show/hide concept but restyle it.

### P5 — Manual entry UX ⬜
`QuickAdd`/`QuickAddModal`/`TransactionsClient` (853 lines, biggest component) — tag-first fast entry, command-palette-driven add, keep offline-outbox behavior intact.

### P6 — Remaining screens visual pass ⬜
Accounts, Categories, Tags, People, Goals, Limits, Recurring rules, Calendar, What Happened, Settings — bring onto the new design system/primitives. Mostly mechanical once P1-P2 exist.

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

## 7. Reference facts

- Supabase project ref: `ifxgrybtyeqikxwkucpp`
- Vercel app URL: `https://fin-psi-umber.vercel.app/`
- Secrets live in `.env.local` (gitignored) / Vercel env vars — never commit them.
