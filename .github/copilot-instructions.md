# Copilot Instructions for Fin

## Project shape
- Next.js 14 app-router project for a private personal finance journal.
- `app/` holds route segments and route-level loading states; most screens are thin wrappers around shared client components in `components/`.
- `components/` contains the main UI and client-side interactions; `lib/` holds finance logic, query keys, offline sync, Supabase helpers, and shared types.
- Supabase is the backend source of truth. Schema and RLS live in `supabase/migrations/`.
- PWA support is enabled through `next-pwa` and `components/PWARegister`.

## Commands
- `npm run dev` — start the app locally.
- `npm run build` — production build.
- `npm start` — run the built app.
- `npm run lint` — Next.js linting (`next lint`).
- Single test command: there is no dedicated test script in `package.json`.
- Supabase:
  - `npm run supabase:login`
  - `npm run supabase:link`
  - `npm run supabase:push`
- Local setup expects `.env.local` copied from `.env.example` with Supabase variables filled in.

## Architecture and data flow
- Server/client boundary matters: `app/layout.tsx` wraps the app with `Providers` and `PWARegister`; `components/Providers.tsx` owns the shared TanStack Query client.
- `components/AppShell.tsx` is the main authenticated shell: sidebar, sticky header, mobile nav, and `SyncManager` live there.
- Supabase client creation is centralized in `utils/supabase/client.ts` and `utils/supabase/server.ts`; both return `null` when env vars are missing.
- Offline behavior is implemented in `lib/offline-sync.ts`: writes queue to `localStorage`, then `SyncManager` flushes them when online/visible/periodically.
- Query invalidation is keyed through `lib/query-keys.ts`; reuse these keys when changing data that affects cached views.
- Domain types live in `lib/types.ts` and mirror the Supabase tables.

## Conventions
- Use the `@/*` import alias from `tsconfig.json` for local imports when it keeps paths cleaner.
- Keep page files thin; put reusable UI and client logic in `components/` rather than expanding route files.
- Prefer the existing shared page primitives (`CrudPage`, `SectionPage`) for consistent spacing and structure.
- Keep Supabase checks explicit: gate code paths on `isSupabaseConfigured()` and handle `null` clients.
- Preserve the existing table and RLS patterns in migrations: `user_id` ownership, `auth.uid()` checks, and `create policy "own rows only"`.
- Use the existing Tailwind theme tokens (`bg-*`, `text-*`, `border`, `accent`, etc.) instead of hard-coded colors when possible.
