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

alter table alert_deliveries enable row level security;
