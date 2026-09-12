alter table requests add column if not exists feedback text check (feedback in ('confirmed_fraud', 'false_positive'));
