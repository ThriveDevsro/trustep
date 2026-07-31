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

alter table connected_inboxes enable row level security;

drop policy if exists "Allow public read on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public insert on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public update on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public delete on connected_inboxes" on connected_inboxes;
