create table loan_disbursements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  date date not null default now(),
  amount double precision not null default 0,
  is_deductible boolean not null default true,
  label text not null default '',
  created_at timestamptz not null default now()
);

alter table loan_disbursements enable row level security;
create policy "loan_disbursements_owner" on loan_disbursements for all using (
  property_id in (select id from properties where user_id = (select auth.uid()))
);

-- Backfill: every property with an existing single-disbursement loan gets one
-- tranche row so computeFinancingOverview/computeTaxCurrentYear see the same
-- data as before — this migration changes no visible numbers by itself.
insert into loan_disbursements (property_id, date, amount, is_deductible, label)
select id, loan_start_date, loan_amount, true, 'Hauptauszahlung'
from properties
where loan_amount > 0;
