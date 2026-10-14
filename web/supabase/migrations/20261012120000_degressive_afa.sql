-- Degressive AfA (§ 7 Abs. 5a EStG): Methode je Objekt und geplantes Wechseljahr zu linear.
-- depreciation_rate bleibt erhalten: bei degressiver AfA ist es der lineare Satz nach dem Wechsel.
alter table properties
  add column depreciation_method text not null default 'linear'
    check (depreciation_method in ('linear', 'degressiv_5a')),
  add column degressive_switch_year int
    check (degressive_switch_year is null or degressive_switch_year between 2000 and 2200);
