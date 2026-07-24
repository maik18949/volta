# Immobilien Datenmodell v2.0

Zentrales Datenmodell für privates Immobilienmanagement.
Optimiert für: Portfolioübersicht · Renditeberechnung · Cashflowanalyse · Steuer · Realität vs. Prognose

---

## Entitäten-Übersicht

```
Portfolio
└── Immobilie[]
    ├── 1. Stammdaten
    ├── 2. Objektdaten
    ├── 3. Kauf & Kaufnebenkosten
    ├── 4. Mieteinnahmen (Prognose)
    ├── 5. Laufende Kosten
    ├── 6. Finanzierung
    ├── 7. AfA & Steuer
    ├── 8. Statushistorie[]          ← NEU
    ├── 9. Außerordentliche Kosten[] ← NEU
    └── 10. KPI System (berechnet)

Mietgarantie (optional, 1:1 zu Immobilie)
InvestmentRechner (eigenständig, promotable zu Immobilie)
```

---

## 1. Stammdaten

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `name` | String | "ETW Dresden Neustadt" | ✓ |
| `address` | String | "Johann-Meyer-Straße 7b" | ✓ |
| `city` | String | "Dresden" | ✓ |
| `state` | String | "Sachsen" | ✓ |
| `postal_code` | String | "01097" | ✓ |
| `property_type` | Enum | Apartment / Haus / MFH / Gewerbe / Grundstück | ✓ |
| `acquisition_type` | Enum | Kauf / Erbschaft / Schenkung / Kauf+Renovierung | ✓ |
| `year_built` | Int | 1998 | — |
| `notes` | Text | Freitext | — |

### Enum-Werte: `property_type`
`Apartment` · `Einfamilienhaus` · `Mehrfamilienhaus` · `Gewerbe` · `Grundstück` · `Sonstiges`

### Enum-Werte: `acquisition_type`
`Kauf` · `Erbschaft` · `Schenkung` · `Kauf_und_Renovierung` · `Neubau`

---

## 2. Objektdaten

### Felder (manuelle Eingabe)

| Feldname | Typ | Relevant für | Pflicht |
|---|---|---|---|
| `living_area_sqm` | Decimal | Alle Typen | ✓ |
| `usable_area_sqm` | Decimal | MFH, Gewerbe, Haus | — |
| `land_area_sqm` | Decimal | Haus, MFH, Grundstück | — |
| `rooms` | Decimal | Alle | — |
| `bedrooms` | Int | Apartment, Haus | — |
| `bathrooms` | Int | Alle | — |
| `floor_level` | Int | Apartment | — |
| `has_balcony` | Bool | Apartment, Haus | — |
| `has_terrace` | Bool | Apartment, Haus | — |
| `has_garden` | Bool | Haus, MFH | — |
| `has_basement` | Bool | Alle | — |
| `basement_size_sqm` | Decimal | Wenn has_basement = true | — |
| `has_fitted_kitchen` | Bool | Apartment, Haus | — |
| `parking_type` | Enum | Alle | — |
| `parking_count` | Int | Alle | — |
| `heating_type` | Enum | Alle | — |
| `energy_efficiency_class` | Enum | Alle | — |
| `condition` | Enum | Alle | — |
| `last_renovation_year` | Int | Alle | — |

### Enum-Werte

**parking_type:** `Keiner` · `Tiefgarage` · `Außenstellplatz` · `Carport` · `Doppelparker` · `Garage`

**heating_type:** `Fernwärme` · `Gas` · `Öl` · `Wärmepumpe` · `Pellet` · `Elektro` · `Sonstiges`

**energy_efficiency_class:** `A+` · `A` · `B` · `C` · `D` · `E` · `F` · `G` · `H`

**condition:** `Neubau` · `Erstbezug` · `Gepflegt` · `Renovierungsbedürftig` · `Sanierungsbedürftig`

---

## 3. Kauf & Kaufnebenkosten

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `purchase_date` | Date | 2025-09-11 | ✓ |
| `economic_transfer_date` | Date | 2026-02-01 | ✓ |
| `purchase_price_unit` | Currency | 263.600 € | ✓ |
| `purchase_price_parking` | Currency | 15.000 € | — |
| `land_transfer_tax` | Currency | 15.323 € | — |
| `notary_costs` | Currency | 3.631,96 € | — |
| `land_registry_costs` | Currency | 1.180 € | — |
| `agent_fee` | Currency | 0 € | — |
| `appraisal_costs` | Currency | 0 € | — |
| `renovation_modernization_costs` | Currency | 0 € | — |
| `renovation_afa_eligible` | Currency | 0 € | — |

> **Hinweis `economic_transfer_date`:** Steuertechnisch maßgeblicher Zeitpunkt (nicht Notartermin). Steuert AfA-Beginn, Werbungskosten-Abgrenzung und Realität-Berechnung.

> **Hinweis `renovation_afa_eligible`:** Nur aktivierungspflichtige Renovierungen erhöhen die AfA-Basis. Sofort abziehbare Erhaltungsaufwendungen hier nicht eintragen.

### Berechnete Felder

```
purchase_price =
  purchase_price_unit + purchase_price_parking

closing_costs_total =
  land_transfer_tax +
  notary_costs +
  land_registry_costs +
  agent_fee +
  appraisal_costs

total_investment =
  purchase_price + closing_costs_total + renovation_modernization_costs

closing_costs_ratio =
  closing_costs_total / purchase_price

purchase_price_per_sqm =
  purchase_price_unit / living_area_sqm

investment_per_sqm =
  total_investment / living_area_sqm
```

---

## 4. Mieteinnahmen (Prognose)

Dieser Block beschreibt den **Soll-Zustand** bei Vollvermietung. Basis für alle Rendite-KPIs.

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `cold_rent_monthly` | Currency | 950 € | ✓ |
| `parking_rent_monthly` | Currency | 48 € | — |
| `other_income_monthly` | Currency | 0 € | — |
| `service_charge_recoverable_monthly` | Currency | 292 € | — |
| `vacancy_rate_assumption` | Percent | 3% | — |
| `rent_market_sqm` | Currency | 13,50 € | — |

### Berechnete Felder

```
cold_rent_yearly = cold_rent_monthly * 12
parking_rent_yearly = parking_rent_monthly * 12
other_income_yearly = other_income_monthly * 12

gross_income_monthly =
  cold_rent_monthly + parking_rent_monthly + other_income_monthly

gross_income_yearly = gross_income_monthly * 12

warm_rent_monthly =
  cold_rent_monthly + service_charge_recoverable_monthly

vacancy_loss_yearly =
  gross_income_yearly * vacancy_rate_assumption

effective_gross_income_yearly =
  gross_income_yearly - vacancy_loss_yearly

rent_per_sqm_cold =
  cold_rent_monthly / living_area_sqm

rent_market_monthly =
  rent_market_sqm * living_area_sqm

rent_uplift_potential_yearly =
  (rent_market_monthly * 12) - cold_rent_yearly

rent_uplift_potential_ratio =
  rent_uplift_potential_yearly / cold_rent_yearly
  [nur wenn cold_rent_yearly > 0]
```

---

## 5. Laufende Kosten

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `hoa_fee_total_monthly` | Currency | 417 € | ✓ |
| `hoa_fee_recoverable_monthly` | Currency | 292 € | ✓ |
| `property_tax_annual` | Currency | 205 € | ✓ |
| `property_management_annual` | Currency | 396 € | — |
| `maintenance_reserve_monthly` | Currency | 34,76 € | — |
| `property_insurance_annual` | Currency | 0 € | — |
| `other_costs_monthly` | Currency | 0 € | — |

> **Hinweis Hausgeld:** Bei WEG-Immobilien enthält `hoa_fee_total_monthly` bereits die Instandhaltungsrücklage. `maintenance_reserve_monthly` nur zusätzlich befüllen wenn separat außerhalb der WEG anfallend.

> **Hinweis Gebäudeversicherung:** Bei WEG-Immobilien in `hoa_fee_total_monthly` enthalten — `property_insurance_annual` nur für Einzelobjekte ohne WEG.

### Berechnete Felder

```
hoa_fee_non_recoverable_monthly =
  hoa_fee_total_monthly - hoa_fee_recoverable_monthly

property_tax_monthly =
  property_tax_annual / 12

property_management_monthly =
  property_management_annual / 12

property_insurance_monthly =
  property_insurance_annual / 12

operating_costs_recoverable_monthly =
  hoa_fee_recoverable_monthly +
  property_tax_monthly +
  property_insurance_monthly

operating_costs_non_recoverable_monthly =
  hoa_fee_non_recoverable_monthly +
  maintenance_reserve_monthly +
  property_management_monthly +
  other_costs_monthly

operating_costs_non_recoverable_yearly =
  operating_costs_non_recoverable_monthly * 12

operating_costs_total_yearly =
  (operating_costs_recoverable_monthly + operating_costs_non_recoverable_monthly) * 12

operating_expense_ratio =
  operating_costs_total_yearly / effective_gross_income_yearly
  [nur wenn effective_gross_income_yearly > 0]
  [Branchenstandard: alle Bewirtschaftungskosten inkl. umlagefähiger Anteile]
```

---

## 6. Finanzierung

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `loan_amount` | Currency | 230.000 € | ✓ |
| `interest_rate` | Percent | 4,3% | ✓ |
| `amortization_rate` | Percent | 1,0% | ✓ |
| `fixed_interest_period_years` | Int | 10 | ✓ |
| `loan_start_date` | Date | 2025-10-01 | ✓ |
| `monthly_mortgage_actual` | Currency | 1.242,85 € | — |
| `remaining_debt_current` | Currency | 229.500 € | — |

> **Hinweis `monthly_mortgage_actual`:** Überschreibt die berechnete Rate falls Bankrate leicht abweicht (z.B. durch Effektivzins-Rundung). Leer lassen = berechneter Wert wird verwendet.

> **Hinweis `remaining_debt_current`:** Manueller Abgleich laut Kontoauszug. Dient als Kontrollwert gegen die dynamische Berechnung.

### Berechnete Felder

```
interest_monthly_calc =
  loan_amount * (interest_rate / 12)

principal_monthly_calc =
  loan_amount * (amortization_rate / 12)

monthly_mortgage_calc =
  interest_monthly_calc + principal_monthly_calc

monthly_mortgage =
  IF monthly_mortgage_actual > 0
    THEN monthly_mortgage_actual
    ELSE monthly_mortgage_calc

debt_service_annual =
  monthly_mortgage * 12

interest_annual =
  interest_monthly_calc * 12

principal_annual =
  principal_monthly_calc * 12

fixed_interest_end_date =
  loan_start_date + fixed_interest_period_years

equity_used =
  total_investment - loan_amount

remaining_debt(t) =                         ← dynamisch, t = Monate seit loan_start_date
  loan_amount * (1 + interest_rate/12)^t
  - monthly_mortgage * ((1 + interest_rate/12)^t - 1) / (interest_rate/12)

ltv_ratio =
  remaining_debt(heute) / total_investment
```

---

## 7. AfA & Steuer

### Felder (manuelle Eingabe)

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `land_value` | Currency | 50.600 € | ✓ |
| `building_value` | Currency | 228.000 € | ✓ |
| `depreciation_rate` | Percent | 3,84% | ✓ |
| `marginal_tax_rate` | Percent | 42% | ✓ |
| `land_guideline_value_sqm` | Currency | 745 €/m² | — |

> **Hinweis `land_value` / `building_value`:** Absolute Werte aus dem Regierungs-Excel (Sachwertverfahren). Beide Werte sollten sich zu `purchase_price` (inkl. Stellplatz, sofern wirtschaftlich verbunden) addieren.

> **Hinweis Stellplatz & AfA:** `purchase_price_parking` nur befüllen wenn der Stellplatz wirtschaftlich mit der Wohnung verbunden ist (gleicher Mieter, selbes WEG-Gebäude) und im Sachwertverfahren bereits enthalten ist. Ein separates Grundbuchblatt schließt den wirtschaftlichen Nutzungszusammenhang nicht aus. Nicht verbundene Stellplätze als separates Objekt anlegen.

> **Hinweis `depreciation_rate`:** Standard 2% (ab 1925), 2,5% (vor 1925), oder individuell per Gutachten (z.B. 3,84% bei verkürzter Restnutzungsdauer). Gutachten-Satz ist steuerlich günstiger aber erfordert Sachverständigengutachten.

### Berechnete Felder

```
building_share_ratio =
  building_value / purchase_price

land_share_ratio =
  land_value / purchase_price

afa_basis =
  building_value +
  (closing_costs_total * building_share_ratio) +
  renovation_afa_eligible

depreciation_yearly =
  afa_basis * depreciation_rate

depreciation_monthly =
  depreciation_yearly / 12

afa_start_month =
  economic_transfer_date (erster voller Monat)

depreciation_yearly_prorated =             ← im Erwerbsjahr anteilig
  depreciation_monthly * verbleibende_Monate_im_Jahr
```

### Steuereffekt-Berechnung (Prognose, jährlich)

```
taxable_income_vv_yearly =
  effective_gross_income_yearly
  - operating_costs_non_recoverable_yearly
  - interest_annual
  - depreciation_yearly

tax_effect_yearly =
  taxable_income_vv_yearly * marginal_tax_rate * (-1)
  [positiv wenn Verlust → Steuererstattung]

tax_effect_monthly =
  tax_effect_yearly / 12
```

---

## 8. Statushistorie (Realität)

Eigene Entität — eine Immobilie hat beliebig viele Statuseinträge.

### Felder

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `status_from` | Date | 2026-02-01 | ✓ |
| `status` | Enum | Mietgarantie | ✓ |
| `income_actual_monthly` | Currency | 998 € | ✓ |
| `notes` | String | "Mietgarantie Cosona" | — |

### Enum-Werte: `status`
`Vermietet` · `Leerstand_Mietgarantie` · `Leerstand` · `Eigennutzung` · `Renovierung`

### Logik

```
Aktueller Status = letzter Eintrag in Statushistorie (nach status_from sortiert)

Für jeden Kalendermonat M:
  aktiver_status = Status dessen status_from ≤ M und kein neuerer Eintrag existiert
```

### Validierungsregel: Erster Statuseintrag

> Der erste Eintrag in der Statushistorie MUSS `status_from = economic_transfer_date` haben.
> Monate vor dem ersten Statuseintrag sind undefiniert und werden aus allen Berechnungen ausgeschlossen.

### Onboarding-Flow: economic_transfer_date in der Vergangenheit

Wenn beim Anlegen eines Objekts `economic_transfer_date` in der Vergangenheit liegt, führt die App einen Pflicht-Onboarding-Schritt durch:

```
1. Hinweis: "Deine Immobilie hat ein Übergangsdatum in der Vergangenheit.
             Bitte erfasse den bisherigen Nutzungsverlauf."

2. Nutzer legt Statuseinträge an, beginnend ab economic_transfer_date
   → Mindestens ein Eintrag ab economic_transfer_date erforderlich
   → Weitere Einträge für Statuswechsel (z.B. Leerstand → Vermietet)

3. Speichern erst möglich wenn erster Eintrag = economic_transfer_date gesetzt
```

---

## 9. Außerordentliche Kosten (Realität)

Eigene Entität — einmalige oder unregelmäßige Kosten pro Monat.

### Felder

| Feldname | Typ | Beispiel | Pflicht |
|---|---|---|---|
| `cost_month` | Date (YYYY-MM) | 2026-04 | ✓ |
| `amount` | Currency | 1.500 € | ✓ |
| `category` | Enum | Sonderumlage | ✓ |
| `description` | String | "WEG Sonderumlage Dach" | — |

### Enum-Werte: `category`
`Sonderumlage` · `Reparatur` · `Gutachter` · `Rechtskosten` · `Sonstiges`

---

## 10. KPI System

### Cashflow-Formel pro Monat (Realität)

Je nach aktivem Status für Monat M:

| Position | Vermietet | Leerstand_Mietgarantie | Leerstand |
|---|---|---|---|
| Einnahmen | `income_actual_monthly` | `income_actual_monthly` | 0 |
| Kreditrate | `−monthly_mortgage` | `−monthly_mortgage` | `−monthly_mortgage` |
| Nicht umlagefähige Kosten | `−operating_costs_non_recoverable_monthly` | `−operating_costs_non_recoverable_monthly` | `−operating_costs_non_recoverable_monthly` |
| Umlagefähige Kosten | 0 (Mieter trägt) | `−operating_costs_recoverable_monthly` | `−operating_costs_recoverable_monthly` |
| Außerordentliches | `−Summe für M` | `−Summe für M` | `−Summe für M` |
| **Cashflow vor Steuer** | Σ | Σ | Σ |
| Steuereffekt (anteilig) | `tax_effect_monthly` | `tax_effect_monthly` | `tax_effect_monthly` |
| **Cashflow nach Steuer** | Σ | Σ | Σ |

> **Hinweis:** `operating_costs_recoverable_monthly` enthält umlagefähige Kosten (Grundsteuer, Gebäudeversicherung, umlagefähiger Hausgeld-Anteil) — bei Vermietung trägt der Mieter diese. `operating_costs_non_recoverable_monthly` enthält nicht-umlagefähige Kosten (Verwaltung, Instandhaltungsrücklage, nicht-umlagefähiger Hausgeld-Anteil) — diese trägt der Eigentümer immer.

> **Hinweis Eigennutzung / Renovierung:** Werden wie `Leerstand` behandelt — `income_actual_monthly = 0`, Eigentümer trägt umlagefähige Kosten vollständig. Steuerlich: Eigennutzung erzeugt kein V+V-Ergebnis für diese Monate.

---

### Prognose-KPIs (statisch, immer sichtbar)

```
gross_yield =
  (cold_rent_yearly + parking_rent_yearly) / purchase_price

net_yield =
  net_operating_income_yearly / total_investment

cap_rate =
  net_operating_income_yearly / purchase_price

net_operating_income_yearly =
  effective_gross_income_yearly - operating_costs_non_recoverable_yearly

net_operating_income_monthly =
  net_operating_income_yearly / 12

cashflow_after_debt_yearly =
  net_operating_income_yearly - debt_service_annual

cashflow_after_debt_monthly =
  cashflow_after_debt_yearly / 12

cash_on_cash_return =
  cashflow_after_debt_yearly / equity_used
  [nur wenn equity_used > 0]

dscr_noi =
  net_operating_income_yearly / debt_service_annual
  [nur wenn debt_service_annual > 0]

ltv_ratio =
  remaining_debt(heute) / total_investment

rent_per_sqm_cold =
  cold_rent_monthly / living_area_sqm

mietmultiplikator =
  purchase_price / (cold_rent_yearly + parking_rent_yearly)

break_even_rent_monthly =
  operating_costs_non_recoverable_monthly + monthly_mortgage
```

---

### Realität-KPIs (aus Statushistorie berechnet)

```
cashflow_actual_ytd =
  Summe cashflow_nach_steuer aller Monate seit economic_transfer_date bis heute

cashflow_actual_monthly_avg =
  cashflow_actual_ytd / Anzahl_Monate

vacancy_rate_actual =
  Monate_mit_status_Leerstand / Gesamtmonate_seit_Übergang

non_rental_rate_actual =
  (Monate_mit_status_Leerstand + Monate_mit_status_Eigennutzung + Monate_mit_status_Renovierung)
  / Gesamtmonate_seit_Übergang
  [alle Monate ohne Mieteinnahmen — für realen Cashflow-Vergleich]

soll_ist_abweichung_monthly =
  cashflow_actual_monthly_avg - cashflow_after_debt_monthly

extraordinary_costs_ytd =
  Summe aller außerordentlichen Kosten seit economic_transfer_date
```

---

### Portfolio-KPIs (aggregiert über alle Immobilien)

```
portfolio_total_investment =
  Σ total_investment

portfolio_total_debt =
  Σ remaining_debt(heute)

portfolio_ltv =
  portfolio_total_debt / portfolio_total_investment

portfolio_gross_income_yearly =
  Σ gross_income_yearly

portfolio_noi_yearly =
  Σ net_operating_income_yearly

portfolio_net_yield =
  portfolio_noi_yearly / portfolio_total_investment

portfolio_cashflow_monthly =
  Σ cashflow_after_debt_monthly

portfolio_equity_total =
  Σ equity_used

portfolio_cash_on_cash =
  Σ cashflow_after_debt_yearly / portfolio_equity_total
```

---

## 11. Investment-Rechner

Eigenständige Entität für Kaufkandidaten vor dem Erwerb. Enthält alle Felder aus `Property` außer:
- `status_history` — kein Realität-Tracking vor dem Kauf
- `extraordinary_costs` — keine laufende Kostenverfolgung
- `rent_guarantee` — nicht relevant vor dem Kauf

### Zusätzliche Felder

| Feldname | Typ | Pflicht | Zweck |
|---|---|---|---|
| `name` | String | ✓ | Anzeigename in der Liste (z.B. "ETW Dresden Neustadt") |
| `target_rent_monthly` | Currency | — | Angestrebte Kaltmiete — Alias oder Überschreibung von `cold_rent_monthly` |
| `promoted_property_id` | UUID? | — | Verknüpfung zur entstandenen Immobilie nach Promote |
| `is_promoted` | Bool | — | Flag: wurde als Immobilie übernommen |
| `promoted_at` | Date? | — | Zeitpunkt der Übernahme |
| `notes` | Text | — | Notizen zur Kaufentscheidung |

> **Nicht implementiert (v2):** `target_rent_confidence` (Sicher / Wahrscheinlich / Schätzung) — kein Recheneffekt in v1, für späteres Warnsymbol / Sensitivitäts-Preset vorgemerkt.

---

### KPIs & Pflichtfelder

KPIs schalten sich still frei sobald genügend Daten vorhanden sind. Kein Bestätigen-Button — Live-Berechnung via React State (`useState`/`useMemo`, kein Server-Roundtrip nötig).

| Stufe | Felder | Freischaltet |
|---|---|---|
| **1 — Sofort** | `name`, `purchase_price`, `cold_rent_monthly` | Kaufpreisfaktor, Bruttorendite |
| **2 — Finanzierung** | `loan_amount`, `interest_rate`, `amortization_rate` | Cashflow vor Steuer, DSCR, Break-Even-Miete, LTV, Cash-on-Cash |
| **3 — Kosten** | `hoa_fee_non_recoverable`, `property_management`, `maintenance_reserve` | Nettorendite, genauerer Cashflow |
| **4 — Steuer** | `marginal_tax_rate`, `building_value`, `depreciation_rate` | Cashflow nach Steuer |

Fehlende KPIs zeigen `—` in der Anzeige.

### KPI-Definitionen

| Priorität | KPI | Formel |
|---|---|---|
| 🥇 | **Kaufpreisfaktor** | `purchase_price / (cold_rent_monthly * 12)` |
| 🥇 | **Bruttorendite** | `(cold_rent_monthly * 12) / purchase_price` |
| 🥈 | **Cashflow/Monat vor Steuer** | `effective_income - monthly_mortgage - operating_costs_non_recoverable_monthly` |
| 🥈 | **Cashflow/Monat nach Steuer** | `cashflow_before_tax + tax_effect_monthly` |
| 🥈 | **Nettorendite** | `net_operating_income_yearly / total_investment` |
| 🥉 | **Cash-on-Cash** | `cashflow_after_debt_yearly / equity_used` |
| ➕ | **Break-Even-Miete** | `operating_costs_non_recoverable_monthly + monthly_mortgage` |
| ➕ | **DSCR** | `net_operating_income_yearly / debt_service_annual` |
| ➕ | **LTV** | `loan_amount / total_investment` |

Formeln folgen denselben Definitionen wie Sektion 10.

---

### Sensitivitätsanalyse

5 Parameter individuell per Slider verstellbar. KPI-Panel aktualisiert sich live beim Bewegen.

| Parameter | Bereich | Schritt |
|---|---|---|
| Kaltmiete | ±20% des Basiswerts | 10 € |
| Zinssatz | ±2 Prozentpunkte | 0,1% |
| Kaufpreis | ±15% des Basiswerts | 1.000 € |
| Leerstandsquote | ±10 Prozentpunkte | 1% |
| Instandhaltungsrücklage | ±100 €/Mon | 5 € |

> Slider-Positionen sind **nicht persistent** — beim Schließen zurückgesetzt. Nur Basisdaten werden gespeichert.

---

### UI-Layout

```
┌─ KPI-PANEL (fixiert, scrollt nicht mit) ────────────────────┐
│  Kaufpreisfaktor 24,3×    Bruttorendite     4,1%            │
│  Cashflow/Mon   −87 €     Nettorendite      3,2%            │
│  Cash-on-Cash    3,8%     Break-Even-Miete  780 €           │
│  DSCR            0,82     LTV               81,4%           │
│                  * nach Steuer: +43 €/Mon                   │
├─ EINGABE (scrollbar, alle Sektionen immer offen) ───────────┤
│  [Kauf]               [Einnahmen]                           │
│  [Finanzierung]       [Kosten]                              │
│  [AfA & Steuer]                                             │
├─ SENSITIVITÄTSANALYSE ──────────────────────────────────────┤
│  Miete     ────●──────  950 €   Zinssatz ──────●────  4,5% │
│  Kaufpreis ────●──────  263k €  Leerstand ──●───────  5%   │
│  Instandh. ────●──────  50 €/Mon                           │
└─────────────────────────────────────────────────────────────┘
```

Listenansicht (Sidebar-Karte):

```
┌─────────────────────────────────────────────┐
│ ETW Dresden Neustadt         ✓ übernommen   │
│ Dresden · 263.600 €                         │
│ Bruttorendite 4,1%   Kaufpreisfaktor  24×   │
│ Cashflow/Mon −87 €   Nettorendite    3,2%   │
└─────────────────────────────────────────────┘
```

Sortierung: zuletzt bearbeitet zuerst. `—` wenn Finanzierung fehlt. Badge `✓ übernommen` wenn `is_promoted = true`.

---

### Promote-Flow ("Als Immobilie übernehmen")

```
[Button: "Als Immobilie übernehmen"]
         ↓
Confirmation Dialog:
"Kaufkandidat wird als neue Immobilie ins Portfolio aufgenommen.
 Dieser Eintrag bleibt als Referenz erhalten."
         ↓
→ Neues Property-Objekt mit allen Feldern aus InvestmentCalculation
→ status_history startet leer (normaler Onboarding-Flow greift)
→ is_promoted = true
→ promoted_property_id = neue Property.id
→ promoted_at = heute
→ Badge "✓ übernommen" in Listenansicht
→ Link "→ Zur Immobilie" im KPI-Panel
```

Der Eintrag wird **nicht gelöscht** — bleibt als Prognose-Referenz für späteren Soll/Ist-Vergleich.

---

### Dateistruktur

```
Postgres:
  investment_calculations              # Tabelle, siehe CLAUDEvolta.md

web/lib/calculations/:
  investmentCalculator.ts              # KPI-Berechnungen, Sensitivität (reine Funktionen)

web/app/(app)/investment-calculator/:
  page.tsx                             # Sidebar-Liste aller Kaufkandidaten
  [id]/page.tsx                        # Fixierter KPI-Panel + scrollbare Eingabe

web/components/investment-calculator/:
  InvestmentKpiPanel.tsx               # Fixierter KPI-Bereich
  InputSections.tsx                    # Scrollbare Eingabefelder
  SensitivityView.tsx                  # Slider-Bereich
  PromoteDialog.tsx                    # Confirmation Dialog für Promote
```

---

## 12. Mietgarantie (optional, pro Immobilie)

| Feldname | Typ | Beispiel |
|---|---|---|
| `guarantee_provider` | String | "Cosona Asset GmbH" |
| `guarantee_amount_monthly` | Currency | 998 € |
| `guarantee_start_date` | Date | 2026-02-01 |
| `guarantee_end_date` | Date | 2026-07-31 |
| `guarantee_notes` | Text | "Private Vereinbarung" |

> Wird in der Statushistorie als `Leerstand_Mietgarantie` geführt. `income_actual_monthly` im Statuseintrag = Garantiebetrag.

---

## Änderungsprotokoll gegenüber v1

| # | Bereich | Änderung |
|---|---|---|
| 1 | AfA | `afa_basis` als eigenes Feld ergänzt mit korrekter Formel |
| 2 | AfA | `building_value` / `land_value` als direkte manuelle Eingaben (nicht vom Kaufpreis abgeleitet) |
| 3 | AfA | `depreciation_rate` bleibt manuell (Standard oder Gutachten) |
| 4 | AfA | `depreciation_yearly_prorated` für Erwerbsjahr ergänzt |
| 5 | Rendite | `gross_yield` korrigiert auf `cold_rent_yearly + parking_rent_yearly` (nicht `gross_income_yearly`) |
| 6 | Rendite | `gross_rent_yearly` (undefiniert) eliminiert |
| 7 | Kosten | `net_rent_monthly/yearly` gestrichen (redundant mit NOI) |
| 8 | Kosten | `closing_costs_total_manual` gestrichen |
| 9 | Finanzierung | Zinsen/Tilgung berechnet mit manuellem Override |
| 10 | Finanzierung | `remaining_debt` dynamisch berechnet + manuelles Abgleichfeld |
| 11 | Finanzierung | `loan_end_date` ergänzt |
| 12 | Stammdaten | `acquisition_type` ergänzt |
| 13 | Stammdaten | `economic_transfer_date` ergänzt |
| 14 | Neu | Statushistorie als eigene Entität |
| 15 | Neu | Außerordentliche Kosten als eigene Entität |
| 16 | Neu | Steuereffekt-Berechnung (marginal_tax_rate) |
| 17 | Neu | Realität-KPIs (Ist vs. Soll) |
| 18 | Neu | Portfolio-KPIs (aggregiert) |
| 19 | Neu | Investment-Rechner mit Promote-Funktion |
| 22 | Investment-Rechner | Vollständig ausgearbeitet: Liste, KPI-Freischaltlogik, 8 KPIs, Sensitivitätsanalyse, Promote-Flow, UI-Layout |
| 21 | Objektdaten | `has_fitted_kitchen` ergänzt (Einbauküche ja/nein) |
