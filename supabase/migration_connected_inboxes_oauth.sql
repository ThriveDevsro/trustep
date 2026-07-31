alter table if exists connected_inboxes
  add column if not exists oauth_access_token text,
  add column if not exists oauth_refresh_token text,
  add column if not exists oauth_scope text,
  add column if not exists oauth_token_expires_at timestamptz,
  add column if not exists oauth_external_email text,
  add column if not exists oauth_subject text;

drop policy if exists "Allow public read on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public insert on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public update on connected_inboxes" on connected_inboxes;
drop policy if exists "Allow public delete on connected_inboxes" on connected_inboxes;
