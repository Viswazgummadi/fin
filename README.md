# Personal Finance Journal

## Local development
1. Copy `.env.example` to `.env.local`
2. Fill Supabase env vars
3. Install dependencies and run `npm run dev`

## Supabase migrations
The initial schema lives in `supabase/migrations/0001_initial_schema.sql`.

To push migrations from the repo:
1. Install Supabase CLI
2. Run `npm run supabase:login`
3. Run `npm run supabase:link`
4. Run `npm run supabase:push`

## Notes
- Keep secrets in `.env.local`
- Do not commit credential files
