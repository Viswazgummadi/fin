-- Optional helper for restoring full backups safely in the future.
-- Currently the app restores accounts, categories, and transactions directly from the browser.

create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
