create table if not exists training_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  mode text not null check (mode in ('daily', 'full')),
  score integer not null check (score between 0 and 100),
  caught_signals integer not null default 0,
  total_signals integer not null default 0,
  safe_actions integer not null default 0,
  total_scenarios integer not null default 1,
  created_at timestamptz not null default now()
);

alter table training_results enable row level security;
create policy "Users can read own training results" on training_results for select using (auth.uid() = company_id);
