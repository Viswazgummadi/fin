# Personal Finance Journal — Master Build Plan

> Read this whole file before writing code. This is the single source of truth for the project. Update the `PROGRESS` section at the bottom (or a separate `PROGRESS.md`, see §12) after every work session so a fresh agent context can resume without re-reading everything.

---

## 0. Product Philosophy

This is **not a budgeting app**. It's a personal money journal + analysis engine:
- Manual entry only (no bank sync, no auto-import)
- Private, single-user, no accounts/signup for anyone but you
- Fast enough to use every night for 5 minutes
- Analysis good enough that you *want* to open it, not just log into it
- Feels like OpenWebUI: dark, dense-but-clean, keyboard-friendly, fast, no marketing-site bloat

Design north star: **information density with calm typography** — like a terminal-grade finance tool, not a consumer bank app with cartoon icons.

---

## 1. Hosting Decision — Why NOT GitHub Pages

GitHub Pages only serves static files with no server, no database, and no private auth layer — anyone with the URL can view it unless you make the whole repo private (and even then, GH Pages sites from private repos are only free-gated on paid plans, and there's still no real per-user auth, just obscurity). For a money journal that's a bad trade.

**Recommended stack instead:**

| Layer | Choice | Why |
|---|---|---|
| Frontend hosting | **Vercel** (free tier) | Zero-config Next.js deploys, preview URLs, custom domain, HTTPS free |
| Backend + DB | **Supabase** (free tier) | Postgres + Auth + Row Level Security + instant REST/Realtime, generous free tier for single-user use |
| Auth | Supabase Auth, **email+password, single allowed email** | Real login screen, not obscurity. You can even skip email confirmation and hardcode allowed email in RLS |
| PWA | Next.js + `next-pwa` | Installable on phone home screen, works offline-ish for entry queueing |

**Alternative if you want zero external services / fully self-owned:**
- SQLite + a small self-hosted backend (Fly.io free tier, or a $4-6/mo VPS) with Litestream backups to Backblaze B2. More control, more maintenance. Only worth it if you specifically don't trust Supabase with financial data — otherwise Supabase's free tier is the pragmatic choice and RLS makes it genuinely private (only your authenticated user can read/write your rows).

This plan assumes **Vercel + Supabase**, but the code is written so DB access is isolated behind a data-access layer — swapping later is not a rewrite.

**Privacy guarantee mechanism:** Supabase Row Level Security policies scoped to `auth.uid() = user_id` on every table, PLUS the app only ever allows sign-up for one hardcoded email (or sign-up disabled entirely and you seed the one user manually in the Supabase dashboard). No public sign-up page in the UI at all.

---

## 2. Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript strict mode
- **DB/Auth/Storage:** Supabase (Postgres + Row Level Security + Auth)
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives) — gives OpenWebUI-like density for free
- **Charts:** Recharts for standard charts + D3 for the 1-2 custom/bespoke visualizations (calendar heatmap, Sankey-style money flow)
- **State/data fetching:** TanStack Query (React Query) for caching + optimistic updates on quick-entry
- **Forms:** React Hook Form + Zod validation
- **PWA:** `next-pwa` / native App Router service worker, manifest.json, installable
- **Dates:** date-fns
- **Deployment:** Vercel, connected to a **private** GitHub repo
- **Optional AI layer:** Claude API (via your own key) for narrative "what happened this month" summaries — strictly optional, phase 8, off by default so it never burns API credits without you asking

---

## 3. Design System (OpenWebUI-inspired)

### Palette (dark-first, light mode secondary)
```css
--bg-primary:    #0f0f10;   /* near-black canvas */
--bg-secondary:  #17171a;   /* cards / panels */
--bg-tertiary:   #202024;   /* hover / inputs */
--border:        #2a2a2f;
--text-primary:  #ececf0;
--text-secondary:#9a9aa2;
--text-muted:    #6b6b73;

--accent:        #10b981;   /* income / positive — emerald */
--accent-2:      #6366f1;   /* transfers / neutral — indigo */
--danger:        #f43f5e;   /* expense / negative — rose */
--warning:       #f59e0b;   /* near-limit — amber */

--radius: 10px;
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;  /* for all numbers */
```

**Key rule:** all monetary figures render in the mono font, tabular-nums, right-aligned in tables. This alone gives 50% of the "pro tool" feel.

### Layout
- Left sidebar (collapsible, icon-only on mobile → bottom nav instead): Dashboard, Add, Transactions, People, Goals, Limits, Analysis, Calendar, Settings
- Top bar: instant total balance (large, mono), account switcher, quick "+ Add" button always visible (floating action button on mobile)
- Cards use 1px borders not shadows (matches the flat OpenWebUI aesthetic)
- Micro-interactions: optimistic UI on add (transaction appears instantly, syncs in background), skeleton loaders, no spinners longer than 200ms without content

### Mobile vs Desktop
- Mobile: bottom tab bar (Dashboard / Add / Transactions / More), FAB for quick add, swipe-to-edit/delete on transaction rows
- Desktop: full sidebar, keyboard shortcuts (`n` = new transaction, `/` = search, `g d` = go dashboard, `g t` = go transactions, `esc` = close modal)
- Both: PWA installable, works from home screen with standalone display mode

---

## 4. Full Data Model (Postgres / Supabase)

```sql
-- USERS handled by Supabase Auth (auth.users). Everything below references auth.uid().

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  type text not null check (type in ('bank','cash','wallet','credit','other')),
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'INR',
  color text,
  icon text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  parent_id uuid references categories(id), -- subcategories
  kind text not null check (kind in ('expense','income','both')),
  color text,
  icon text,
  is_essential boolean default null, -- for essential vs optional analysis
  archived boolean not null default false,
  sort_order int default 0
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null unique,
  color text
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references accounts(id),
  transfer_account_id uuid references accounts(id), -- set only if type='transfer'
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  category_id uuid references categories(id),
  note text,
  occurred_at timestamptz not null default now(),
  is_planned boolean default true,       -- planned vs unplanned analysis
  recurring_rule_id uuid references recurring_rules(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz  -- soft delete for undo
);

create table transaction_tags (
  transaction_id uuid references transactions(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references accounts(id),
  category_id uuid references categories(id),
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  interval_count int not null default 1,       -- every N frequency units
  day_of_month int,                             -- for monthly
  weekday int,                                  -- for weekly
  start_date date not null,
  end_date date,                                 -- null = forever
  next_run_date date not null,
  active boolean not null default true
);

create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  avatar_color text,
  archived boolean default false
);

create table people_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  person_id uuid not null references people(id),
  type text not null check (type in ('lent','borrowed','shared_expense','reimbursement','settlement')),
  amount numeric(14,2) not null,
  note text,
  linked_transaction_id uuid references transactions(id), -- optional link to a real txn
  occurred_at timestamptz not null default now(),
  settled boolean not null default false
);

create table limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  scope text not null check (scope in ('category','tag','overall')),
  scope_ref_id uuid,  -- category_id or tag_id, null if overall
  period text not null check (period in ('weekly','monthly')),
  amount numeric(14,2) not null,
  active boolean not null default true
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  monthly_contribution numeric(14,2),
  target_date date,
  linked_account_id uuid references accounts(id), -- optional: track via a dedicated savings account
  archived boolean default false,
  created_at timestamptz not null default now()
);

create table goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  amount numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  linked_transaction_id uuid references transactions(id)
);

-- Row Level Security (apply to EVERY table above)
alter table accounts enable row level security;
create policy "own rows only" on accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- repeat identical policy for: categories, tags, transactions, transaction_tags (via join),
-- recurring_rules, people, people_ledger, limits, goals, goal_contributions
```

Indexes to add: `transactions(user_id, occurred_at desc)`, `transactions(account_id)`, `transactions(category_id)`, `people_ledger(person_id)`.

---

## 5. Feature Spec Detail (beyond your list — filling gaps)

### 5.1 Quick Add flow (the most important screen)
- Big numeric keypad-style input (mono font, huge) OR native numeric keyboard on mobile
- Quick chips: last-used amounts (`₹50 ₹100 ₹500`) auto-derived from your history, not hardcoded
- Type toggle: Expense / Income / Transfer (defaults to Expense, remembers last used)
- Category picker: shows your 6 most-recently-used categories as big tappable tiles first, "more" expands full list
- Autocomplete on note field: as you type "blin..." it suggests "Blinkit" and auto-fills category+tags used last time with that note (frequency-ranked)
- Tag input: chip-style multi-select, create-on-the-fly
- Date defaults to today but one tap opens a date picker (for the "log everything at night" workflow — let user backdate to earlier today or previous days easily, with a "yesterday" quick button)
- Save & Add Another (stays on screen, clears amount only, keeps category/tags if "pin" toggled)
- Undo toast after every save (5s window, then soft-deleted row is really committed — actually just keep soft-delete forever with an Undo History screen, simpler than a timer)

### 5.2 Duplicate last transaction
- Long-press (mobile) / right-click (desktop) any transaction row → "Duplicate" → opens quick-add prefilled, cursor in amount field

### 5.3 Offline usage
- Since it's manual entry, offline support means: queue transactions in IndexedDB when offline, sync when back online. Use TanStack Query's offline mutation queue or a simple custom outbox pattern. Show a small "3 pending sync" badge.

### 5.4 Analysis engine — the top-grade part

**Dashboard (home) shows, top to bottom:**
1. Total balance (all accounts) — huge mono number, tap to expand per-account breakdown
2. This month: Income / Spent / Saved, as a 3-stat row with sparkline trend vs last month
3. Spending velocity: "₹342/day avg this month, you're pacing ₹300 above last month"
4. Category breakdown: horizontal bar chart, top 8 categories + "other"
5. Recent transactions (last 10, link to full list)
6. Any limit warnings (amber/red banner if >80%/100% of a limit)
7. Goal progress mini-cards

**Dedicated Analysis page — the real depth:**
- **Where did my money go?** — Sankey diagram: Income sources → Total → Category buckets → (optionally) subcategory. This is the signature visual, worth building with D3.
- **Category trend over time** — stacked area chart, month-by-month, toggle categories on/off
- **Month-to-month comparison** — side-by-side bar chart, current vs previous, % change per category, auto-flag "this category is unusually high" using a simple z-score against your trailing 3-month average (>1.5 std dev = flag)
- **Weekday vs weekend** — small multiple bar chart, avg spend per weekday
- **Essential vs optional** — donut chart, driven by the `is_essential` flag on categories (settable per-category, with an "unclassified" bucket you get nudged to fill in)
- **Planned vs unplanned** — donut chart, driven by `is_planned` flag set at entry time (default true, toggle off for impulse buys)
- **Account-wise spending** — which account bleeds money fastest
- **Biggest expenses** — sorted table, top 20 in period, with quick jump-to-transaction
- **Most frequent expenses** — grouped by note/category, count + total, surfaces "you've bought coffee 34 times this month"
- **3-month rolling average per category** — table view, current vs avg, delta %
- **Calendar heatmap** — GitHub-contribution-style grid, darker = more spent that day, click a day → opens "What Happened?" page for that date

**"What Happened?" page (your favorite feature):**
- Date picker (defaults to today)
- Summary strip: Income / Spent / Transferred for that day
- Full transaction list for the day, grouped by category with subtotals
- Any people-ledger events that day ("You gave Rahul ₹500")
- Any goal contributions that day
- Prev/Next day arrows for quick browsing (like a journal, literally flip through days)

### 5.5 Quick actions / menus
- Quick Add stays the primary fast-entry surface
- Mobile bottom nav keeps frequent destinations one tap away
- Secondary tools live in the More menu (Tags, Recurring Rules, People, Goals, Limits, Settings)
- Optional dashboard action cards can surface common flows without creating new routes
- No separate forecasting page; planning is kept inside existing screens and summaries

### 5.6 Limits
- Per category/tag/overall, weekly or monthly
- Progress bar per limit: spent / limit, color shifts green→amber(80%)→red(100%+)
- "Overspending history" — a log of periods where a limit was breached, kept even after the period rolls over, so you can see "I blew my snacks budget 4 of the last 6 months"

### 5.7 Goals
- Progress bar + "at current contribution rate, you'll hit this in X months" computed from `(target - current) / avg_monthly_contribution_last_3mo`
- Manual "add contribution" button, or auto-link to a dedicated savings account's inflows

### 5.8 People
- Per-person page: running ledger, net outstanding computed as `sum(lent) + sum(shared_expense_owed_to_you) - sum(borrowed) - sum(reimbursement_paid)`, clearly signed
- "Settle up" action: creates a settlement entry and optionally a real transaction (money actually moving between your account and... well it's just recording, no real payment integration)
- Distinguish the four types clearly in the UI with color-coded pills

### 5.9 Search & filters
- Global search (keyboard shortcut `/`): searches notes, tags, category names, people names, amounts
- Filter bar on Transactions page: date range, account(s), category(ies), tag(s), type, amount range, essential/optional, planned/unplanned — filters are combinable and shareable via URL query params (so you can bookmark "this month's Blinkit spending")

### 5.10 Export/Import
- Export: full JSON dump (all tables, your data only) + CSV export per view (e.g. export current filtered transaction list)
- Import: JSON re-import (for migrating/backup restore), with a dry-run preview before committing

---

## 6. Information Architecture / Routes

```
/                     → Dashboard
/add                  → Quick add (also a modal accessible from anywhere)
/transactions         → Full list, filters, search
/transactions/[id]    → Edit single transaction
/whathappened         → "What Happened?" day journal view
/calendar             → Calendar heatmap view
/analysis             → The deep analysis page (tabs: Flow / Trends / Comparisons / Patterns)
/limits                → Limits management + progress
/goals                → Goals list + detail
/people                → People list
/people/[id]           → Person ledger detail
/accounts              → Manage accounts (add/edit/archive, transfer money)
/categories             → Manage categories/subcategories
/settings               → Export/import, theme, currency, keyboard shortcuts help
/login                  → Single-user login (no signup link shown)
```

---

## 7. Build Phases (for the coding agent, sequential, each independently shippable)

> **Agent instructions:** Work one phase at a time. After finishing a phase, update `PROGRESS.md` (§12) with what was completed, what broke, and what's next, then STOP and wait rather than barreling into the next phase — this keeps API usage predictable per session.

### Phase 0 — Project Scaffold
- Next.js 14 + TS + Tailwind + shadcn/ui init
- Supabase project setup, env vars, client helper (`lib/supabase.ts`, server + browser variants)
- Deploy empty shell to Vercel, connect private GitHub repo, confirm CI/CD works
- Set up design tokens (§3) in `globals.css` / `tailwind.config.ts`
- **Done when:** blank styled app is live at a Vercel URL, dark mode default works

### Phase 1 — Auth + Accounts
- Login page (email+password via Supabase Auth), no public signup UI
- Middleware to protect all routes except `/login`
- Accounts CRUD (add/edit/archive), opening balance, account list UI
- Instant total balance computation (sum of opening_balance + all transactions per account)
- **Done when:** you can log in, add 2+ accounts, see a (zero) total balance

### Phase 2 — Core Transactions
- Full schema migration (§4) applied via Supabase migrations
- Transaction CRUD: add/edit/delete(soft)/undo
- Categories CRUD with subcategories
- Tags CRUD, multi-tag per transaction
- Transaction list page with basic table, mono-number formatting
- Transfer between accounts (special type, updates both account balances)
- **Done when:** you can log income/expense/transfer, edit, soft-delete+undo, see them listed

### Phase 3 — Fast Daily Entry
- Quick Add screen (§5.1): keypad input, quick chips, recent categories, note autocomplete, tag chips
- Duplicate last transaction
- Offline queue (IndexedDB outbox + sync)
- PWA manifest + service worker, installable on mobile
- **Done when:** entering a transaction takes <10 seconds, works installed on your phone, survives airplane mode

### Phase 4 — Recurring, People, Limits, Goals
- Recurring rules engine: a scheduled function (Supabase Edge Function on a cron, or a client-side "catch up on load" check) that materializes due recurring transactions
- People + people_ledger CRUD, per-person page with net outstanding
- Limits CRUD + progress bars + overspending history log
- Goals CRUD + progress + "time to reach" calculation
- **Done when:** all four sub-features are usable end to end with real data

### Phase 5 — Analysis Engine Part 1 (Dashboard + Calendar)
- Dashboard assembly (§5.4 dashboard section)
- Calendar heatmap (D3 or a lightweight lib), click-through to What Happened
- "What Happened?" page (§5.4)
- **Done when:** dashboard tells a real story about your actual data, calendar/day-journal flow works

### Phase 6 — Analysis Engine Part 2 (Deep Analysis Page)
- Sankey money-flow diagram (D3)
- Category trend stacked area, month-to-month comparison, weekday/weekend, essential/optional, planned/unplanned donuts
- Biggest/most-frequent expense tables
- 3-month rolling average + anomaly flagging (z-score)
- **Done when:** `/analysis` page fully matches §5.4 spec

### Phase 7 — Search, Export/Import, Polish
- Quick actions / menus (§5.5)
- Global search + shareable filter URLs
- JSON/CSV export, JSON import with dry-run
- Keyboard shortcuts (desktop), swipe actions (mobile)
- Accessibility pass, empty states, error states, loading skeletons everywhere
- **Done when:** app feels finished — no dead ends, no unstyled states

### Phase 8 — Optional AI Narrative Layer (off by default)
- A settings toggle "Enable AI monthly summary"
- On-demand button (never automatic/scheduled) that sends your month's aggregated stats (not raw transactions, to minimize tokens) to Claude API with your own key, gets back a short narrative summary
- Cache the result so re-viewing doesn't re-call the API
- **Done when:** toggle exists, works only when explicitly triggered, clearly shows "this used your API key"

---

## 8. API Budget / Agent Session Discipline

Since API usage is limited, structure each coding-agent session like this:
1. Agent reads `PROGRESS.md` first, not this whole master file every time (this file is the spec of record, `PROGRESS.md` is the resumable state)
2. Agent works exactly one phase (or one clearly-scoped half-phase if a phase is large) per session
3. Agent commits + pushes at the end of every working chunk, not just end of session — so partial progress is never lost to a session cutoff
4. Agent updates `PROGRESS.md` with: what's done, what's tested, what's broken/TODO, exact next step to resume
5. Avoid re-generating boilerplate the agent already wrote — point it at existing files to edit rather than regenerate from scratch

---

## 9. Testing Approach (lightweight, since it's solo/manual-entry app)
- Vitest for pure functions (balance calc, anomaly z-score, goal ETA calc) — these are the places bugs would silently corrupt your financial picture, worth real unit tests
- Manual QA checklist per phase (kept in PROGRESS.md) rather than full E2E test suite — not worth the API budget for a single-user app

---

## 10. Security Checklist
- [ ] RLS enabled + policy on every table, verified with a second dummy Supabase user that it truly can't see your rows
- [ ] No public signup route exposed in UI
- [ ] Supabase service_role key never shipped to client, only anon key + RLS
- [ ] Env vars in Vercel dashboard, never committed
- [ ] Repo set to Private on GitHub
- [ ] Optional: Vercel deployment protection (password) as a second layer in front of the whole app

---

## 11. Nice-to-haves (post-v1, not blocking)
- Multi-currency support if needed later
- Voice-to-transaction ("spent 500 on snacks" parsed via a small NLU pass)
- Widget/shortcut for even-faster mobile entry (iOS/Android home screen shortcut deep-linking to `/add`)
- Yearly review page (like a "Spotify Wrapped" for your money)

---

## 12. PROGRESS TRACKER

> Keep this section (or a synced `PROGRESS.md` in the repo root) updated after every session. Format:

```
### Session N — [date]
Phase worked on: 
Completed:
- 
Broken / TODO:
- 
Next exact step:
- 
```

### Session 0 — not started
Phase worked on: none yet
Completed: n/a
Broken / TODO: n/a
Next exact step: Run Phase 0 (project scaffold + deploy empty shell)

---

## 13. Current Execution Plan (2025-08-15)

Work these in order and update both this file and `PROGRESS.md` after each chunk.

1. **Manual QA nav flow on desktop/mobile** — `in progress`
   - Acceptance: desktop sidebar, mobile bottom nav, header quick spend, `/add` redirect, and route loading feel are manually verified
   - Implementation support completed:
     - Dashboard nav is now canonicalized to `/` in the shell nav/header
     - Dashboard active-state now works for both `/` and `/dashboard`
     - Nav links now expose `aria-current="page"` for clearer active-state QA/accessibility
   - Manual QA checklist:
     - Desktop: logo returns to dashboard, active nav state follows route, sidebar collapse persists after refresh, quick spend modal opens/closes cleanly, `/add` lands on transactions, loading skeletons appear during route switches
     - Mobile: bottom nav highlights the current route, `More` links fan out correctly, quick spend stays reachable, safe-area spacing is intact, no nav overlap with page content, `/add` still lands on transactions
   - Exit rule: if QA reveals latency or flow friction, fix that before starting item 2

2. **Paginate or date-window transactions** — `done`
   - Implemented as monthly date-windowing on `/transactions`
   - Initial server load is now bounded to the current month instead of a large generic list
   - Month-to-month switching now uses React Query cached client fetching for the transactions page
   - Added a proper post-delete undo surface instead of a dead per-row undo button

3. **Move more pages to React Query cached client fetching after initial shell** — `done`
   - Dashboard, Analysis, Calendar, and What Happened now load after the shell with React Query client caching
   - Shared query keys now let quick-spend and transaction mutations invalidate those cached views cleanly
   - Add-only route/menu duplication has been removed so entry stays focused on header Quick + full Transactions form
   - Goal met: repeated protected-route server fetch cost is reduced on the main read-heavy views

4. **Later: quick-spend sync to Supabase + offline queue and take full control** — `deferred`
   - Fold quick-spend config into Supabase
   - Add an offline outbox/queue for transaction mutations
   - Keep this after nav + transactions + cached fetching so baseline UX is already fast
