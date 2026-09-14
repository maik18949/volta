alter table status_entries
  add column income_is_fixed_amount boolean not null default false,
  add column income_period_end_date date;
