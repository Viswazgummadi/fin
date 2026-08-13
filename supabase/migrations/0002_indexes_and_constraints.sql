-- Refinements for faster reads and safer transaction testing.

create index if not exists accounts_user_created_idx on accounts (user_id, created_at desc);
create index if not exists categories_user_sort_idx on categories (user_id, sort_order asc, name asc);
create index if not exists transactions_user_occurred_idx on transactions (user_id, occurred_at desc);
create index if not exists transactions_account_idx on transactions (account_id);
create index if not exists transactions_category_idx on transactions (category_id);
create index if not exists people_ledger_person_idx on people_ledger (person_id);
create index if not exists goals_user_created_idx on goals (user_id, created_at desc);
create index if not exists limits_user_active_idx on limits (user_id, active);
create index if not exists transaction_tags_transaction_idx on transaction_tags (transaction_id);
create index if not exists transaction_tags_tag_idx on transaction_tags (tag_id);
create index if not exists goal_contributions_goal_idx on goal_contributions (goal_id, occurred_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists transactions_set_updated_at on transactions;
create trigger transactions_set_updated_at
before update on transactions
for each row
execute function set_updated_at();
