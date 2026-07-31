alter table connected_inboxes
  add column if not exists imap_username text,
  add column if not exists imap_password text;
