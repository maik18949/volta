# Immobilien Portfolio Manager — CLAUDE.md

Technische Referenz für KI-Assistenten und Entwickler.
Dieses Dokument beschreibt Architektur, Konventionen und Entscheidungen des Projekts.

---

## Projekt-Übersicht

**Name:** Immobilien Portfolio Manager (Volta)
**Plattform:** Web App (Next.js, App Router)
**Sprache:** TypeScript
**UI-Framework:** React + Tailwind CSS
**Backend:** Supabase (Postgres + Auth)
**Ziel:** Private Immobilienverwaltung für einen einzelnen Nutzer mit Login — Daten liegen bei Supabase (Cloud), von jedem Gerät per Browser erreichbar

---

## Tech Stack

| Bereich | Technologie | Begründung |
|---|---|---|
| Frontend-Framework | Next.js (App Router) | Größtes Ökosystem, offizielle Supabase-Integration (Auth-Helpers, SSR) |
| Sprache | TypeScript | Typsicherheit, generierte Supabase-Typen direkt nutzbar |
| Backend/Datenbank | Supabase (Postgres) | Managed Postgres, Row-Level-Security, kein eigener Server nötig |
| Auth | Supabase Auth (Magic Link) | Schützt Zugriff auf Finanzdaten, kein Passwort-Management |
| Styling | Tailwind CSS | Design-Tokens aus `spec-design-system.md` als Tailwind-Theme, Utility-first |
| Charts | Recharts | LTV-Kurve, Tilgungsplan-Visualisierung |
| Formulare | React Hook Form + Zod | Feld-State/Performance, Schema-Validierung (Pflichtfelder, Warnschwellen) |
| Datenzugriff | `supabase-js` Client + generierte TS-Typen (`supabase gen types typescript`) | Kein ORM-Overhead |
| Zahlenformatierung | `Intl.NumberFormat('de-DE', ...)` | Locale-aware EUR-Formatierung |
| Datumsverarbeitung | native `Date` (+ `date-fns` falls nötig) | Tilgungsplan, Monats-Iteration |
| Testing | Vitest | Unit Tests für Berechnungslogik |
| Hosting | Vercel | Standard-Hosting für Next.js |
| Package-Manager | pnpm | Schnellere Installs, spart Speicherplatz (content-addressable store), verhindert phantom dependencies |
| Abhängigkeiten extern | Next.js, React, Tailwind, Recharts, React Hook Form, Zod, `supabase-js`, Vitest | Schlanker Stack, kein zusätzliches globales State-Management, kein ORM |

---

## Projektstruktur

```
web/
├── app/
│   ├── layout.tsx                     # Root Layout, globale Styles
│   ├── login/
│   │   └── page.tsx                   # Magic-Link-Login
│   └── (app)/                         # Geschützter Bereich (Auth-Check im Layout)
│       ├── layout.tsx                 # Sidebar-Navigation
│       ├── page.tsx                   # Portfolio-Übersicht (Hauptscreen)
│       ├── properties/
│       │   ├── new/
│       │   │   └── page.tsx           # Property Setup (eigene Route, kein Modal)
│       │   └── [id]/
│       │       ├── layout.tsx         # Tab-Navigation
│       │       ├── overview/page.tsx
│       │       ├── cashflow/page.tsx
│       │       ├── tax/page.tsx
│       │       ├── financing/page.tsx
│       │       ├── history/page.tsx
│       │       └── settings/page.tsx
│       └── investment-calculator/
│           ├── page.tsx               # Sidebar-Liste aller Kaufkandidaten
│           └── [id]/page.tsx          # KPI-Panel (fixiert) + Eingabe + Sensitivität
│
├── components/
│   ├── property/
│   │   ├── PropertyCard.tsx
│   │   └── StatusBadge.tsx            # Vermietet / Leerstand etc.
│   ├── kpi/
│   │   ├── KpiCard.tsx
│   │   └── KpiCardWithContext.tsx     # KPI + Benchmark-Erklärung
│   ├── forms/
│   │   ├── CurrencyField.tsx
│   │   ├── PercentField.tsx
│   │   ├── SelectField.tsx
│   │   ├── DatePickerField.tsx
│   │   └── NumberStepperControl.tsx
│   └── layout/
│       └── SectionHeader.tsx
│
├── lib/
│   ├── calculations/                  # Reine TS-Funktionen, kein React — unit-testbar
│   │   ├── kpiCalculator.ts
│   │   ├── cashflowCalculator.ts
│   │   ├── depreciationCalculator.ts
│   │   ├── amortizationCalculator.ts
│   │   └── taxCalculator.ts
│   ├── supabase/
│   │   ├── client.ts                  # Browser-Client
│   │   ├── server.ts                  # Server-Client (RSC/Route Handlers)
│   │   └── types.ts                   # Generiert via `supabase gen types typescript`
│   └── formatters.ts                  # currency/date/percent, shared
│
└── tests/
    └── calculations/                  # Vitest, spiegelt lib/calculations/
```

---

## Datenmodell (Supabase / Postgres)

> Feldquelle: der tatsächlich implementierte Swift-Code (`Volta/Volta/Models/*.swift`), nicht eine der drei sich widersprechenden Doku-Versionen. Beim Review kamen drei unterschiedliche Datenmodelle ans Licht: die alte `CLAUDEvolta.md` (5-Werte-Status-Enum, `monthlyMortgageActual`/`remainingDebtCurrent`, separate `RentGuarantee`-Tabelle), `immobilien_datenmodell_v2.md` (ebenfalls 5-Werte-Status-Enum, `status_from`, `cost_month`+Kategorie-Enum) und `docs/specs/spec-data-model.md` (3-Werte-Status-Enum, `date`, Freitext ohne Kategorie). Der echte Code in `Volta/Volta/Models/` folgt größtenteils `spec-data-model.md` (Property, StatusEntry — 3 Status, Feldname `date`), aber bei `ExtraordinaryCost` dem älteren Muster (`costMonth` normalisiert + Kategorie-Enum `ExtraordinaryCostCategory`, nicht Freitext). Diese Fassung hier folgt konsequent dem Code, da der Code die einzige Quelle ist, die tatsächlich läuft und nicht mit sich selbst im Widerspruch steht.

### properties (Haupt-Tabelle)

```sql
-- Hinweis: Alle nicht-optionalen Felder haben Default-Werte, damit
-- künftige Migrationen bestehende Zeilen nicht brechen.
create type property_type as enum ('apartment', 'einfamilienhaus', 'mehrfamilienhaus', 'gewerbe', 'grundstuck', 'sonstiges');
create type acquisition_type as enum ('kauf', 'erbschaft', 'schenkung');
create type parking_type as enum ('nicht_vorhanden', 'tiefgarage', 'aussenstellplatz', 'garage');
create type heating_type as enum ('fernwarme', 'gas', 'ol', 'warmepumpe', 'pellet', 'elektro', 'sonstiges');
create type energy_class as enum ('a_plus_plus', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h');
create type property_condition as enum ('neubau', 'erstbezug', 'gepflegt', 'renovierungsbedurftig', 'sanierungsbedurftig');

create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Stammdaten
  name text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  property_type property_type not null default 'apartment',
  acquisition_type acquisition_type not null default 'kauf',
  year_built int,
  notes text not null default '',

  -- Objektdaten
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
  parking_type parking_type not null default 'nicht_vorhanden',  -- Stellplatz-Felder nur relevant wenn != 'nicht_vorhanden'
  parking_count int not null default 0,
  heating_type heating_type,
  energy_efficiency_class energy_class,
  condition property_condition,
  last_renovation_year int,

  -- Kauf & Nebenkosten
  purchase_date date not null default now(),           -- Label je acquisition_type (Kaufdatum / Erbschaft / Schenkung)
  economic_transfer_date date not null default now(),  -- AfA-Startpunkt
  purchase_price_unit double precision not null default 0,
  purchase_price_parking double precision not null default 0,   -- nur wenn parking_type != 'nicht_vorhanden'
  land_transfer_tax double precision not null default 0,
  notary_costs double precision not null default 0,
  land_registry_costs double precision not null default 0,
  agent_fee double precision not null default 0,
  appraisal_costs double precision not null default 0,
  renovation_modernization_costs double precision not null default 0,
  renovation_afa_eligible double precision not null default 0,  -- aktivierungspflichtiger Anteil, erhöht AfA-Basis

  -- Einnahmen
  cold_rent_monthly double precision not null default 0,        -- Nettomiete, UI-Label "Nettomiete"
  warmmiete_monthly double precision,                            -- rein informativ
  parking_rent_monthly double precision not null default 0,     -- nur wenn parking_type != 'nicht_vorhanden'
  other_income_monthly double precision not null default 0,

  -- Annahmen
  vacancy_rate_assumption double precision not null default 0.03,
  market_rent_per_sqm double precision,   -- Marktmiete/m², informativ
  current_market_value double precision,  -- aktueller Marktwert, manuell geschätzt

  -- Kosten — Wohnung
  hoa_fee_total_monthly double precision not null default 0,
  is_hoa_unit_split boolean not null default false,
  hoa_fee_recoverable_monthly double precision not null default 0,          -- nur wenn is_hoa_unit_split
  hoa_fee_maintenance_reserve_monthly double precision not null default 0,  -- nur wenn is_hoa_unit_split
  property_tax_annual double precision not null default 0,
  property_management_annual double precision not null default 0,
  property_insurance_annual double precision not null default 0,
  other_costs_monthly double precision not null default 0,

  -- Kosten — Stellplatz (nur wenn parking_type != 'nicht_vorhanden')
  hoa_fee_parking_total_monthly double precision not null default 0,
  is_hoa_parking_split boolean not null default false,
  hoa_fee_parking_recoverable_monthly double precision not null default 0,          -- nur wenn is_hoa_parking_split
  hoa_fee_parking_maintenance_reserve_monthly double precision not null default 0,  -- nur wenn is_hoa_parking_split
  property_tax_parking_annual double precision not null default 0,

  -- Finanzierung
  loan_amount double precision not null default 0,
  interest_rate double precision not null default 0,
  amortization_rate double precision not null default 0,
  fixed_interest_period_years int not null default 10,
  loan_start_date date not null default now(),
  monthly_mortgage double precision not null default 0,          -- direkt gespeichert, im Wizard vorausgefüllt & editierbar
  equity_contributed double precision not null default 0,        -- selbst eingebrachtes Eigenkapital
  broker_commission_agreement double precision not null default 0,  -- Anteil aus Eigenprovisions-Vereinbarung

  -- AfA & Steuer
  land_value double precision not null default 0,
  building_value double precision not null default 0,
  depreciation_rate double precision not null default 0.02,
  marginal_tax_rate double precision not null default 0,

  sort_order int not null default 0,   -- manuelle Reihenfolge im Portfolio-Grid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties enable row level security;
create policy "properties_owner" on properties for all using (user_id = auth.uid());
```

### status_entries

```sql
-- 3 Werte, nicht 5 — leerstandMietgarantie/eigennutzung/renovierung aus der
-- alten v1-Spec existieren im tatsächlichen PropertyStatus-Enum nicht mehr.
create type property_status as enum ('vermietet', 'leerstand', 'mietgarantie');

create table status_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  date date not null default now(),         -- Startdatum dieses Status
  status property_status not null default 'vermietet',
  income_actual_monthly double precision,   -- nullable — nur für 'mietgarantie' befüllt
  notes text not null default '',
  created_at timestamptz not null default now()   -- Tie-Breaker-Sortierung bei gleichem `date`
);

alter table status_entries enable row level security;
create policy "status_entries_owner" on status_entries for all using (
  property_id in (select id from properties where user_id = auth.uid())
);
```

### extraordinary_costs

```sql
-- Behält die Kategorie-Enum + monatsnormalisiertes Datum bei — der
-- tatsächliche Code (ExtraordinaryCost.swift) nutzt weiterhin category
-- + costMonth, nicht das Freitext-Modell aus spec-data-model.md.
create type extraordinary_cost_category as enum ('sonderumlage', 'reparatur', 'gutachter', 'rechtskosten', 'sonstiges');

create table extraordinary_costs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  cost_month date not null default now(),   -- auf ersten Tag des Monats normalisiert (App-seitig)
  amount double precision not null default 0,
  category extraordinary_cost_category not null default 'sonstiges',
  description_text text,
  is_deductible boolean not null default true   -- §9 EStG Werbungskosten; Sonderumlage z.B. nicht immer
);

alter table extraordinary_costs enable row level security;
create policy "extraordinary_costs_owner" on extraordinary_costs for all using (
  property_id in (select id from properties where user_id = auth.uid())
);
```

### property_photos

```sql
create table property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,                    -- Pfad im Supabase Storage Bucket
  is_cover_photo boolean not null default false,  -- max. 1 pro Immobilie (App-seitig durchgesetzt)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table property_photos enable row level security;
create policy "property_photos_owner" on property_photos for all using (
  property_id in (select id from properties where user_id = auth.uid())
);
```

**Kein `rent_guarantees`:** Die alte v1-Spec hatte eine eigene `RentGuarantee`-Tabelle (Anbieter, Start-/Enddatum). Im aktuellen Modell läuft eine Mietgarantie über `status_entries` mit `status = 'mietgarantie'` und `income_actual_monthly` — keine separate Tabelle nötig.

TypeScript-Typen für alle Tabellen werden generiert (nicht manuell gepflegt):

```bash
supabase gen types typescript --project-id <project-id> > web/lib/supabase/types.ts
```

---

## Berechnungsschicht — Wichtige Formeln

### AfA-Basis

```typescript
// buildingValue und landValue kommen direkt aus Regierungs-Excel
// buildingShareRatio wird daraus abgeleitet, NICHT umgekehrt

const buildingShareRatio = buildingValue / purchasePrice;
const afaBasis = buildingValue + (closingCostsTotal * buildingShareRatio) + renovationAfaEligible;
const depreciationYearly = afaBasis * depreciationRate;
```

### Bruttorendite

```typescript
// Kaltmiete + Parkingmiete — NICHT grossIncome (enthält sonstige Einnahmen)
const grossYield = (coldRentYearly + parkingRentYearly) / purchasePrice;
```

### Zinsen/Tilgung

```typescript
// monthlyMortgage ist direkt gespeichert (properties.monthly_mortgage) und im Wizard
// mit diesem Wert vorausgefüllt — Nutzer kann ihn danach frei überschreiben
// (z.B. Sondertilgung, abweichende Bankrate). Kein separates "Actual"-Feld.
const monthlyMortgagePrefill = loanAmount * ((interestRate + amortizationRate) / 12);
```

### Dynamische Restschuld

```typescript
function remainingDebt(loanAmount: number, interestRate: number, monthlyMortgage: number, t: number): number {
  const r = interestRate / 12;
  return loanAmount * Math.pow(1 + r, t) - monthlyMortgage * (Math.pow(1 + r, t) - 1) / r;
}
```

### Cashflow pro Monat (Realität)

```typescript
function cashflowActual(month: Date, property: Property, statusHistory: StatusEntry[], extraordinaryCosts: ExtraordinaryCost[]) {
  const status = activeStatus(month, statusHistory);
  const income = status.incomeActualMonthly;

  const fixedCosts = property.monthlyMortgage + property.operatingCostsNonRecoverableMonthly;

  // Umlagefähige Kosten + Grundsteuer nur bei Leerstand vom Eigentümer zu tragen
  let ownerBorneRecoverableCosts = 0;
  if (status.status !== 'vermietet') {
    ownerBorneRecoverableCosts =
      property.hoaFeeRecoverableMonthly + property.propertyTaxMonthly + property.propertyInsuranceMonthly;
  }

  const extraordinary = extraordinaryCostsFor(month, extraordinaryCosts).reduce((sum, c) => sum + c.amount, 0);

  const cashflowBeforeTax = income - fixedCosts - ownerBorneRecoverableCosts - extraordinary;
  const cashflowAfterTax = cashflowBeforeTax + taxEffectMonthly(month);

  return { cashflowBeforeTax, cashflowAfterTax };
}
```

### Steuereffekt

```typescript
// Vereinfacht: V+V-Ergebnis × Grenzsteuersatz
// Negatives Ergebnis = Verlust = Steuererstattung (positiver Cashflow-Effekt)
const taxableIncomeVV = effectiveGrossIncomeYearly
  - operatingCostsNonRecoverableYearly
  - interestAnnual
  - depreciationYearly;

const taxEffectYearly = taxableIncomeVV * marginalTaxRate * -1;
const taxEffectMonthly = taxEffectYearly / 12;
```

---

## Navigationsstruktur

Schmale Sidebar links für Hauptnavigation, breiter Content-Bereich rechts (Next.js Layout, kein natives Sidebar-Widget).

```
┌─────────┬──────────────────────────────────────────┐
│ 🏠      │  Portfolio                               │
│ 📊      │  ┌─ Aggregierte KPIs ─────────────────┐ │
│ ⚙️      │  │  LTV 68%  Rendite 4,1%  CF −87€    │ │
│         │  └────────────────────────────────────┘ │
│         │                                          │
│         │  ┌──────────┐  ┌──────────┐             │
│         │  │ ETW      │  │ MFH      │             │
│         │  │ Dresden  │  │ Berlin   │             │
│         │  └──────────┘  └──────────┘             │
└─────────┴──────────────────────────────────────────┘
```

**Sidebar-Einträge:** Portfolio · Investment-Rechner · Einstellungen

**Portfolio-Sektion (Startseite, `app/(app)/page.tsx`):**
- Oben: Aggregierte Portfolio-KPIs (Gesamt-LTV, Portfolio-Rendite, Gesamt-Cashflow)
- Darunter: Alle Immobilien als Karten-Grid
- Klick auf Karte → Route `properties/[id]/overview` (voller Content-Bereich)

**Immobilien-Detailansicht (Tab-Navigation via Next.js Layout):**
```
Übersicht | Cashflow | Steuer | Finanzierung | Einstellungen
```

---

## KPI-Anzeige Prinzip

**Drei Ebenen:**

1. **Immer sichtbar (Property Header):** Kaufpreis, Gesamtinvestment, Bruttorendite, Nettorendite, LTV — ändert sich nie nach Kauf
2. **Cashflow-Tab:** Soll vs. Ist nebeneinander mit Abweichungs-Highlighting
3. **Realität-Detail:** Statushistorie, außerordentliche Kosten, monatliche Aufschlüsselung

**KPI-Karten mit Kontext:** Jede KPI-Karte zeigt Wert + Benchmark + kurze Einordnung.
Beispiel DSCR: Wert 0.77 → "Unter 1.0 — bei aktuellen Zinsen strukturell normal bei deutschen Kaufpreismultiples"

---

## Konventionen

### Benennung
- TS-Felder (Client): `camelCase` (z.B. `coldRentMonthly`)
- Postgres-Spalten (DB): `snake_case` (z.B. `cold_rent_monthly`) — Mapping übernimmt der generierte Supabase-Typ
- React-Komponenten: `PascalCase.tsx`, Suffix `Tab` nur für tatsächliche Tab-Komponenten (z.B. `CashflowTab.tsx`)
- Enums/Union-Types: `PascalCase` Typname, Werte als deutscher Anzeigestring über eine separate Label-Map, nicht im Wert selbst kodiert

### Währung & Zahlen
- Interne Berechnung immer in `number`
- Anzeige immer über `lib/formatters.ts` (`formatCurrency`, `formatPercent`) — Wrapper um `Intl.NumberFormat('de-DE', ...)`
- Prozente intern als Dezimal (0.042 = 4,2%)
- Niemals `.toFixed()`/manuelle String-Konkatenation im Component — immer über Formatters

### Datum
- Intern immer `Date` (client) / `date`/`timestamptz` (Postgres)
- Monats-Normalisierung: erster Tag des Monats
- `economicTransferDate` ist der Stichtag für AfA-Beginn und alle Realität-Berechnungen
- Kein `purchaseDate` für Steuerberechnungen verwenden

### Fehlerbehandlung
- Division durch 0: immer explizit prüfen, `null` oder `0` zurückgeben je nach KPI
- Fehlende optionale Felder: in Berechnungen als `0` behandeln, in UI als "–" anzeigen
- Keine unbehandelten Promise-Rejections in Server Actions / Route Handlers

### Trennung von Concerns
- **`lib/supabase/types.ts`:** Nur Datenhaltung (generiert), keine Logik
- **`lib/calculations/`:** Reine TS-Funktionen, kein React, kein Supabase-Import — unit-testbar
- **`app/**/page.tsx`:** Datenladen (Server Components) + Komposition
- **`components/`:** Nur Darstellung + lokale Interaktion, keine Berechnungen

---

## Datenspeicherung

### Speicherort

Supabase verwaltet Postgres als Managed-Service. Kein lokaler Dateipfad, kein manuelles Backup-Handling nötig — Supabase übernimmt Backups.

- Kein manuelles Speichern nötig — Schreiboperationen über `supabase-js` committen sofort
- Zugriff ausschließlich über `user_id = auth.uid()` (Row-Level-Security), siehe Datenmodell oben
- Automatisch über mehrere Geräte hinweg synchron (Cloud-DB) — kein separater Sync-Mechanismus nötig

### Speicherkapazität

Wie zuvor: Postgres hat für diesen Use Case (Einzelnutzer, einige hundert Immobilien, Jahrzehnte an Historiendaten) kein praktisches Limit. Supabase Free-Tier (500 MB) reicht um Größenordnungen aus.

---

## Testing-Strategie

### Pyramide

```
            E2E-Tests           ← 0 initial (bewusste Entscheidung)
        Component-Tests         ← Wenige, nur für Integrationspfade
    Unit Tests (calculations/)  ← Hauptfokus
```

### Priorität 1 — Unit Tests: `lib/calculations/` (Ziel: 90%+)

Alle Formeln sind pure functions ohne Side Effects — exakt das, was unit-testbar ist (Vitest).

| Datei | Was testen |
|---|---|
| `kpiCalculator.ts` | `grossYield`, `netYield`, `capRate`, `cashOnCash`, `dscr`, `mietmultiplikator`, `breakEvenRent` |
| `cashflowCalculator.ts` | Cashflow je Status (vermietet / leerstand / mietgarantie), außerordentliche Kosten, Steuereffekt |
| `depreciationCalculator.ts` | AfA-Basis-Formel, anteilige AfA im Erwerbsjahr, verschiedene `depreciationRate`-Szenarien |
| `amortizationCalculator.ts` | `remainingDebt(atMonth)`, Tilgungsplan-Korrektheit, `monthlyMortgage`-Wizard-Vorbefüllung vs. manueller Überschreibung |
| `taxCalculator.ts` | `taxableIncomeVV`, `taxEffectYearly`, negativer Steuereffekt = Erstattung |

**Kritische Edge Cases:**
- Division durch 0: kein Kaufpreis, kein Eigenkapital, kein Schuldenservice
- `monthlyMortgage` manuell überschrieben (z.B. Sondertilgung) vs. Wizard-Vorbefüllung `loanAmount × (interestRate + amortizationRate) / 12`
- AfA-Beginn genau an `economicTransferDate` (erster voller Monat)
- Cashflow bei `mietgarantie` vs. `leerstand` (umlagefähige Kosten-Logik)
- `effectiveGrossIncomeYearly` bei 0% Leerstand vs. 100% Leerstand

**Fixture:** Dresdner ETW mit allen bekannten Werten als gemeinsames `tests/fixtures/dresdnerEtw.ts` — einmal definiert, in allen Calculator-Tests genutzt. Jede KPI wird gegen den händisch verifizierten Sollwert geprüft (Golden-Master-Ansatz).

### Priorität 2 — Component-Tests (Ziel: 70% wo nicht-trivial)

Nur für nicht-triviale Aggregations- und Statuslogik-Pfade (Vitest + React Testing Library):

| Bereich | Was testen |
|---|---|
| Property-Detail-Datenladen | `activeStatus(month)` — korrekte Statusauswahl aus Statushistorie |
| Cashflow-Aggregation | Cashflow-YTD-Aggregation über mehrere Monate mit Statuswechsel |
| Portfolio-Übersicht | Portfolio-KPIs korrekt über 2+ Immobilien aggregiert |
| Investment-Rechner | KPI-Freischaltlogik (Stufen 1–4), Sensitivitäts-Berechnung |

Kein echter Supabase-Call in Component-Tests — Mock-Client oder Property-Objekt als Teststub.

### Priorität 3 — Datenintegrität

Gezielte Tests für Invarianten, die die App voraussetzt:

- Erster `status_entries`-Eintrag muss `date == economic_transfer_date` sein
- `status_entries.income_actual_monthly` ist nur bei `status = 'mietgarantie'` gesetzt, sonst `null`
- `building_share_ratio + land_share_ratio ≈ 1.0` (aus Regierungs-Excel-Werten)
- Promote-Flow: `investment_calculations` → `properties` kopiert alle Felder korrekt

### Bewusst ausgelassen

| Bereich | Begründung |
|---|---|
| E2E-Tests | Kleines Einzel-Nutzer-Tool, Wartungskosten zu hoch initial |
| Supabase-CRUD selbst | Managed Service — Supabase testet das selbst |
| Formatters | Triviale Wrapper ohne eigene Logik |

---

## MVP-Scope (v1)

**v1 — muss funktionieren:**
- Login (Magic Link)
- Immobilie anlegen (Wizard)
- Prognose-KPIs (Übersicht, Cashflow Soll, AfA, Tilgungsplan)
- Statushistorie + Ist-Cashflow
- Portfolio-Übersicht + Portfolio-KPIs
- Investment-Rechner inkl. Sensitivitätsanalyse und Promote-Flow

**v2 — bewusst rausgelassen:**
- Export / Backup
- Mehrsprachigkeit
- Multi-User (RLS ist vorbereitet, aber kein Einladungs-/Freigabe-Flow)

---

## Error-Handling-Strategie

Zwei Ebenen:

**Blocking — App verhindert Speichern:**
- Pflichtfeld leer (Name, Kaufpreis, Wohnfläche, Zinssatz, Tilgungssatz)
- `economicTransferDate` in der Vergangenheit ohne ersten Statuseintrag

**Warning — Speichern möglich, Hinweis wird angezeigt:**
- `landValue + buildingValue` weicht um mehr als 5% von `purchasePrice` ab
- `depreciationRate` außerhalb der Normwerte (< 2% oder > 4%)
- `loanAmount` > `purchasePrice` (Vollfinanzierung inkl. Nebenkosten — ungewöhnlich)

Beide Ebenen werden als Zod-Schema modelliert: Blocking-Regeln als `.refine()` mit Fehler, Warning-Regeln als separate Prüfung, die eine Warnung neben dem Feld rendert statt das Submit zu blockieren.

**Systemfehler:**
- Supabase-Verbindung schlägt fehl → Fehler-UI mit Retry, kein stiller Fail
- Schreiboperation schlägt fehl (RLS-Verstoß, Constraint-Fehler) → Toast/Inline-Fehlermeldung, kein Silent Fail

---

## Postgres-Migrationen

Jede Schema-Änderung ist eine versionierte SQL-Migration unter Supabase-CLI-Verwaltung (`supabase migration new <name>`), nicht direkt im Dashboard. Niemals eine Spalte umbenennen oder löschen ohne Migration mit Backfill — das bricht bestehende Zeilen.

```bash
supabase migration new add_rent_market_sqm
# schreibt supabase/migrations/<timestamp>_add_rent_market_sqm.sql
supabase db push
```

Aktuelle Version: **v1.0.0** (initiales Schema, siehe Datenmodell-Abschnitt oben)

---

## Debug-Seeding

Im lokalen Dev-Modus (`pnpm dev` gegen lokale Supabase-Instanz via `supabase start`) wird bei leerem Datenbestand die Dresdner ETW als Testimmobilie eingefügt:

```typescript
// scripts/seed.ts — nur gegen lokale/Dev-Supabase-Instanz ausführen, nie gegen Prod
if (process.env.NODE_ENV !== 'production') {
  await seedDresdnerEtw(supabaseAdminClient);
}
```

`scripts/seed.ts` wird nicht im Vercel-Build ausgeführt.

---

## Crash Reporting

Kein natives Crash-Reporting mehr nötig (kein App-Absturz-Konzept im Browser). Stattdessen:

- Vercel Analytics (Page-Errors, Performance) — bereits in Vercel-Hosting enthalten
- Optional: Sentry für unbehandelte Client-Fehler, falls sich das als nötig erweist — bewusst nicht von Anfang an eingebunden (kein Overhead für Einzelnutzer-Tool)

---

## Logging

`console.error`/`console.warn` für Berechnungsfehler und unerwartete Zustände in Server Components/Route Handlers — landet in Vercel-Logs, dort einsehbar und durchsuchbar.

```typescript
console.error('remainingDebt: division by zero', { loanAmount });
```

Kategorien weiterhin: `calculations`, `persistence` (Supabase-Fehler), `migration` — als strukturiertes Log-Präfix statt `os.log`-Kategorie.

---

## Onboarding / Leerer Startzustand

Erster App-Start ohne Immobilien zeigt einen Empty-State im Content-Bereich:

```
[Icon: Gebäude]
Noch keine Immobilien

Füge deine erste Immobilie hinzu
um Rendite, Cashflow und Steuereffekt
im Blick zu behalten.

[Button: Erste Immobilie hinzufügen]
```

Der Button navigiert zur Route `properties/new`.

---

## Bewusste Nicht-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Backend | Supabase (Postgres + Auth) | Web-App braucht Cloud-Zugriff von jedem Gerät — kein Overhead-Verzicht mehr möglich wie bei der nativen Single-Device-App |
| ORM | Keins, `supabase-js` direkt + generierte Typen | Wartbarkeit, kein zusätzlicher Abstraktionslayer |
| Globales State-Management (Redux etc.) | Keins | React State + Server Components reichen für diese App-Größe |
| Multi-User über RLS hinaus | Nicht implementiert | Single-User-Tool, RLS ist vorbereitet falls sich das später ändert |
| MVVM strikt | Pragmatisch (Server Components + `lib/calculations/`) | Kleine App — kein Over-Engineering |
