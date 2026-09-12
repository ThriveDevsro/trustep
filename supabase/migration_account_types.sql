alter table companies add column if not exists account_type text not null default 'personal' check (account_type in ('personal', 'business'));

-- Existing accounts stay personal by default. Set account_type = 'business'
-- for workspaces that should later receive members and roles.
