-- 021_campaign-columns.sql · sequence state on leads
alter table public.nectarpay_leads
  add column if not exists email_stage smallint not null default 0,
  add column if not exists last_emailed_at timestamptz;

create index if not exists idx_leads_campaign
  on public.nectarpay_leads (status, email_stage);

select count(*) filter (where emails <> '{}' and status = 'NEW') as sendable_new
from public.nectarpay_leads;
