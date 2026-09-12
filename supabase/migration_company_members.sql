create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')) default 'member',
  status text not null check (status in ('invited', 'active')) default 'invited',
  invite_token uuid not null default gen_random_uuid() unique,
  user_id uuid,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

alter table company_members add column if not exists invite_token uuid default gen_random_uuid();
create unique index if not exists company_members_invite_token_key on company_members(invite_token);

alter table company_members enable row level security;
create policy "Company owners manage members" on company_members for all using (auth.uid() = company_id) with check (auth.uid() = company_id);
create policy "Members read own membership" on company_members for select using (auth.email() = email);
