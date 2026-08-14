-- Additional indexes for people, goals, limits, recurring rules, and tags.

create index if not exists people_user_archived_idx on people (user_id, archived);
create index if not exists people_ledger_user_person_idx on people_ledger (user_id, person_id, occurred_at desc);
create index if not exists goals_user_archived_idx on goals (user_id, archived);
create index if not exists goal_contributions_goal_occurred_idx on goal_contributions (goal_id, occurred_at desc);
create index if not exists limits_user_active_idx on limits (user_id, active, period);
create index if not exists recurring_rules_user_active_idx on recurring_rules (user_id, active, next_run_date);
create index if not exists tags_user_name_idx on tags (user_id, name);
create index if not exists categories_user_archived_idx on categories (user_id, archived);
