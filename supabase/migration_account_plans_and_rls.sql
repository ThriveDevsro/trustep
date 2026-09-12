alter table companies
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'plus', 'team'));

drop policy if exists "Allow public read on requests" on requests;
drop policy if exists "Allow public insert on requests" on requests;
drop policy if exists "Allow public update on requests" on requests;
drop policy if exists "Allow public read on companies" on companies;

create policy "Users can read own company" on companies
  for select using (auth.uid() = id);

create policy "Users can update own company" on companies
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can read own requests" on requests
  for select using (auth.uid() = company_id);

create policy "Users can read own inboxes" on connected_inboxes
  for select using (auth.uid() = company_id);
