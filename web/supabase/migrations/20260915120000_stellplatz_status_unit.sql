create type property_unit as enum ('wohnung', 'stellplatz');

alter table status_entries
  add column unit property_unit not null default 'wohnung';

insert into status_entries (property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, unit)
select property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, 'stellplatz'
from status_entries se
where se.unit = 'wohnung'
  and exists (
    select 1 from properties p
    where p.id = se.property_id and p.parking_type <> 'nicht_vorhanden'
  );
