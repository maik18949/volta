# Tech-Stack-Doku-Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite every Markdown doc in the repo that describes the app's technical implementation (native SwiftUI/SwiftData/macOS) so it instead describes the new stack (Next.js/TypeScript/React/Tailwind/Supabase), while leaving product/feature/UX/formula content unchanged.

**Architecture:** No code changes — this plan only edits `.md` files. Each task rewrites one file (or a small cluster of files), driven by a shared translation glossary (below) so terminology stays consistent across all 16 files. The existing Swift code (`Volta/`, `VoltaTests/`) is left untouched.

**Tech Stack:** N/A (documentation only). Reference: `docs/superpowers/specs/2026-07-23-web-supabase-tech-stack-design.md`.

---

## Reference: Translation Glossary

Every task below applies this glossary. Do not invent new translations ad hoc — if a term isn't covered here and isn't obvious, flag it instead of guessing.

### Platform / stack terms

| Old (Swift/native) | New (Web/Supabase) |
|---|---|
| macOS 14+ (Sonoma), native App | Web App (Next.js, App Router) |
| Swift 5.9+ | TypeScript |
| SwiftUI | React + Tailwind CSS |
| SwiftData | Supabase (Postgres) |
| Swift Charts | Recharts |
| Foundation `NumberFormatter` | `Intl.NumberFormat('de-DE', ...)` |
| Foundation `Calendar`/`DateComponents` | native `Date` (+ `date-fns` if needed for month iteration) |
| `ModelContainer` | Supabase client (`lib/supabase/client.ts` / `server.ts`) |
| Kein Backend | Supabase (Postgres + Auth) |
| XCTest | Vitest |
| Xcode | VS Code / any editor + `pnpm dev` |
| CocoaPods / SPM (kein Paketmanager) | pnpm |

### Code-level terms

| Old | New |
|---|---|
| `@Model class X { ... }` | Postgres table `x` (snake_case columns) + TS interface `X` (camelCase, generated via `supabase gen types typescript`) |
| `@Observable` class (ViewModel) | React state/hooks (`useState`, or TanStack Query for server data) — no decorator needed |
| `ObservableObject` | (not used; same as above) |
| Swift `Double` | Postgres `double precision`, TS `number` |
| Swift `String` | Postgres `text`, TS `string` |
| Swift `Bool` | Postgres `boolean`, TS `boolean` |
| Swift `Int` | Postgres `int`, TS `number` |
| Swift `Date` | Postgres `date` or `timestamptz`, TS `Date` (or ISO string over the wire) |
| Swift optional `T?` | Postgres nullable column, TS `T \| null` |
| `enum X: String, CaseIterable { case a = "A" }` | Postgres `enum` type `x` (values as-is) + TS union type `type X = 'a' \| 'b'` (or `as const` object with raw-value labels kept as a display-label map) |
| SwiftUI `View`/`Tab` suffix | React component, `.tsx`, PascalCase filename, no forced suffix (keep `*Tab` only where it names an actual tab component, e.g. `CashflowTab.tsx`) |
| `.background(.ultraThinMaterial)` + `.clipShape(RoundedRectangle(cornerRadius: 18))` | Tailwind utility class (defined once): `bg-white/80 backdrop-blur-2xl rounded-[18px] border border-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.06)]` — document as a `.glass-card` class in `spec-design-system.md` |
| SF Mono | Tailwind `font-mono` (default stack already includes `ui-monospace`/`SFMono-Regular` with fallbacks) |
| SF Symbol `name` | `lucide-react` icon (closest equivalent, e.g. `info.circle` → `Info`) |
| `NavigationStack` push (eigene Seite) | Next.js route navigation (`<Link href="...">` / `router.push()`) — still "eigene Seite", just a route instead of a pushed native view |
| `.sheet` / `.fullScreenCover` (explicitly *not* used for Property Setup) | Modal/Dialog component — stays *not used* for Property Setup (still "eigene Route, kein Modal") |
| "Confirmation Sheet" / "Bottom Sheet" (UI pattern, e.g. Promote-Flow, KPI-Erklärung) | Keep as "Dialog" (custom Tailwind modal component) — this is a UI pattern, not a Swift API, so just rename the control, not the behavior |
| `os.log` / `Logger` | `console.*` + Vercel log drain (see Logging section) |
| MetricKit | Vercel Analytics / optional Sentry (see Crash Reporting section) |

### File-path convention (old → new)

| Old (Swift) | New (Next.js, under `web/`) |
|---|---|
| `Volta/Models/Property.swift` | `web/lib/supabase/types.ts` (generated) — the `properties` table |
| `Volta/Views/PropertySetup/PropertySetupState.swift` | `web/app/(app)/properties/new/page.tsx` (React Hook Form state) |
| `PropertySetupView.swift` | `web/app/(app)/properties/new/page.tsx` |
| `ImmobiliendatenView.swift` | `web/app/(app)/properties/[id]/settings/page.tsx` |
| `InvestmentCalculation.swift` | `investment_calculations` table (Postgres) |
| `InvestmentCalculatorViewModel.swift` | `web/lib/calculations/` functions + local component state |
| `InvestmentCalculatorListView.swift` | `web/app/(app)/investment-calculator/page.tsx` |
| `InvestmentCalculatorDetailView.swift` | `web/app/(app)/investment-calculator/[id]/page.tsx` |
| `InvestmentKPIPanel.swift` | `web/components/kpi/InvestmentKpiPanel.tsx` |
| `InvestmentInputSections.swift` | `web/components/investment-calculator/InputSections.tsx` |
| `InvestmentSensitivityView.swift` | `web/components/investment-calculator/SensitivityView.tsx` |
| `InvestmentPromoteSheet.swift` | `web/components/investment-calculator/PromoteDialog.tsx` |

Apply the same pattern (feature-folder under `web/app/(app)/...` for routes, `web/components/<domain>/` for reusable pieces) whenever a spec references a `.swift` file path not listed above.

---

### Task 1: Rewrite `CLAUDEvolta.md`

**Files:**
- Modify: `CLAUDEvolta.md` (full rewrite)

- [ ] **Step 1: Replace the entire file content**

Replace the full content of `CLAUDEvolta.md` with:

```markdown
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
```

- [ ] **Step 2: Verify no stray Swift/native references remain**

Run:
```bash
grep -niE "swiftui|swiftdata|xcode|\.swift[^a-z]|@Model|@Observable|ObservableObject|MetricKit|os\.log|CloudKit|iCloud" CLAUDEvolta.md
```
Expected: no output (the file should contain zero matches — a hit means a leftover native reference was missed).

- [ ] **Step 3: Commit**

```bash
git add CLAUDEvolta.md
git commit -m "docs(claude-md): rewrite tech stack reference for Next.js + Supabase"
```

---

### Task 2: Rewrite `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the file content**

Replace the full content of `README.md` with:

```markdown
# Immobilien Portfolio Manager

Private Immobilienverwaltung als Web-App — Rendite, Cashflow, Steuer und Realität vs. Prognose auf einen Blick.

## Stack

| Bereich | Technologie |
|---|---|
| Frontend | Next.js (App Router, TypeScript) |
| Backend | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Formulare | React Hook Form + Zod |
| Hosting | Vercel |
| Package-Manager | pnpm |

## Features

- **Portfolio-Übersicht** — alle Objekte auf einen Blick mit aggregierten KPIs
- **Rendite-KPIs** — Bruttorendite, Nettorendite, Cap Rate, Cash-on-Cash, DSCR, LTV
- **Cashflow Soll/Ist** — Prognose vs. tatsächliche Einnahmen mit Statushistorie
- **Steuer** — AfA-Berechnung, Werbungskosten, V+V-Ergebnis, Steuereffekt
- **Tilgungsplan** — dynamische Restschuld, LTV-Kurve über Zeit
- **Investment-Rechner** — Objekte vor dem Kauf durchrechnen, bei Kauf direkt übernehmen

## Projektstruktur

```
web/
├── app/               # Next.js App Router: Routen + Layouts
│   ├── login/
│   └── (app)/
│       ├── properties/       # Property Setup + Detail-Tabs (Übersicht, Cashflow, Steuer, Finanzierung, Verlauf, Einstellungen)
│       └── investment-calculator/
├── components/        # Wiederverwendbare UI-Bausteine
├── lib/
│   ├── calculations/  # Reine TS-Funktionen, kein React — unit-testbar
│   └── supabase/      # Client, generierte Typen
└── tests/
```

## Datenspeicherung

Supabase (Postgres) mit Row-Level-Security pro Nutzer. Kein manuelles Speichern nötig, Schreiboperationen committen sofort über `supabase-js`. Backups übernimmt Supabase.

## Entwicklung

```bash
pnpm install
supabase start      # lokale Supabase-Instanz (Docker)
pnpm dev
```

Berechnungslogik liegt vollständig in `lib/calculations/` als reine TS-Funktionen — unabhängig von React testbar (Vitest). Testfixture: Dresdner ETW (alle Werte bekannt und verifiziert).

## Datenmodell

Siehe [`immobilien_datenmodell_v2.md`](immobilien_datenmodell_v2.md) für vollständige Felddefinitionen, Formeln und KPI-Berechnungen.

Technische Konventionen und Architekturentscheidungen: [`CLAUDEvolta.md`](CLAUDEvolta.md).
```

- [ ] **Step 2: Verify no stray Swift/native references remain**

Run: `grep -niE "swiftui|swiftdata|swift 5|macos|xcode|swiftpm|cocoapods" README.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): update stack and structure for Next.js + Supabase"
```

---

### Task 3: Rewrite `docs/specs/spec-data-model.md`

**Files:**
- Modify: `docs/specs/spec-data-model.md`

- [ ] **Step 1: Update the header file references (lines 3-4)**

Replace:
```markdown
**Datei:** `Volta/Models/Property.swift`  
**PropertySetupState:** `Volta/Views/PropertySetup/PropertySetupState.swift`
```
With:
```markdown
**Datei:** `web/lib/supabase/types.ts` (generiert) — Tabelle `properties`  
**PropertySetupState:** `web/app/(app)/properties/new/page.tsx` (React-Hook-Form-State)
```

- [ ] **Step 2: Translate the enum blocks**

Every ```` ```swift ... ``` ```` fenced enum block in this file becomes a fenced ```` ```typescript ... ``` ```` block using a union type, keeping the same German display labels as a comment (the values themselves become simple snake/camel identifiers, since the display string is now a separate label map documented once in `spec-design-system.md`/formatters, not encoded in the type).

Example — `AcquisitionType` (lines 12-19), replace:
```swift
enum AcquisitionType: String, CaseIterable {
    case kauf      = "Kauf"
    case erbschaft = "Erbschaft"
    case schenkung = "Schenkung"
    // ENTFERNT: kaufUndRenovierung, neubau
}
```
With:
```typescript
type AcquisitionType = 'kauf' | 'erbschaft' | 'schenkung';
// Anzeige-Labels: "Kauf" / "Erbschaft" / "Schenkung"
// ENTFERNT: kaufUndRenovierung, neubau
```

Apply the same pattern to `ParkingType` (lines 23-30 → `'nicht_vorhanden' | 'tiefgarage' | 'aussenstellplatz' | 'garage'`), `PropertyType` (lines 37-45 → `'apartment' | 'einfamilienhaus' | 'mehrfamilienhaus' | 'gewerbe' | 'grundstuck' | 'sonstiges'`), and `PropertyStatus` (lines 50-55 → `'vermietet' | 'leerstand' | 'mietgarantie'`).

- [ ] **Step 3: Translate the field-list blocks**

Every remaining ```` ```swift ... ``` ```` block in this file (Stammdaten, Objektdaten, Kauf & Nebenkosten, Einnahmen, Annahmen, Kosten — Wohnung, Kosten — Stellplatz, Finanzierung, AfA & Steuer — roughly lines 68-187) lists `var fieldName: Type` declarations. Change the fence tag from ` ```swift ` to ` ```typescript ` and translate each line's syntax:

- `var x: String` → `x: string`
- `var x: Double` → `x: number`
- `var x: Bool` → `x: boolean`
- `var x: Int` → `x: number`
- `var x: Date` → `x: string` (ISO date string over the wire)
- `var x: Type?` → `x: Type | null`
- Keep every trailing `//` comment as-is (they document product meaning, not syntax)

Example (Stammdaten block, lines 68-78), replace:
```swift
var name: String
var address: String
var city: String
var state: String
var postalCode: String
var propertyType: PropertyType
var acquisitionType: AcquisitionType      // Kauf / Erbschaft / Schenkung
var yearBuilt: Int?
var notes: String
```
With:
```typescript
name: string;
address: string;
city: string;
state: string;
postalCode: string;
propertyType: PropertyType;
acquisitionType: AcquisitionType;      // Kauf / Erbschaft / Schenkung
yearBuilt: number | null;
notes: string;
```

Apply the identical mechanical translation to every other field block in the file (Objektdaten, Kauf & Nebenkosten, Einnahmen, Annahmen, Kosten — Wohnung, Kosten — Stellplatz, Finanzierung, AfA & Steuer, and the "Berechnete Werte" / "Felder entfernt" sections which are already language-agnostic formulas and only need their fence tags changed from `swift` to `typescript` where present).

- [ ] **Step 4: Translate `PropertyPhoto`, `StatusEntry` model blocks**

Replace (lines 280-287):
```swift
@Model class PropertyPhoto {
    var filePath: String        // Pfad im App-Dokumentenordner
    var isCoverPhoto: Bool      // Titelbild — wird in Übersicht + Immobilienliste angezeigt
    var sortOrder: Int          // Reihenfolge in der Galerie
    var createdAt: Date
    var property: Property
}
```
With:
```typescript
// Postgres table: property_photos
interface PropertyPhoto {
  filePath: string;        // Pfad im Supabase Storage Bucket
  isCoverPhoto: boolean;   // Titelbild — wird in Übersicht + Immobilienliste angezeigt
  sortOrder: number;       // Reihenfolge in der Galerie
  createdAt: string;
  propertyId: string;      // FK auf properties.id
}
```

Replace (lines 300-307):
```swift
@Model class StatusEntry {
    var date: Date                      // Beginn dieses Status
    var status: PropertyStatus
    var incomeActualMonthly: Double?    // nur für .mietgarantie befüllt
    var notes: String
    var property: Property
}
```
With:
```typescript
// Postgres table: status_entries
interface StatusEntry {
  date: string;                          // Beginn dieses Status
  status: PropertyStatus;
  incomeActualMonthly: number | null;    // nur für 'mietgarantie' befüllt
  notes: string;
  propertyId: string;                    // FK auf properties.id
}
```

- [ ] **Step 5: Translate `ExtraordinaryCost` model block**

Replace (lines 316-325):
```swift
@Model class ExtraordinaryCost {
    var date: Date                      // Datum der Ausgabe
    var description: String             // z.B. "Vermietungsprovision", "WEG Sonderumlage"
    var amount: Double                  // Betrag (positiv gespeichert, als Ausgabe behandelt)
    var isDeductible: Bool              // steuerlich absetzbar (§9 EStG)?
    var notes: String?
    var property: Property
}
```
With:
```typescript
// Postgres table: extraordinary_costs
interface ExtraordinaryCost {
  date: string;                        // Datum der Ausgabe
  description: string;                 // z.B. "Vermietungsprovision", "WEG Sonderumlage"
  amount: number;                      // Betrag (positiv gespeichert, als Ausgabe behandelt)
  isDeductible: boolean;               // steuerlich absetzbar (§9 EStG)?
  notes: string | null;
  propertyId: string;                  // FK auf properties.id
}
```

- [ ] **Step 6: Update the `PropertySetupState` and `Migration` sections**

In the "PropertySetupState" section (around line 333-343), replace the intro sentence:
```markdown
Transienter State für `PropertySetupView` (eigene Seite, NavigationStack). Spiegelt alle `Property`-Felder exakt. Mapping in `PropertySetupView.saveProperty()`.
```
With:
```markdown
Transienter React-Hook-Form-State für die Route `properties/new` (eigene Seite, kein Modal). Spiegelt alle `properties`-Felder exakt. Mapping passiert beim Submit-Handler in `web/app/(app)/properties/new/page.tsx`.
```
Change the trailing ` ```swift ` fence (line 338) to ` ```typescript ` and translate its 4 fields the same way as Step 3.

In the "Migration" section (lines 347-355), replace:
```markdown
Alle neuen Felder: `= 0` / `= false` als SwiftData-Default — bestehende Daten bleiben intakt.
```
With:
```markdown
Alle neuen Spalten: `default 0` / `default false` in der Postgres-Migration — bestehende Zeilen bleiben intakt (siehe `CLAUDEvolta.md` → Postgres-Migrationen).
```
(The "Manuelle Nacharbeit durch Nutzer" list below stays unchanged — it's product content.)

- [ ] **Step 7: Verify no stray Swift/native references remain**

Run: `grep -niE "swift|@Model|xcode" docs/specs/spec-data-model.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add docs/specs/spec-data-model.md
git commit -m "docs(specs): translate data model spec to TS/Postgres"
```

---

### Task 4: Update `docs/specs/spec-calculations.md`

**Files:**
- Modify: `docs/specs/spec-calculations.md`

This file is almost entirely language-agnostic pseudocode/formulas already — only two fence tags need to change.

- [ ] **Step 1: Change fence tags**

Line 201 (before "## Abgeleitete Feldwerte" block) and line 256 (before "## Rendite-KPIs" block): change ` ```swift ` to ` ```typescript `. Content inside both blocks stays as-is — it's already valid formula notation that reads fine as TS pseudocode (e.g. `closingCostsTotal = ...`); no line-by-line syntax changes needed since there's no `var`/type annotations to translate in these two blocks.

- [ ] **Step 2: Verify no stray Swift references remain**

Run: `grep -niE "swift|@Model|xcode" docs/specs/spec-calculations.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spec-calculations.md
git commit -m "docs(specs): retag calculation pseudocode blocks as typescript"
```

---

### Task 5: Update `docs/specs/spec-design-system.md`

**Files:**
- Modify: `docs/specs/spec-design-system.md`

- [ ] **Step 1: Replace the SwiftUI implementation note (line 26)**

Replace:
```markdown
SwiftUI: `.background(.ultraThinMaterial)` + `.clipShape(RoundedRectangle(cornerRadius: 18))`
```
With:
```markdown
Tailwind: `bg-white/80 backdrop-blur-2xl rounded-[18px] border border-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.06)]` — als `.glass-card` Utility-Klasse definieren
```

- [ ] **Step 2: Replace the "SwiftUI" column header and values in the benchmark-color table (around line 128)**

Replace:
```markdown
| Farbe | Bedeutung | SwiftUI |
|-------|-----------|---------|
| Grün | Gut | `Color.green` / `#16a34a` |
| Orange | Ok | `Color.orange` / `#d97706` |
| Rot | Schlecht | `Color.red` / `#dc2626` |
```
With:
```markdown
| Farbe | Bedeutung | Tailwind |
|-------|-----------|---------|
| Grün | Gut | `text-green-600` / `#16a34a` |
| Orange | Ok | `text-amber-600` / `#d97706` |
| Rot | Schlecht | `text-red-600` / `#dc2626` |
```

- [ ] **Step 3: Replace "SF Mono" and "SF Symbol" references**

Find `SF Mono` (in the number-column section) and replace with `Tailwind \`font-mono\``.

Find `SF Symbol \`info.circle\`, 14pt` and replace with `lucide-react \`Info\`-Icon, 14px`.

- [ ] **Step 4: Verify no stray Swift/Apple-specific references remain**

Run: `grep -niE "swiftui|sf mono|sf symbol|uicolor|nscolor" docs/specs/spec-design-system.md`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/spec-design-system.md
git commit -m "docs(specs): translate design system SwiftUI notes to Tailwind"
```

---

### Task 6: Update `docs/specs/spec-verlauf-tab.md`

**Files:**
- Modify: `docs/specs/spec-verlauf-tab.md`

- [ ] **Step 1: Translate the "Datenmodelle" block (lines 137-152)**

Replace:
```swift
@Model class StatusEntry {
    var date: Date                    // Startdatum dieses Status
    var status: PropertyStatus
    var incomeActualMonthly: Double?  // nur für .mietgarantie
    var notes: String
}

@Model class ExtraordinaryCost {
    var date: Date
    var description: String
    var amount: Double
    var isDeductible: Bool            // steuerlich absetzbar (§9 EStG)?
    var notes: String?
}
```
With:
```typescript
// Postgres table: status_entries
interface StatusEntry {
  date: string;                       // Startdatum dieses Status
  status: PropertyStatus;
  incomeActualMonthly: number | null; // nur für 'mietgarantie'
  notes: string;
}

// Postgres table: extraordinary_costs
interface ExtraordinaryCost {
  date: string;
  description: string;
  amount: number;
  isDeductible: boolean;              // steuerlich absetzbar (§9 EStG)?
  notes: string | null;
}
```

- [ ] **Step 2: Verify no stray Swift references remain**

Run: `grep -niE "swift|@Model|xcode" docs/specs/spec-verlauf-tab.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spec-verlauf-tab.md
git commit -m "docs(specs): translate verlauf-tab data model to TS/Postgres"
```

---

### Task 7: Update `docs/specs/spec-property-setup.md`

**Files:**
- Modify: `docs/specs/spec-property-setup.md`

- [ ] **Step 1: Update the container heading and file reference**

Replace:
```markdown
## Property Setup Container (`PropertySetupView.swift`)
```
With:
```markdown
## Property Setup Container (`web/app/(app)/properties/new/page.tsx`)
```

- [ ] **Step 2: Update the routing/navigation description**

Replace:
```markdown
Aufruf: Vom Hauptscreen über einen "+" Button → pusht `PropertySetupView` auf den NavigationStack. Kein `.sheet` / kein `.fullScreenCover`.
```
With:
```markdown
Aufruf: Vom Hauptscreen über einen "+" Button → navigiert zur Route `properties/new`. Kein Modal/Dialog.
```

- [ ] **Step 3: Translate the `canFinish` condition block**

Replace:
```swift
!name.isEmpty && !address.isEmpty && !city.isEmpty
&& purchasePriceUnit > 0 && economicTransferDate != nil
&& coldRentMonthly > 0
&& loanAmount > 0 && interestRate > 0 && amortizationRate > 0
&& buildingValue > 0 && landValue > 0
```
With:
```typescript
name.length > 0 && address.length > 0 && city.length > 0
  && purchasePriceUnit > 0 && economicTransferDate != null
  && coldRentMonthly > 0
  && loanAmount > 0 && interestRate > 0 && amortizationRate > 0
  && buildingValue > 0 && landValue > 0
```
(Change the fence tag from ` ```swift ` to ` ```typescript ` accordingly.)

- [ ] **Step 4: Update the `saveProperty()` reference**

Replace:
```markdown
**`saveProperty()`** — Mapping `PropertySetupState` → `Property`:
```
With:
```markdown
**Submit-Handler** — Mapping React-Hook-Form-State → `properties`-Zeile:
```

- [ ] **Step 5: Verify no stray Swift references remain**

Run: `grep -niE "swift|navigationstack|\.sheet|\.fullscreencover|xcode" docs/specs/spec-property-setup.md`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add docs/specs/spec-property-setup.md
git commit -m "docs(specs): translate property setup spec to web routing"
```

---

### Task 8: Update `docs/specs/spec-hauptscreen.md`

**Files:**
- Modify: `docs/specs/spec-hauptscreen.md`

- [ ] **Step 1: Update the two `NavigationStack` references**

Replace (line 129):
```markdown
- **[+]** → öffnet `PropertySetupView` (NavigationStack push)
```
With:
```markdown
- **[+]** → navigiert zu `properties/new`
```

Replace (line 169):
```markdown
PropertySetupView (NavigationStack)
```
With:
```markdown
properties/new (eigene Route)
```

- [ ] **Step 2: Verify no stray Swift references remain**

Run: `grep -niE "swift|navigationstack|xcode" docs/specs/spec-hauptscreen.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spec-hauptscreen.md
git commit -m "docs(specs): translate hauptscreen navigation refs to web routing"
```

---

### Task 9: Update `docs/specs/spec-immobiliendaten-tab.md`

**Files:**
- Modify: `docs/specs/spec-immobiliendaten-tab.md`

- [ ] **Step 1: Update the file reference (line 14)**

Replace:
```markdown
## Layout (`ImmobiliendatenView.swift`)
```
With:
```markdown
## Layout (`web/app/(app)/properties/[id]/settings/page.tsx`)
```

- [ ] **Step 2: Verify no stray Swift references remain**

Run: `grep -niE "swift|xcode" docs/specs/spec-immobiliendaten-tab.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spec-immobiliendaten-tab.md
git commit -m "docs(specs): update immobiliendaten-tab file reference to web path"
```

---

### Task 10: Update `docs/specs/spec-cashflow-tab.md`

**Files:**
- Modify: `docs/specs/spec-cashflow-tab.md`

- [ ] **Step 1: Update the "SF Mono" reference (line 108)**

Replace:
```markdown
- Zahlen: SF Mono, rechtsbündig
```
With:
```markdown
- Zahlen: Tailwind `font-mono`, rechtsbündig
```

- [ ] **Step 2: Verify no stray Swift/Apple-specific references remain**

Run: `grep -niE "swift|sf mono|xcode" docs/specs/spec-cashflow-tab.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spec-cashflow-tab.md
git commit -m "docs(specs): translate cashflow-tab SF Mono reference to Tailwind"
```

---

### Task 11: Update `docs/specs/README.md`

**Files:**
- Modify: `docs/specs/README.md`

- [ ] **Step 1: Update the `NavigationStack` reference (line 23)**

Replace:
```markdown
- **Property Setup** = eigene Seite (NavigationStack), kein Modal
```
With:
```markdown
- **Property Setup** = eigene Route (`properties/new`), kein Modal
```

- [ ] **Step 2: Verify no stray Swift references remain**

Run: `grep -niE "swift|navigationstack|xcode" docs/specs/README.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/README.md
git commit -m "docs(specs): update property setup routing reference"
```

---

### Task 12: Verify `spec-finanzierung-tab.md`, `spec-overview-tab.md`, `spec-steuer-tab.md` need no changes

**Files:**
- Read only: `docs/specs/spec-finanzierung-tab.md`, `docs/specs/spec-overview-tab.md`, `docs/specs/spec-steuer-tab.md`

A prior grep pass found zero Swift/SwiftUI/SwiftData/Xcode/NavigationStack/SF-Mono/SF-Symbol references in these three files — they're pure product/UX spec content already framework-agnostic.

- [ ] **Step 1: Re-confirm with a fresh grep (specs may have moved since the plan was written)**

Run:
```bash
grep -niE "swift|xcode|\.sheet|navigationstack|@model|@observable|sf mono|sf symbol|uicolor|nscolor" docs/specs/spec-finanzierung-tab.md docs/specs/spec-overview-tab.md docs/specs/spec-steuer-tab.md
```
Expected: no output. If there IS output, translate the matched line(s) using the glossary at the top of this plan (same pattern as Tasks 6-10), then commit with an appropriate per-file message.

- [ ] **Step 2: If step 1 found nothing, no commit needed for this task** — move to Task 13.

---

### Task 13: Rewrite the tech-specific sections of `immobilien_datenmodell_v2.md`

**Files:**
- Modify: `immobilien_datenmodell_v2.md`

- [ ] **Step 1: Update the `@Observable` mention (line 594)**

Replace:
```markdown
KPIs schalten sich still frei sobald genügend Daten vorhanden sind. Kein Bestätigen-Button — Live-Berechnung via `@Observable`.
```
With:
```markdown
KPIs schalten sich still frei sobald genügend Daten vorhanden sind. Kein Bestätigen-Button — Live-Berechnung via React State (`useState`/`useMemo`, kein Server-Roundtrip nötig).
```

- [ ] **Step 2: Update the "Confirmation Sheet" wording in the Promote-Flow (around line 679)**

Replace:
```markdown
Confirmation Sheet:
```
With:
```markdown
Confirmation Dialog:
```
(Behavior/copy below it stays unchanged — this is a UI-pattern rename per the glossary, not a logic change.)

- [ ] **Step 3: Rewrite the "Dateistruktur" block (lines 696-712)**

Replace:
```
Models/
  InvestmentCalculation.swift          # SwiftData Model

ViewModels/
  InvestmentCalculatorViewModel.swift  # @Observable, KPI-Berechnungen, Sensitivität

Views/InvestmentCalculator/
  InvestmentCalculatorListView.swift   # Sidebar-Liste aller Kaufkandidaten
  InvestmentCalculatorDetailView.swift # Fixierter KPI-Panel + scrollbare Eingabe
  InvestmentKPIPanel.swift             # Fixierter KPI-Bereich
  InvestmentInputSections.swift        # Scrollbare Eingabefelder
  InvestmentSensitivityView.swift      # Slider-Bereich
  InvestmentPromoteSheet.swift         # Confirmation Sheet für Promote
```
With:
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

- [ ] **Step 4: Verify no stray Swift/native references remain**

Run: `grep -niE "swift|@Model|@Observable|xcode" immobilien_datenmodell_v2.md`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add immobilien_datenmodell_v2.md
git commit -m "docs(data-model): translate investment calculator file structure to web paths"
```

---

### Task 14: Verify `docs/specs/volta-ios-design-specification/README.md` needs no changes

**Files:**
- Read only: `docs/specs/volta-ios-design-specification/README.md`

This file is a handoff-bundle README from a design-export tool. It already says the target implementation technology is open ("React, Vue, native, whatever fits") — it was never Swift-specific, despite the directory name. No content edit needed.

- [ ] **Step 1: Confirm no Swift-specific instructions exist**

Run: `grep -niE "swift|swiftui|xcode" docs/specs/volta-ios-design-specification/README.md`
Expected: no output (confirmed already during plan research — this step just re-verifies before closing out the task list).

- [ ] **Step 2: No commit needed** — move to Task 15.

---

### Task 15: Final repo-wide verification

**Files:** none modified — verification only

- [ ] **Step 1: Grep all edited docs for any remaining native references**

Run:
```bash
grep -rniE "swiftui|swiftdata|@Model|@Observable|ObservableObject|xcode|cocoapods|\.swift[^a-z]" \
  CLAUDEvolta.md README.md immobilien_datenmodell_v2.md docs/specs/*.md
```
Expected: no output. If anything matches, go back to the relevant task above and fix it before proceeding.

- [ ] **Step 2: Confirm the Swift app itself is untouched**

Run: `git status Volta/ VoltaTests/`
Expected: clean (no changes) — this plan must not have touched the native app code.

- [ ] **Step 3: Confirm all doc commits landed**

Run: `git log --oneline -20`
Expected: one commit per task above (Tasks 1-11, 13; Tasks 12 and 14 only commit if their verification step found something to fix).
