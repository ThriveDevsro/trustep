create table if not exists public.trusted_identities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  email text,
  phone text,
  domain text,
  iban text,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null or domain is not null or iban is not null)
);

create index if not exists trusted_identities_company_id_idx on public.trusted_identities(company_id);
alter table public.trusted_identities enable row level security;

create policy "Workspace members can read trusted identities"
  on public.trusted_identities for select to authenticated
  using (company_id = auth.uid() or exists (
    select 1 from public.company_members m
  where m.company_id = trusted_identities.company_id and m.user_id = auth.uid() and m.status = 'active'
  ));

alter table public.requests
  add column if not exists trusted_identity_id uuid references public.trusted_identities(id) on delete set null,
  add column if not exists identity_status text check (identity_status in ('VERIFIED', 'IDENTITY_NOT_VERIFIED', 'DETAILS_CHANGED', 'STOP_AND_VERIFY')),
  add column if not exists identity_comparison jsonb;

create table if not exists public.trusted_identity_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null check (action in ('create')),
  proposed_identity jsonb not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  requested_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trusted_identity_change_requests_workspace_idx on public.trusted_identity_change_requests(company_id, status, created_at desc);
alter table public.trusted_identity_change_requests enable row level security;

create policy "Workspace members can read identity change requests"
  on public.trusted_identity_change_requests for select to authenticated
  using (company_id = auth.uid() or exists (
    select 1 from public.company_members m
    where m.company_id = trusted_identity_change_requests.company_id and m.user_id = auth.uid() and m.status = 'active'
  ));
