-- Initial schema for Personal Finance Journal
-- Apply in Supabase SQL editor or via migration tooling.

create extension if not exists pgcrypto;

create table if not exists accounts (
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

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  parent_id uuid references categories(id),
  kind text not null check (kind in ('expense','income','both')),
  color text,
  icon text,
  is_essential boolean default null,
  archived boolean not null default false,
  sort_order int default 0
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null unique,
  color text
);

create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references accounts(id),
  category_id uuid references categories(id),
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  interval_count int not null default 1,
  day_of_month int,
  weekday int,
  start_date date not null,
  end_date date,
  next_run_date date not null,
  active boolean not null default true
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references accounts(id),
  transfer_account_id uuid references accounts(id),
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  category_id uuid references categories(id),
  note text,
  occurred_at timestamptz not null default now(),
  is_planned boolean default true,
  recurring_rule_id uuid references recurring_rules(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists transaction_tags (
  transaction_id uuid references transactions(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  avatar_color text,
  archived boolean default false
);

create table if not exists people_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  person_id uuid not null references people(id),
  type text not null check (type in ('lent','borrowed','shared_expense','reimbursement','settlement')),
  amount numeric(14,2) not null,
  note text,
  linked_transaction_id uuid references transactions(id),
  occurred_at timestamptz not null default now(),
  settled boolean not null default false
);

create table if not exists limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  scope text not null check (scope in ('category','tag','overall')),
  scope_ref_id uuid,
  period text not null check (period in ('weekly','monthly')),
  amount numeric(14,2) not null,
  active boolean not null default true
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  monthly_contribution numeric(14,2),
  target_date date,
  linked_account_id uuid references accounts(id),
  archived boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  amount numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  linked_transaction_id uuid references transactions(id)
);

alter table accounts enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table recurring_rules enable row level security;
alter table transactions enable row level security;
alter table transaction_tags enable row level security;
alter table people enable row level security;
alter table people_ledger enable row level security;
alter table limits enable row level security;
alter table goals enable row level security;
alter table goal_contributions enable row level security;

drop policy if exists "own rows only" on accounts;
drop policy if exists "own rows only" on categories;
drop policy if exists "own rows only" on tags;
drop policy if exists "own rows only" on recurring_rules;
drop policy if exists "own rows only" on transactions;
drop policy if exists "own rows only" on transaction_tags;
drop policy if exists "own rows only" on people;
drop policy if exists "own rows only" on people_ledger;
drop policy if exists "own rows only" on limits;
drop policy if exists "own rows only" on goals;
drop policy if exists "own rows only" on goal_contributions;

create policy "own rows only" on accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on tags for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on recurring_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on transaction_tags for all using (exists (select 1 from transactions where transactions.id = transaction_tags.transaction_id and transactions.user_id = auth.uid())) with check (exists (select 1 from transactions where transactions.id = transaction_tags.transaction_id and transactions.user_id = auth.uid()));
create policy "own rows only" on people for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on people_ledger for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on limits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows only" on goal_contributions for all using (exists (select 1 from goals where goals.id = goal_contributions.goal_id and goals.user_id = auth.uid())) with check (exists (select 1 from goals where goals.id = goal_contributions.goal_id and goals.user_id = auth.uid()));
