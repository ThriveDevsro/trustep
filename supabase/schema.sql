-- Companies table
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  approver_email text not null,
  plan text not null default 'free' check (plan in ('free', 'plus', 'team')),
  created_at timestamptz default now()
);

-- Insert demo company
insert into companies (id, name, approver_email) values
  ('00000000-0000-0000-0000-000000000001', 'Demo s.r.o.', 'approver@example.com')
on conflict do nothing;

-- Requests table
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  submitted_by text not null,
  text text not null,
  risk_level text check (risk_level in ('low', 'medium', 'high')) not null,
  reasons text[] default '{}',
  recommendation text default '',
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  source text check (source in ('web', 'email', 'sms', 'call', 'image')) default 'web',
  phone_from text,
  external_id text unique,
  approver_token text unique not null,
  created_at timestamptz default now()
);

-- Connected inboxes table
create table if not exists connected_inboxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  provider text check (provider in ('gmail', 'outlook', 'imap')) not null,
  email_address text not null,
  display_name text,
  connection_method text check (connection_method in ('oauth', 'imap', 'forwarding')) not null default 'oauth',
  status text check (status in ('pending', 'connected', 'paused', 'error')) not null default 'pending',
  scan_mode text check (scan_mode in ('auto', 'manual', 'digest')) not null default 'auto',
  imap_host text,
  imap_port integer,
  imap_secure boolean default true,
  imap_username text,
  imap_password text,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_scope text,
  oauth_token_expires_at timestamptz,
  oauth_external_email text,
  oauth_subject text,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  request_id uuid references requests(id) on delete set null,
  channel text check (channel in ('slack', 'teams')) not null,
  destination text not null,
  source text check (source in ('web', 'email', 'sms', 'call', 'image')) not null,
  risk_level text check (risk_level in ('low', 'medium', 'high')) not null,
  status text check (status in ('sent', 'failed')) not null,
  submitted_by text not null,
  error_message text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table companies enable row level security;
alter table requests enable row level security;
alter table connected_inboxes enable row level security;
alter table alert_deliveries enable row level security;

create policy "Users can read own company" on companies
  for select using (auth.uid() = id);
create policy "Users can update own company" on companies
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can read own requests" on requests
  for select using (auth.uid() = company_id);
create policy "Users can read own inboxes" on connected_inboxes
  for select using (auth.uid() = company_id);
