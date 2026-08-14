-- Preferences table for user settings like quick-spend templates and defaults

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  quick_spend_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_preferences enable row level security;

drop policy if exists "own rows only" on user_preferences;
create policy "own rows only" on user_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists user_preferences_user_id_idx on user_preferences (user_id);
