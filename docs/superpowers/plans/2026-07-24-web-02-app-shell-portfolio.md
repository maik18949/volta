# Volta Web — Plan 2: App Shell & Portfolio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the invisible Plan-1 foundation (schema, auth, calculation engine) into the first real screen: a styled login/sign-up page, a sidebar app shell, and the Portfolio home screen showing aggregated KPIs plus a card per property — backed by real Supabase data run through the Plan-1 calculators.

**Architecture:** Server Components (`app/(app)/page.tsx`) fetch `properties` + `status_entries` for the signed-in user (RLS-scoped automatically) and pass them through a new orchestration layer (`lib/data/propertySummary.ts`) that composes the pure `lib/calculations/*` functions from Plan 1 into one per-property summary object. Presentation components (`components/`) stay dumb — no calculations, just rendering. Styling follows `docs/specs/spec-design-system.md` (glass cards, light-mode-only gradient background) via a Tailwind v4 `@theme` block.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Tailwind CSS v4, `lucide-react` for icons, the Plan-1 Supabase clients/types/calculations.

---

## Context: what this plan does NOT cover

Per `docs/specs/spec-hauptscreen.md`'s navigation diagram, tapping a Property Card goes to Property Detail (tabs: Übersicht/Cashflow/Steuer/Verlauf/Finanzierung/Immobiliendaten) and the `[+]` button goes to `properties/new` (the setup wizard) — neither exists yet (Plan 3: wizard, Plan 4: detail tabs). This plan adds minimal stub pages for both routes ("Coming soon") so links aren't dead, and picks those up as their own dedicated plans next.

The native app's spec describes swipe-to-delete on the property card (a touch gesture) — translated here to a delete icon-button + confirm dialog, the standard web affordance for the same action per `docs/specs/spec-hauptscreen.md`'s own confirmation-dialog copy.

---

## File Map

```
web/
├── app/
│   ├── globals.css                        # Rewrite: design tokens, gradient bg, .glass-card utility
│   ├── layout.tsx                         # Metadata title → "Volta"
│   ├── login/page.tsx                     # Rewrite: styled, combined login/sign-up copy
│   └── (app)/
│       ├── layout.tsx                     # Rewrite: adds Sidebar, keeps existing auth guard
│       ├── page.tsx                       # Rewrite: Portfolio home screen
│       └── properties/
│           ├── new/page.tsx               # Stub: "Coming soon" (Plan 3 builds this)
│           └── [id]/page.tsx              # Stub: "Coming soon" (Plan 4 builds this)
│
├── components/
│   ├── ui/
│   │   ├── GlassCard.tsx
│   │   ├── SectionLabel.tsx
│   │   └── StatusBadge.tsx
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── property/
│       ├── PortfolioCard.tsx
│       ├── PropertyCard.tsx
│       └── DeletePropertyButton.tsx
│
├── lib/
│   └── data/
│       ├── propertySummary.ts             # Composes lib/calculations/* into one per-property KPI object
│       └── properties.ts                  # Server-side fetch + delete Server Action
│
├── scripts/
│   └── seed.ts                            # Dev-only seed script (Dresdner ETW), per CLAUDEvolta.md § Debug-Seeding
│
└── tests/
    └── data/
        └── propertySummary.test.ts        # Vitest unit tests for the new orchestration layer
```

---

## Task 0: Tailwind Design Tokens & Background

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/app/layout.tsx`

Per `docs/specs/spec-design-system.md`: light-mode-only gradient background, glass-card utility, accent/text colors as CSS variables.

- [ ] **Step 1: Replace `web/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --color-app-bg-from: #dce8f8;
  --color-app-bg-to: #e8f0fb;
  --color-accent: #3b82f6;
  --color-section-label: #1d4ed8;
  --color-positive-strong: #15803d;
  --color-positive: #059669;
  --color-negative: #dc2626;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-dim: #94a3b8;
  --color-warning: #d97706;
}

@theme inline {
  --color-accent: var(--color-accent);
  --color-section-label: var(--color-section-label);
  --color-positive-strong: var(--color-positive-strong);
  --color-positive: var(--color-positive);
  --color-negative: var(--color-negative);
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-dim: var(--color-text-dim);
  --color-warning: var(--color-warning);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  min-height: 100%;
  background: linear-gradient(145deg, var(--color-app-bg-from) 0%, var(--color-app-bg-to) 100%);
  background-attachment: fixed;
  color: var(--color-text-primary);
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
```

- [ ] **Step 2: Update `web/app/layout.tsx` metadata**

Change the `metadata` export's `title`/`description`:

```typescript
export const metadata: Metadata = {
  title: "Volta",
  description: "Immobilien Portfolio Manager",
};
```

- [ ] **Step 3: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds, no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add web/app/globals.css web/app/layout.tsx
git commit -m "feat(design): add design-system tokens, gradient background, glass-card utility"
```

---

## Task 1: Shared UI primitives

**Files:**
- Create: `web/components/ui/GlassCard.tsx`
- Create: `web/components/ui/SectionLabel.tsx`
- Create: `web/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Create `web/components/ui/GlassCard.tsx`**

```tsx
import type { ReactNode } from 'react';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass-card p-4 ${className}`}>{children}</div>;
}
```

- [ ] **Step 2: Create `web/components/ui/SectionLabel.tsx`**

Per spec: 11px, weight 700, uppercase, letter-spacing 0.5px, color `#1d4ed8`.

```tsx
export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-section-label mt-2.5 mb-2">
      {children}
    </p>
  );
}
```

- [ ] **Step 3: Create `web/components/ui/StatusBadge.tsx`**

```tsx
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';

const STATUS_LABELS: Record<PropertyStatus, string> = {
  vermietet: 'Vermietet',
  leerstand: 'Leerstand',
  mietgarantie: 'Mietgarantie',
};

const STATUS_STYLES: Record<PropertyStatus, string> = {
  vermietet: 'bg-emerald-100 text-emerald-800',
  leerstand: 'bg-amber-100 text-amber-800',
  mietgarantie: 'bg-purple-100 text-purple-800',
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds (nothing imports these yet, but they must type-check standalone — run `pnpm exec tsc --noEmit`).

- [ ] **Step 5: Commit**

```bash
git add web/components/ui
git commit -m "feat(ui): add GlassCard, SectionLabel, StatusBadge primitives"
```

---

## Task 2: propertySummary — compose calculators into one per-property KPI object

**Files:**
- Create: `web/lib/data/propertySummary.ts`
- Create: `web/tests/data/propertySummary.test.ts`

This is the first place Plan 1's pure calculators get composed against a real `properties` row shape. It deliberately takes the generated `Database['public']['Tables']['properties']['Row']` and `Database['public']['Tables']['status_entries']['Row']` types as input, converting DB-native units (mostly monthly, but `property_tax_annual`, `property_management_annual`, `property_insurance_annual`, `property_tax_parking_annual` are annual — see `web/lib/supabase/types.ts`) into whatever each calculator function expects.

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/data/propertySummary.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01099',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: null,
    notes: '',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'nicht_vorhanden',
    parking_count: 0,
    heating_type: null,
    energy_efficiency_class: null,
    condition: null,
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: f.purchasePriceUnit,
    purchase_price_parking: f.purchasePriceParking,
    land_transfer_tax: f.landTransferTax,
    notary_costs: f.notaryCosts,
    land_registry_costs: f.landRegistryCosts,
    agent_fee: f.agentFee,
    appraisal_costs: f.appraisalCosts,
    renovation_modernization_costs: f.renovationModernizationCosts,
    renovation_afa_eligible: f.renovationAfaEligible,
    cold_rent_monthly: f.coldRentMonthly,
    warmmiete_monthly: null,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: f.vacancyRateAssumption,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: f.loanAmount,
    interest_rate: f.interestRate,
    amortization_rate: f.amortizationRate,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: f.monthlyMortgage,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: f.landValue,
    building_value: f.buildingValue,
    depreciation_rate: f.depreciationRate,
    marginal_tax_rate: f.marginalTaxRate,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeStatusEntry(overrides: Partial<StatusEntryRow> = {}): StatusEntryRow {
  return {
    id: 'status-1',
    property_id: 'prop-1',
    date: '2026-02-01',
    status: 'vermietet',
    income_actual_monthly: null,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computePropertySummary', () => {
  const property = makeProperty();
  const statusHistory = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('totalInvestment matches the fixture', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.totalInvestment).toBeCloseTo(f.totalInvestment, 0);
  });

  it('totalPurchasePrice, purchasePricePerSqm computed from unit+parking price', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.purchasePricePerSqm).toBeCloseTo(f.purchasePrice / 68, 0);
  });

  it('remainingDebtNow is less than the original loan (loan is amortizing)', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.remainingDebtNow).toBeLessThan(f.loanAmount);
    expect(result.remainingDebtNow).toBeGreaterThan(0);
  });

  it('remainingDebtNow is "–"-equivalent (0) when there is no loan', () => {
    const noLoanProperty = makeProperty({ loan_amount: 0, monthly_mortgage: 0 });
    const result = computePropertySummary(noLoanProperty, statusHistory, today);
    expect(result.remainingDebtNow).toBe(0);
  });

  it('netYield is a small positive-or-negative fraction, not NaN/Infinity', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(Number.isFinite(result.netYield)).toBe(true);
  });

  it('status reflects the most recent StatusEntry at/before today', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.currentStatus).toBe('vermietet');
  });

  it('cashflowAfterTaxMonthly is finite for the current month', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(Number.isFinite(result.cashflowAfterTaxMonthly)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test propertySummary`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/data/propertySummary.ts`**

```typescript
import type { Database } from '@/lib/supabase/types';
import { makeDate, firstDayOfMonth, monthsBetween } from '@/lib/calculations/dateHelpers';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { remainingDebt } from '@/lib/calculations/amortizationCalculator';
import type { StatusEntry, PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import { incomeForMonth, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import { cashflowBeforeTax, cashflowAfterTax, ownerBorneRecoverableWEForMonth } from '@/lib/calculations/cashflowCalculator';
import { annualTaxableIncome, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';
import { netYield as computeNetYield, equityUsed as computeEquityUsed, totalInvestment as computeTotalInvestment, closingCostsTotal as computeClosingCostsTotal } from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];

export interface PropertySummary {
  totalInvestment: number;
  totalPurchasePrice: number;
  purchasePricePerSqm: number;
  remainingDebtNow: number;
  netYield: number | null;
  currentStatus: PropertyStatus;
  cashflowAfterTaxMonthly: number;
}

function toStatusHistory(rows: StatusEntryRow[]): StatusEntry[] {
  return rows.map((row) => ({
    date: new Date(row.date + 'T00:00:00Z'),
    status: row.status as PropertyStatus,
    incomeActualMonthly: row.income_actual_monthly,
  }));
}

/**
 * Composes the pure lib/calculations/* functions against a real `properties` row
 * (DB-native units — mostly monthly, except property_tax_annual, property_management_annual,
 * property_insurance_annual, property_tax_parking_annual, which are annual).
 */
export function computePropertySummary(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  today: Date = new Date()
): PropertySummary {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');

  const closingCostsTotal = computeClosingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const totalPurchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const totalInvestment = computeTotalInvestment(
    totalPurchasePrice,
    closingCostsTotal,
    property.renovation_modernization_costs
  );
  const purchasePricePerSqm = property.living_area_sqm > 0 ? totalPurchasePrice / property.living_area_sqm : 0;

  const monthsSinceLoanStart = property.loan_amount > 0 ? monthsBetween(loanStartDate, today) - 1 : 0;
  const remainingDebtNow =
    property.loan_amount > 0
      ? remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart))
      : 0;

  const basis = afaBasis(property.building_value, closingCostsTotal, totalPurchasePrice, property.renovation_afa_eligible);

  const currentMonth = firstDayOfMonth(today);
  const currentYear = currentMonth.getUTCFullYear();

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const operatingCostsNonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    property.hoa_fee_maintenance_reserve_monthly +
    property.property_management_annual / 12 +
    property.property_insurance_annual / 12 +
    property.other_costs_monthly;

  const ownerBorneRecoverableWEMonthly = ownerBorneRecoverableWEForMonth(
    currentMonth,
    statusHistory,
    today,
    property.hoa_fee_recoverable_monthly,
    property.property_tax_annual
  );

  const incomeThisMonth = incomeForMonth(currentMonth, statusHistory, today, property.cold_rent_monthly, property.parking_rent_monthly);

  const taxableIncomeYear = annualTaxableIncome({
    year: currentYear,
    statusHistory,
    economicTransferDate,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    today,
  });
  // Sum of ownership day-fractions across the calendar year — matches taxCalculator's own
  // ownershipMonthEquivalent so the monthly divisor is consistent with the yearly figure it divides.
  let ownershipMonthsThisYear = 0;
  for (let month = 1; month <= 12; month++) {
    ownershipMonthsThisYear += ownershipDayFraction(makeDate(currentYear, month, 1), economicTransferDate);
  }
  const taxEffectYear = taxEffectYearly(taxableIncomeYear, property.marginal_tax_rate);
  const taxEffectThisMonth = taxEffectMonthly(taxEffectYear, ownershipMonthsThisYear || 12);

  const cashflowBeforeTaxThisMonth = cashflowBeforeTax({
    incomeActualMonthly: incomeThisMonth,
    monthlyMortgage: property.monthly_mortgage,
    operatingCostsNonRecoverableMonthly,
    ownerBorneRecoverableWEMonthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    extraordinaryCostsThisMonth: 0,
  });
  const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowBeforeTaxThisMonth, taxEffectThisMonth);

  const operatingCostsNonRecoverableYearly = operatingCostsNonRecoverableMonthly * 12;
  const effectiveGrossIncomeYearly =
    (property.cold_rent_monthly + property.parking_rent_monthly) * 12 * (1 - property.vacancy_rate_assumption);
  const netOperatingIncomeYearly = effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly;
  const netYield = computeNetYield(netOperatingIncomeYearly, totalInvestment);

  const currentStatus: PropertyStatus =
    [...statusHistory].reverse().find((e) => e.date.getTime() <= today.getTime())?.status ?? 'leerstand';

  return {
    totalInvestment,
    totalPurchasePrice,
    purchasePricePerSqm,
    remainingDebtNow,
    netYield,
    currentStatus,
    cashflowAfterTaxMonthly,
  };
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test propertySummary`
Expected: all 7 tests pass.

- [ ] **Step 5: Run full suite**

Run: `cd web && pnpm test`
Expected: all test files pass, no regressions in Plan 1's 73 tests.

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertySummary.ts web/tests/data/propertySummary.test.ts
git commit -m "feat(data): compose calculators into computePropertySummary"
```

---

## Task 3: Properties data-fetching + delete Server Action

**Files:**
- Create: `web/lib/data/properties.ts`

- [ ] **Step 1: Implement `web/lib/data/properties.ts`** (plain server-side data module — no `'use server'` directive here; the delete Server Action lives in its own file in Step 2, since a file can only have one module-level `'use server'` directive)

```typescript
import { createClient } from '@/lib/supabase/server';
import { computePropertySummary, type PropertySummary } from '@/lib/data/propertySummary';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export interface PropertyWithSummary {
  property: PropertyRow;
  summary: PropertySummary;
}

/** Fetches all properties for the signed-in user (RLS-scoped) plus each one's computed summary. */
export async function getPropertiesWithSummaries(): Promise<PropertyWithSummary[]> {
  const supabase = await createClient();

  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .order('sort_order', { ascending: true });

  if (propertiesError) throw propertiesError;
  if (!properties || properties.length === 0) return [];

  const { data: statusEntries, error: statusError } = await supabase
    .from('status_entries')
    .select('*')
    .in(
      'property_id',
      properties.map((p) => p.id)
    );

  if (statusError) throw statusError;

  const today = new Date();
  return properties.map((property) => {
    const ownStatusEntries = (statusEntries ?? []).filter((s) => s.property_id === property.id);
    return { property, summary: computePropertySummary(property, ownStatusEntries, today) };
  });
}

export interface PortfolioTotals {
  count: number;
  cashflowMonthly: number;
  totalInvestment: number;
  averageNetYield: number | null;
  remainingDebt: number;
}

export function computePortfolioTotals(items: PropertyWithSummary[]): PortfolioTotals {
  const count = items.length;
  const cashflowMonthly = items.reduce((sum, i) => sum + i.summary.cashflowAfterTaxMonthly, 0);
  const totalInvestment = items.reduce((sum, i) => sum + i.summary.totalInvestment, 0);
  const remainingDebt = items.reduce((sum, i) => sum + i.summary.remainingDebtNow, 0);
  // Weighted by totalInvestment, matching spec-hauptscreen.md: "Σ NOI / Σ totalInvestment"
  const weightedNetYieldNumerator = items.reduce(
    (sum, i) => sum + (i.summary.netYield ?? 0) * i.summary.totalInvestment,
    0
  );
  const averageNetYield = totalInvestment > 0 ? weightedNetYieldNumerator / totalInvestment : null;

  return { count, cashflowMonthly, totalInvestment, averageNetYield, remainingDebt };
}
```

- [ ] **Step 2: Create `web/lib/data/propertyActions.ts`** for the delete Server Action:

```typescript
// web/lib/data/propertyActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function deleteProperty(propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
}
```

- [ ] **Step 3: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds — no components import these yet, but they must compile standalone. Run `pnpm exec tsc --noEmit` to confirm.

- [ ] **Step 4: Commit**

```bash
git add web/lib/data/properties.ts web/lib/data/propertyActions.ts
git commit -m "feat(data): add properties fetch/aggregate helpers and delete Server Action"
```

---

## Task 4: PropertyCard, PortfolioCard, DeletePropertyButton

**Files:**
- Create: `web/components/property/PropertyCard.tsx`
- Create: `web/components/property/PortfolioCard.tsx`
- Create: `web/components/property/DeletePropertyButton.tsx`

Field mapping per `docs/specs/spec-hauptscreen.md` § Property Card / Portfolio-Karte.

- [ ] **Step 1: Create `web/components/property/PortfolioCard.tsx`**

```tsx
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PortfolioTotals } from '@/lib/data/properties';

export function PortfolioCard({ totals }: { totals: PortfolioTotals }) {
  const cashflowColor = totals.cashflowMonthly >= 0 ? 'text-positive-strong' : 'text-negative';

  return (
    <GlassCard>
      <p className="text-[13px] font-semibold text-text-secondary">{totals.count} Immobilien</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-text-secondary">Cashflow/Mon</p>
          <p className={`text-[18px] font-extrabold ${cashflowColor}`}>{formatCurrency(totals.cashflowMonthly)}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Gesamtinvestment</p>
          <p className="text-[18px] font-extrabold text-text-primary">{formatCurrency(totals.totalInvestment)}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Ø Nettorendite</p>
          <p className="text-[18px] font-extrabold text-text-primary">
            {totals.averageNetYield !== null ? formatPercent(totals.averageNetYield) : '–'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Restschuld</p>
          <p className="text-[18px] font-extrabold text-text-primary">{formatCurrency(totals.remainingDebt)}</p>
        </div>
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Create `web/components/property/PropertyCard.tsx`**

```tsx
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DeletePropertyButton } from '@/components/property/DeletePropertyButton';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PropertyWithSummary } from '@/lib/data/properties';

export function PropertyCard({ property, summary }: PropertyWithSummary) {
  const cashflowColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';
  const transferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const sinceLabel = `${String(transferDate.getUTCMonth() + 1).padStart(2, '0')}/${String(transferDate.getUTCFullYear()).slice(2)}`;

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="h-[160px] bg-gradient-to-br from-slate-200 to-slate-300" />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/properties/${property.id}`} className="font-bold text-text-primary hover:underline">
            {property.name}
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={summary.currentStatus} />
            <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          {property.address}, {property.city}
        </p>

        <div className="my-2 h-px bg-black/[0.06]" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-text-secondary">Cashflow/Mon</p>
            <p className={`text-[15px] font-bold ${cashflowColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Nettorendite</p>
            <p className="text-[15px] font-bold text-text-primary">
              {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Kaufpreis/m²</p>
            <p className="text-[15px] font-bold text-text-primary">{formatCurrency(summary.purchasePricePerSqm)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Restschuld</p>
            <p className="text-[15px] font-bold text-text-primary">
              {summary.remainingDebtNow > 0 ? formatCurrency(summary.remainingDebtNow) : '–'}
            </p>
          </div>
        </div>

        <div className="my-2 h-px bg-black/[0.06]" />

        <p className="font-mono text-xs text-text-dim">
          {property.living_area_sqm} m² · {property.rooms ?? '–'} Zi · seit {sinceLabel}
        </p>
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 3: Create `web/components/property/DeletePropertyButton.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProperty } from '@/lib/data/propertyActions';

export function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `${propertyName} löschen?\n\nDiese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.`
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteProperty(propertyId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`${propertyName} löschen`}
      className="text-text-dim hover:text-negative disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}
```

- [ ] **Step 4: Add `lucide-react` dependency**

Run: `cd web && pnpm add lucide-react`

- [ ] **Step 5: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add web/components/property web/package.json web/pnpm-lock.yaml
git commit -m "feat(ui): add PropertyCard, PortfolioCard, DeletePropertyButton"
```

---

## Task 5: Sidebar + app shell layout

**Files:**
- Create: `web/components/layout/Sidebar.tsx`
- Modify: `web/app/(app)/layout.tsx`

Per `CLAUDEvolta.md` § Navigationsstruktur: narrow sidebar left (Portfolio · Investment-Rechner · Einstellungen), content right.

- [ ] **Step 1: Create `web/components/layout/Sidebar.tsx`**

```tsx
import Link from 'next/link';
import { Home, Calculator, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Portfolio', icon: Home },
  { href: '/investment-calculator', label: 'Investment-Rechner', icon: Calculator },
  { href: '/settings', label: 'Einstellungen', icon: Settings },
];

export function Sidebar() {
  return (
    <nav className="w-16 shrink-0 border-r border-black/[0.08] py-4 flex flex-col items-center gap-6">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} title={label} aria-label={label} className="text-text-secondary hover:text-accent">
          <Icon size={22} />
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Rewrite `web/app/(app)/layout.tsx`**

Keep the existing server-side auth guard, add the sidebar shell around `children`:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/components/layout web/app/\(app\)/layout.tsx
git commit -m "feat(shell): add sidebar navigation to the protected app layout"
```

---

## Task 6: Portfolio page (rewrite `app/(app)/page.tsx`)

**Files:**
- Modify: `web/app/(app)/page.tsx`

Per `docs/specs/spec-hauptscreen.md`: portfolio card, sort control, property grid, empty state, `[+]` link.

- [ ] **Step 1: Rewrite `web/app/(app)/page.tsx`**

```tsx
import Link from 'next/link';
import { Plus, Home as HomeIcon } from 'lucide-react';
import { getPropertiesWithSummaries, computePortfolioTotals } from '@/lib/data/properties';
import { PortfolioCard } from '@/components/property/PortfolioCard';
import { PropertyCard } from '@/components/property/PropertyCard';

export default async function PortfolioPage() {
  const items = await getPropertiesWithSummaries();
  const totals = computePortfolioTotals(items);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Volta</h1>
        <Link
          href="/properties/new"
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Immobilie
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 p-12 text-center">
          <HomeIcon size={40} className="text-text-dim" />
          <p className="text-text-secondary">
            Noch keine Immobilie.
            <br />
            Füge deine erste Immobilie hinzu.
          </p>
          <Link href="/properties/new" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white">
            + Immobilie hinzufügen
          </Link>
        </div>
      ) : (
        <>
          <PortfolioCard totals={totals} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(({ property, summary }) => (
              <PropertyCard key={property.id} property={property} summary={summary} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

Sort control (Datum / A–Z / Manuell) is deliberately deferred — `properties` is already ordered by `sort_order` per `getPropertiesWithSummaries`, which is a reasonable single default for now; add the picker once there's more than a handful of test properties to justify it (tracked, not blocking this plan).

- [ ] **Step 2: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/\(app\)/page.tsx
git commit -m "feat(portfolio): render aggregated KPIs and property grid on the home screen"
```

---

## Task 7: Stub routes for properties/new and properties/[id]

**Files:**
- Create: `web/app/(app)/properties/new/page.tsx`
- Create: `web/app/(app)/properties/[id]/page.tsx`

- [ ] **Step 1: Create `web/app/(app)/properties/new/page.tsx`**

```tsx
export default function NewPropertyPage() {
  return <p className="text-text-secondary">Property-Setup-Wizard — kommt in Plan 3.</p>;
}
```

- [ ] **Step 2: Create `web/app/(app)/properties/[id]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: property } = await supabase.from('properties').select('name').eq('id', id).single();

  if (!property) notFound();

  return <p className="text-text-secondary">{property.name} — Detail-Tabs kommen in Plan 4.</p>;
}
```

- [ ] **Step 3: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app/\(app\)/properties
git commit -m "feat(stubs): add placeholder routes for properties/new and properties/[id]"
```

---

## Task 8: Combined login/sign-up page restyle

**Files:**
- Modify: `web/app/login/page.tsx`

Magic Link is passwordless — `signInWithOtp` auto-creates a new Supabase Auth user on first use, so one page covers both "sign in" and "sign up." Restyle per the design system and make that explicit in copy.

- [ ] **Step 1: Rewrite `web/app/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <GlassCard className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-text-primary">Volta</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Melde dich an oder erstelle ein neues Konto — mit derselben E-Mail-Adresse funktioniert beides.
        </p>

        {status === 'sent' ? (
          <p className="mt-6 text-sm text-text-primary">
            Magic Link gesendet — bitte E-Mail-Postfach prüfen und den Link im selben Browser öffnen, in dem du ihn
            angefordert hast.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-text-secondary">
              E-Mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === 'sending' ? 'Wird gesendet…' : 'Magic Link senden'}
            </button>
            {status === 'error' && (
              <p role="alert" className="text-sm text-negative">
                Fehler beim Senden — bitte erneut versuchen.
              </p>
            )}
          </form>
        )}
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification note**

Same limitation as Plan 1 Task 3: the real magic-link email round-trip can't be verified in an automated sandbox. Verify `pnpm build` succeeds and the page renders (`curl -sI http://localhost:3000/login` while `pnpm dev` runs → expect `200`).

- [ ] **Step 3: Commit**

```bash
git add web/app/login/page.tsx
git commit -m "feat(auth): restyle login page as a combined sign-in/sign-up form"
```

---

## Task 9: Debug seed script

**Files:**
- Create: `web/scripts/seed.ts`

Per `CLAUDEvolta.md` § Debug-Seeding: dev-only, uses the Supabase service-role key (never committed, never run in production), inserts the Dresdner ETW reference property (same values as the shared test fixture) tied to a specific dev user looked up by email.

- [ ] **Step 1: Create `web/scripts/seed.ts`**

```typescript
// web/scripts/seed.ts — dev-only. Never run against production.
// Requires SUPABASE_SERVICE_ROLE_KEY and SEED_USER_EMAIL in web/.env.local (not committed).
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seedUserEmail = process.env.SEED_USER_EMAIL;

  if (!url || !serviceRoleKey || !seedUserEmail) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SEED_USER_EMAIL in web/.env.local'
    );
  }

  const admin = createClient<Database>(url, serviceRoleKey);

  const {
    data: { users },
    error: listError,
  } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.find((u) => u.email === seedUserEmail);
  if (!user) {
    throw new Error(`No auth user found with email ${seedUserEmail} — sign in via Magic Link first.`);
  }

  const { data: property, error: insertError } = await admin
    .from('properties')
    .insert({
      user_id: user.id,
      name: 'ETW Dresden Neustadt',
      address: 'Dresdner Str. 12',
      city: 'Dresden',
      state: 'Sachsen',
      postal_code: '01099',
      property_type: 'apartment',
      acquisition_type: 'kauf',
      living_area_sqm: 68,
      rooms: 3,
      purchase_date: '2025-10-01',
      economic_transfer_date: '2026-02-01',
      purchase_price_unit: 263_600,
      purchase_price_parking: 15_000,
      land_transfer_tax: 15_323,
      notary_costs: 3_631.96,
      land_registry_costs: 1_180,
      cold_rent_monthly: 950,
      parking_rent_monthly: 48,
      vacancy_rate_assumption: 0.03,
      hoa_fee_total_monthly: 417,
      is_hoa_unit_split: true,
      hoa_fee_recoverable_monthly: 292,
      hoa_fee_maintenance_reserve_monthly: 34.76,
      property_tax_annual: 205,
      property_management_annual: 396,
      loan_amount: 230_000,
      interest_rate: 0.043,
      amortization_rate: 0.01,
      loan_start_date: '2025-10-01',
      monthly_mortgage: 1_242.85,
      land_value: 50_600,
      building_value: 228_000,
      depreciation_rate: 0.0384,
      marginal_tax_rate: 0.42,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  const { error: statusError } = await admin.from('status_entries').insert({
    property_id: property.id,
    date: '2026-02-01',
    status: 'vermietet',
  });

  if (statusError) throw statusError;

  console.log(`Seeded property ${property.id} for ${seedUserEmail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add a package.json script**

In `web/package.json`, add to `"scripts"`:

```json
"seed": "tsx scripts/seed.ts"
```

Add `tsx` as a dev dependency: `cd web && pnpm add -D tsx`

- [ ] **Step 3: Manual verification note**

Running this requires a real `SUPABASE_SERVICE_ROLE_KEY` (from the Supabase dashboard → Project Settings → API — a secret, never fetched or committed by an agent) and `SEED_USER_EMAIL` set to an email that has already signed in once via Magic Link. This can't be exercised in an automated sandbox — verify `pnpm build`/`tsc --noEmit` succeed, and leave actually running `pnpm seed` to a human with those two env vars set locally.

- [ ] **Step 4: Commit**

```bash
git add web/scripts/seed.ts web/package.json web/pnpm-lock.yaml
git commit -m "feat(dev): add debug seed script for the Dresdner ETW reference property"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** `spec-design-system.md` (colors, glass card) → Task 0/1. `spec-hauptscreen.md` (Portfolio-Karte formulas, Property Card fields, empty state, delete confirmation, `[+]` action) → Tasks 2–7. `CLAUDEvolta.md` § Navigationsstruktur (sidebar) → Task 5. § Debug-Seeding → Task 9. Combined login/sign-up per user's explicit request → Task 8.
- [ ] **Not covered here (next plans):** Property Setup Wizard (Plan 3), Property Detail tabs (Plan 4), Investment Calculator (Plan 5), sort picker beyond the default `sort_order`, swipe/drag-reorder, photo upload.
- [ ] **Placeholder scan:** no TBD/TODO left in any step.
- [ ] **Type consistency:** `PropertySummary`/`PropertyWithSummary`/`PortfolioTotals` field names match between `propertySummary.ts`, `properties.ts`, `PropertyCard.tsx`, `PortfolioCard.tsx` — no drift (e.g. `cashflowAfterTaxMonthly` used consistently, not `cashflowMonthly` in one place and `monthlyCashflow` in another).
