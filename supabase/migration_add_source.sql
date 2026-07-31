-- Add source column to track where the request came from
alter table requests
  add column if not exists source text default 'web';

alter table requests
  drop constraint if exists requests_source_check;

alter table requests
  add constraint requests_source_check
    check (source in ('web', 'email', 'sms', 'call', 'image'));

-- Add phone_from for SMS/call sender number
alter table requests
  add column if not exists phone_from text;

alter table requests
  add column if not exists external_id text unique;

update requests
set source = 'email'
where source = 'gmail';
