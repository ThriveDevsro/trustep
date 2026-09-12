create table if not exists public.phone_reports (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'suspected_scam' check (category in ('suspected_scam', 'fraud_confirmed', 'spam')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (phone_e164, user_id)
);

create index if not exists phone_reports_phone_e164_idx on public.phone_reports(phone_e164);

alter table public.phone_reports enable row level security;

create policy "Users can report a phone number as themselves"
  on public.phone_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read their own phone reports"
  on public.phone_reports for select
  to authenticated
  using (auth.uid() = user_id);
