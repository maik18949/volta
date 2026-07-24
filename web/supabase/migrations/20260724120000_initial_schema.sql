-- web/supabase/migrations/20260724120000_initial_schema.sql

create type property_type as enum ('apartment', 'einfamilienhaus', 'mehrfamilienhaus', 'gewerbe', 'grundstuck', 'sonstiges');
create type acquisition_type as enum ('kauf', 'erbschaft', 'schenkung');
create type parking_type as enum ('nicht_vorhanden', 'tiefgarage', 'aussenstellplatz', 'garage');
create type heating_type as enum ('fernwarme', 'gas', 'ol', 'warmepumpe', 'pellet', 'elektro', 'sonstiges');
create type energy_class as enum ('a_plus_plus', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h');
create type property_condition as enum ('neubau', 'erstbezug', 'gepflegt', 'renovierungsbedurftig', 'sanierungsbedurftig');
create type property_status as enum ('vermietet', 'leerstand', 'mietgarantie');
create type extraordinary_cost_category as enum ('sonderumlage', 'reparatur', 'gutachter', 'rechtskosten', 'sonstiges');

create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  property_type property_type not null default 'apartment',
  acquisition_type acquisition_type not null default 'kauf',
  year_built int,
  notes text not null default '',

  living_area_sqm double precision not null default 0,
  usable_area_sqm double precision,
  land_area_sqm double precision,
  rooms double precision,
  bedrooms int,
  bathrooms int,
  floor_level int,
  has_balcony boolean not null default false,
  has_terrace boolean not null default false,
  has_garden boolean not null default false,
  has_basement boolean not null default false,
  basement_size_sqm double precision,
  has_fitted_kitchen boolean not null default false,
  parking_type parking_type not null default 'nicht_vorhanden',
  parking_count int not null default 0,
  heating_type heating_type,
  energy_efficiency_class energy_class,
  condition property_condition,
  last_renovation_year int,

  purchase_date date not null default now(),
  economic_transfer_date date not null default now(),
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
  warmmiete_monthly double precision,
  parking_rent_monthly double precision not null default 0,
  other_income_monthly double precision not null default 0,

  vacancy_rate_assumption double precision not null default 0.03,
  market_rent_per_sqm double precision,
  current_market_value double precision,

  hoa_fee_total_monthly double precision not null default 0,
  is_hoa_unit_split boolean not null default false,
  hoa_fee_recoverable_monthly double precision not null default 0,
  hoa_fee_maintenance_reserve_monthly double precision not null default 0,
  property_tax_annual double precision not null default 0,
  property_management_annual double precision not null default 0,
  property_insurance_annual double precision not null default 0,
  other_costs_monthly double precision not null default 0,

  hoa_fee_parking_total_monthly double precision not null default 0,
  is_hoa_parking_split boolean not null default false,
  hoa_fee_parking_recoverable_monthly double precision not null default 0,
  hoa_fee_parking_maintenance_reserve_monthly double precision not null default 0,
  property_tax_parking_annual double precision not null default 0,

  loan_amount double precision not null default 0,
  interest_rate double precision not null default 0,
  amortization_rate double precision not null default 0,
  fixed_interest_period_years int not null default 10,
  loan_start_date date not null default now(),
  monthly_mortgage double precision not null default 0,
  equity_contributed double precision not null default 0,
  broker_commission_agreement double precision not null default 0,

  land_value double precision not null default 0,
  building_value double precision not null default 0,
  depreciation_rate double precision not null default 0.02,
  marginal_tax_rate double precision not null default 0,

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties enable row level security;
create policy "properties_owner" on properties for all using (user_id = auth.uid());

create table status_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  date date not null default now(),
  status property_status not null default 'vermietet',
  income_actual_monthly double precision,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table status_entries enable row level security;
create policy "status_entries_owner" on status_entries for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create table extraordinary_costs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  cost_month date not null default now(),
  amount double precision not null default 0,
  category extraordinary_cost_category not null default 'sonstiges',
  description_text text,
  is_deductible boolean not null default true
);

alter table extraordinary_costs enable row level security;
create policy "extraordinary_costs_owner" on extraordinary_costs for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create table property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,
  is_cover_photo boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table property_photos enable row level security;
create policy "property_photos_owner" on property_photos for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create index status_entries_property_id_date_idx on status_entries (property_id, date);
create index extraordinary_costs_property_id_month_idx on extraordinary_costs (property_id, cost_month);
create index property_photos_property_id_idx on property_photos (property_id);
