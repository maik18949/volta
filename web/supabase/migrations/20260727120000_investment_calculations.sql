-- web/supabase/migrations/20260727120000_investment_calculations.sql

create table investment_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null default '',

  purchase_price_unit double precision not null default 0,
  purchase_price_parking double precision not null default 0,
  land_transfer_tax double precision not null default 0,
  notary_costs double precision not null default 0,
  land_registry_costs double precision not null default 0,
  agent_fee double precision not null default 0,
  appraisal_costs double precision not null default 0,
  renovation_modernization_costs double precision not null default 0,
  renovation_afa_eligible double precision not null default 0,

  cold_rent_monthly double precision not null default 0,
  parking_rent_monthly double precision not null default 0,
  other_income_monthly double precision not null default 0,
  vacancy_rate_assumption double precision not null default 0.03,

  loan_amount double precision not null default 0,
  interest_rate double precision not null default 0,
  amortization_rate double precision not null default 0,
  monthly_mortgage double precision not null default 0,
  loan_start_date date not null default now(),

  hoa_fee_total_monthly double precision not null default 0,
  hoa_fee_recoverable_monthly double precision not null default 0,
  hoa_fee_maintenance_reserve_monthly double precision not null default 0,
  property_management_annual double precision not null default 0,
  property_insurance_annual double precision not null default 0,
  other_costs_monthly double precision not null default 0,

  building_value double precision not null default 0,
  depreciation_rate double precision not null default 0.02,
  marginal_tax_rate double precision not null default 0,

  is_promoted boolean not null default false,
  promoted_property_id uuid references properties(id) on delete set null,
  promoted_at timestamptz,

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table investment_calculations enable row level security;
create policy "investment_calculations_owner" on investment_calculations for all using (
  (select auth.uid()) = user_id
);

create index investment_calculations_user_id_idx on investment_calculations (user_id, updated_at desc);
