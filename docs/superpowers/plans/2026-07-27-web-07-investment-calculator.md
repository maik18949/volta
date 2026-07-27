# Volta Web — Plan 7: Investment Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Investment Calculator (`/investment-calculator`) — a pre-purchase analysis tool for candidate properties, with a live KPI panel that unlocks in stages as the user fills in more data, a 5-parameter sensitivity analysis (non-persistent slider overrides), and a "Als Immobilie übernehmen" flow that promotes a calculation into a real `properties` row.

**Architecture:** A new `investment_calculations` table stores the candidate's raw inputs (a financial-only subset of the `properties` schema — no address/rooms/Objektdaten, since a pre-purchase candidate has no physical inspection data yet). `lib/data/investmentCalculation.ts` is a pure orchestration module — no I/O — that composes the **already-existing** `lib/calculations/kpiCalculator.ts`, `amortizationCalculator.ts`, `depreciationCalculator.ts`, and `taxCalculator.ts` functions (the same ones `propertySummary.ts` and the wizard steps already use) into one `computeInvestmentKPIs(values, sensitivity)` function. No new pure calculation functions are needed — this plan is 100% composition of Plan 1's existing calculation layer. The detail page is a client component with a fixed KPI panel on top and a scrollable input form below (dedicated input-section components built from the existing generic `CurrencyField`/`PercentField`/`TextField` primitives — **not** a reuse of the wizard's `Step*` components, since those require the full `WizardFormValues` shape including Stammdaten/Objektdaten fields that don't apply to a pre-purchase candidate). Persistence uses the same 600ms-debounced auto-save `watch()` pattern as the Immobiliendaten tab (`PropertyEditForm.tsx`) — sensitivity slider deltas are React `useState`, never sent to the server, so they reset automatically on navigation.

**Tech Stack:** Next.js App Router (RSC + Client Components), Supabase (Postgres + RLS), react-hook-form, Tailwind, Vitest.

**Depends on:** Plan 1 (`lib/calculations/*`), Plan 2 (`GlassCard`, design tokens, the `/investment-calculator` sidebar link — already wired in `components/layout/Sidebar.tsx:6`), Plan 3 (`CurrencyField`, `PercentField`, `TextField` in `components/ui/`).

**Not covered here:** Editing an already-promoted calculation's inputs after promotion (the detail page still works, but nothing re-syncs the promoted property — matches the native app's original scope). Photo upload for candidates (Plan 8 is property-only).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/supabase/migrations/<timestamp>_investment_calculations.sql` | Create | `investment_calculations` table + RLS |
| `web/lib/data/investmentCalculation.ts` | Create | Types, `computeInvestmentKPIs` (pure), stage-unlock booleans |
| `web/lib/data/investmentCalculationActions.ts` | Create | `createInvestmentCalculation`, `updateInvestmentCalculation`, `deleteInvestmentCalculation`, `promoteInvestmentCalculation` server actions |
| `web/lib/data/investmentCalculations.ts` | Create | `getInvestmentCalculations` (list), `getInvestmentCalculation` (single) — RLS-scoped reads |
| `web/lib/formatters.ts` | Modify | Add `formatMultiplier` |
| `web/components/investment-calculator/InvestmentCalculatorList.tsx` | Create | List page body (cards, "+ Neu" button) |
| `web/components/investment-calculator/NewCalculationButton.tsx` | Create | Client button — calls `createInvestmentCalculation`, navigates to detail |
| `web/components/investment-calculator/InvestmentKPIPanel.tsx` | Create | Fixed 8-KPI panel with stage-based lock icons |
| `web/components/investment-calculator/InvestmentInputSections.tsx` | Create | Objekt/Kauf/Einnahmen/Finanzierung/Kosten/AfA-Steuer input sections |
| `web/components/investment-calculator/InvestmentSensitivityPanel.tsx` | Create | 5 sensitivity sliders + reset |
| `web/components/investment-calculator/InvestmentCalculatorDetail.tsx` | Create | Form shell: KPI panel + inputs + sensitivity + autosave + promote button |
| `web/components/investment-calculator/PromoteDialog.tsx` | Create | Confirmation dialog → `promoteInvestmentCalculation` |
| `web/app/(app)/investment-calculator/page.tsx` | Modify | Replace stub with real list page |
| `web/app/(app)/investment-calculator/[id]/page.tsx` | Create | Detail page |
| `web/tests/data/investmentCalculation.test.ts` | Create | Unit tests for `computeInvestmentKPIs` |

---

### Task 1: `investment_calculations` migration

**Files:**
- Create: `web/supabase/migrations/20260727120000_investment_calculations.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run: `cd web && supabase db push`
Expected: `Applying migration 20260727120000_investment_calculations.sql...` then success, no errors.

- [ ] **Step 3: Regenerate TypeScript types**

Run: `cd web && supabase gen types typescript --linked > lib/supabase/types.ts`
Expected: `lib/supabase/types.ts` now has a `public.Tables.investment_calculations` entry with `Row`/`Insert`/`Update` matching every column above.

- [ ] **Step 4: Verify the build still compiles**

Run: `cd web && npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/20260727120000_investment_calculations.sql web/lib/supabase/types.ts
git commit -m "feat(db): create investment_calculations table"
```

---

### Task 2: `formatMultiplier`

**Files:**
- Modify: `web/lib/formatters.ts`
- Test: `web/tests/formatters.test.ts` (create if it doesn't already exist — check first)

- [ ] **Step 1: Write the failing test**

Check whether `web/tests/formatters.test.ts` already exists (run `ls web/tests/formatters.test.ts`). If it exists, add this test into its existing `describe` block; if not, create it with this content:

```typescript
import { describe, it, expect } from 'vitest';
import { formatMultiplier } from '@/lib/formatters';

describe('formatMultiplier', () => {
  it('formats a decimal factor with one decimal and an × suffix', () => {
    expect(formatMultiplier(21.347)).toBe('21,3×');
  });

  it('formats a whole number with a trailing .0', () => {
    expect(formatMultiplier(20)).toBe('20,0×');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/formatters.test.ts`
Expected: FAIL — `formatMultiplier` is not exported from `@/lib/formatters`.

- [ ] **Step 3: Implement**

In `web/lib/formatters.ts`, add after `formatNumber`:

```typescript
/** Kaufpreisfaktor / Mietmultiplikator — plain number with one decimal and a × suffix. */
export function formatMultiplier(value: number): string {
  return `${formatNumber(value, 1)}×`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/formatters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/formatters.ts web/tests/formatters.test.ts
git commit -m "feat(formatters): add formatMultiplier"
```

---

### Task 3: `computeInvestmentKPIs`

**Files:**
- Create: `web/lib/data/investmentCalculation.ts`
- Test: `web/tests/data/investmentCalculation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// web/tests/data/investmentCalculation.test.ts
import { describe, it, expect } from 'vitest';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';

function makeValues(overrides: Partial<InvestmentCalculatorValues> = {}): InvestmentCalculatorValues {
  return {
    name: 'Test ETW',
    purchasePriceUnit: 250_000,
    purchasePriceParking: 13_600,
    landTransferTax: 15_027,
    notaryCosts: 3_500,
    landRegistryCosts: 1_200,
    agentFee: 0,
    appraisalCosts: 0,
    renovationModernizationCosts: 0,
    renovationAfaEligible: 0,
    coldRentMonthly: 950,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    vacancyRateAssumption: 0.03,
    loanAmount: 230_000,
    interestRate: 0.043,
    amortizationRate: 0.01,
    monthlyMortgage: 1_015,
    loanStartDate: '2026-01-01',
    hoaFeeTotalMonthly: 0,
    hoaFeeRecoverableMonthly: 0,
    hoaFeeMaintenanceReserveMonthly: 0,
    propertyManagementAnnual: 0,
    propertyInsuranceAnnual: 0,
    otherCostsMonthly: 0,
    buildingValue: 0,
    depreciationRate: 0.02,
    marginalTaxRate: 0,
    ...overrides,
  };
}

describe('computeInvestmentKPIs — stage unlocking', () => {
  it('hasBaseData is true once name, purchase price and rent are set', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.hasBaseData).toBe(true);
  });

  it('hasBaseData is false when name is empty', () => {
    const kpis = computeInvestmentKPIs(makeValues({ name: '' }), ZERO_SENSITIVITY);
    expect(kpis.hasBaseData).toBe(false);
  });

  it('hasFinancingData is false without a loan', () => {
    const kpis = computeInvestmentKPIs(makeValues({ loanAmount: 0 }), ZERO_SENSITIVITY);
    expect(kpis.hasFinancingData).toBe(false);
  });

  it('hasFinancingData is true with loan, interest and amortization set', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.hasFinancingData).toBe(true);
  });

  it('hasCostData requires financing data plus at least one cost field', () => {
    const withoutCosts = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(withoutCosts.hasCostData).toBe(false);

    const withCosts = computeInvestmentKPIs(makeValues({ hoaFeeTotalMonthly: 180 }), ZERO_SENSITIVITY);
    expect(withCosts.hasCostData).toBe(true);
  });

  it('hasTaxData requires cost data plus marginal tax rate and building value', () => {
    const withCosts = computeInvestmentKPIs(makeValues({ hoaFeeTotalMonthly: 180 }), ZERO_SENSITIVITY);
    expect(withCosts.hasTaxData).toBe(false);

    const withTax = computeInvestmentKPIs(
      makeValues({ hoaFeeTotalMonthly: 180, buildingValue: 180_000, marginalTaxRate: 0.42 }),
      ZERO_SENSITIVITY
    );
    expect(withTax.hasTaxData).toBe(true);
  });
});

describe('computeInvestmentKPIs — KPI values', () => {
  it('grossYield = (coldRent + parkingRent) * 12 / purchasePrice', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const purchasePrice = 250_000 + 13_600;
    expect(kpis.grossYield).toBeCloseTo((950 * 12) / purchasePrice, 4);
  });

  it('ltvRatio = loanAmount / totalInvestment', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.ltvRatio).toBeCloseTo(kpis.loanAmount / kpis.totalInvestment, 4);
  });

  it('cashOnCashReturn is null until cost data is present', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.cashOnCashReturn).toBeNull();
  });

  it('cashflowAfterTaxMonthly equals cashflowAfterDebtMonthly when marginalTaxRate is 0', () => {
    const kpis = computeInvestmentKPIs(
      makeValues({ hoaFeeTotalMonthly: 180, buildingValue: 180_000, marginalTaxRate: 0 }),
      ZERO_SENSITIVITY
    );
    expect(kpis.cashflowAfterTaxMonthly).toBeCloseTo(kpis.cashflowAfterDebtMonthly, 2);
  });
});

describe('computeInvestmentKPIs — sensitivity', () => {
  it('rentDelta shifts effectiveColdRentMonthly and increases cashflow', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, rentDelta: 100 });
    expect(bumped.effectiveColdRentMonthly).toBeCloseTo(base.effectiveColdRentMonthly + 100, 2);
    expect(bumped.cashflowAfterDebtMonthly).toBeGreaterThan(base.cashflowAfterDebtMonthly);
  });

  it('rentDelta never pushes effective rent below zero', () => {
    const kpis = computeInvestmentKPIs(makeValues({ coldRentMonthly: 50 }), { ...ZERO_SENSITIVITY, rentDelta: -500 });
    expect(kpis.effectiveColdRentMonthly).toBe(0);
  });

  it('rateDelta recalculates the effective monthly mortgage', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, rateDelta: 0.01 });
    expect(bumped.effectiveInterestRate).toBeCloseTo(base.effectiveInterestRate + 0.01, 4);
    expect(bumped.monthlyMortgage).toBeGreaterThan(base.monthlyMortgage);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/investmentCalculation.test.ts`
Expected: FAIL — `@/lib/data/investmentCalculation` does not exist.

- [ ] **Step 3: Implement**

```typescript
// web/lib/data/investmentCalculation.ts
import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { taxLineItemsForScenario } from '@/lib/calculations/taxCalculator';
import { taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';
import { cashflowAfterTax } from '@/lib/calculations/cashflowCalculator';
import {
  closingCostsTotal as computeClosingCostsTotal,
  totalInvestment as computeTotalInvestment,
  equityUsed as computeEquityUsed,
  effectiveGrossIncomeYearly,
  netOperatingIncomeYearly as computeNetOperatingIncomeYearly,
  hoaNonRecoverableMonthly,
  mietmultiplikator as computeMietmultiplikator,
  grossYield as computeGrossYield,
  netYield as computeNetYield,
  cashOnCashReturn as computeCashOnCashReturn,
  dscrNOI as computeDscrNOI,
  ltvRatio as computeLtvRatio,
  breakEvenRentMonthly as computeBreakEvenRentMonthly,
} from '@/lib/calculations/kpiCalculator';

export interface InvestmentCalculatorValues {
  name: string;
  purchasePriceUnit: number;
  purchasePriceParking: number;
  landTransferTax: number;
  notaryCosts: number;
  landRegistryCosts: number;
  agentFee: number;
  appraisalCosts: number;
  renovationModernizationCosts: number;
  renovationAfaEligible: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  otherIncomeMonthly: number;
  vacancyRateAssumption: number;
  loanAmount: number;
  interestRate: number;
  amortizationRate: number;
  monthlyMortgage: number;
  loanStartDate: string;
  hoaFeeTotalMonthly: number;
  hoaFeeRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  propertyManagementAnnual: number;
  propertyInsuranceAnnual: number;
  otherCostsMonthly: number;
  buildingValue: number;
  depreciationRate: number;
  marginalTaxRate: number;
}

export interface SensitivityDeltas {
  rentDelta: number; // € per month, applied to coldRentMonthly
  rateDelta: number; // decimal, applied to interestRate
  priceDelta: number; // € applied to purchasePriceUnit
  vacancyDelta: number; // decimal, applied to vacancyRateAssumption
  maintenanceDelta: number; // € per month, applied to the non-recoverable HOA fee
}

export const ZERO_SENSITIVITY: SensitivityDeltas = {
  rentDelta: 0,
  rateDelta: 0,
  priceDelta: 0,
  vacancyDelta: 0,
  maintenanceDelta: 0,
};

export interface InvestmentKPIs {
  effectiveColdRentMonthly: number;
  effectiveInterestRate: number;
  effectivePurchasePriceUnit: number;
  effectiveVacancyRate: number;
  purchasePrice: number;
  closingCostsTotal: number;
  totalInvestment: number;
  loanAmount: number;
  equityUsed: number;
  monthlyMortgage: number;
  netOperatingIncomeYearly: number;
  cashflowAfterDebtMonthly: number;
  cashflowAfterTaxMonthly: number;
  mietmultiplikator: number | null;
  grossYield: number | null;
  netYield: number | null;
  cashOnCashReturn: number | null;
  dscrNOI: number | null;
  ltvRatio: number | null;
  breakEvenRentMonthly: number | null;
  hasBaseData: boolean;
  hasFinancingData: boolean;
  hasCostData: boolean;
  hasTaxData: boolean;
}

/**
 * Pure composition of Plan 1's calculation layer for a pre-purchase candidate.
 * Sensitivity deltas are applied here (not persisted) so the UI can render
 * live "what-if" KPIs from slider input without a server round-trip.
 */
export function computeInvestmentKPIs(
  values: InvestmentCalculatorValues,
  sensitivity: SensitivityDeltas,
  today: Date = new Date()
): InvestmentKPIs {
  const effectiveColdRentMonthly = Math.max(0, values.coldRentMonthly + sensitivity.rentDelta);
  const effectiveInterestRate = Math.max(0.001, values.interestRate + sensitivity.rateDelta);
  const effectivePurchasePriceUnit = Math.max(1, values.purchasePriceUnit + sensitivity.priceDelta);
  const effectiveVacancyRate = Math.max(0, Math.min(1, values.vacancyRateAssumption + sensitivity.vacancyDelta));

  const baseNonRecoverableMonthly = hoaNonRecoverableMonthly(
    values.hoaFeeTotalMonthly,
    values.hoaFeeRecoverableMonthly,
    values.hoaFeeMaintenanceReserveMonthly
  );
  const effectiveNonRecoverableMonthly = Math.max(0, baseNonRecoverableMonthly + sensitivity.maintenanceDelta);

  const purchasePrice = effectivePurchasePriceUnit + values.purchasePriceParking;
  const closingCostsTotal = computeClosingCostsTotal(
    values.landTransferTax,
    values.notaryCosts,
    values.landRegistryCosts,
    values.agentFee,
    values.appraisalCosts
  );
  const totalInvestment = computeTotalInvestment(purchasePrice, closingCostsTotal, values.renovationModernizationCosts);
  const equityUsed = computeEquityUsed(totalInvestment, values.loanAmount);

  // Sensitivity on interestRate must recompute the mortgage rate live — the stored
  // monthlyMortgage reflects the base rate the user actually entered/overrode.
  const monthlyMortgage =
    sensitivity.rateDelta === 0
      ? values.monthlyMortgage
      : monthlyMortgageCalc(values.loanAmount, effectiveInterestRate, values.amortizationRate);
  const debtServiceAnnual = monthlyMortgage * 12;

  const grossIncomeMonthly = effectiveColdRentMonthly + values.parkingRentMonthly + values.otherIncomeMonthly;
  const effectiveGrossIncomeYearlyValue = effectiveGrossIncomeYearly(grossIncomeMonthly * 12, effectiveVacancyRate);

  const operatingCostsNonRecoverableMonthly =
    effectiveNonRecoverableMonthly +
    values.hoaFeeMaintenanceReserveMonthly +
    values.propertyManagementAnnual / 12 +
    values.propertyInsuranceAnnual / 12 +
    values.otherCostsMonthly;
  const operatingCostsNonRecoverableYearly = operatingCostsNonRecoverableMonthly * 12;

  const netOperatingIncomeYearly = computeNetOperatingIncomeYearly(effectiveGrossIncomeYearlyValue, operatingCostsNonRecoverableYearly);
  const cashflowAfterDebtYearly = netOperatingIncomeYearly - debtServiceAnnual;
  const cashflowAfterDebtMonthly = cashflowAfterDebtYearly / 12;

  const basis = afaBasis(values.buildingValue, closingCostsTotal, purchasePrice, values.renovationAfaEligible);
  const taxLineItems = taxLineItemsForScenario({
    scenario: 'vollvermietung',
    year: today.getUTCFullYear(),
    coldRentMonthly: effectiveColdRentMonthly,
    parkingRentMonthly: values.parkingRentMonthly,
    loanStartDate: new Date(values.loanStartDate + 'T00:00:00Z'),
    loanAmount: values.loanAmount,
    interestRate: effectiveInterestRate,
    monthlyMortgage,
    afaBasis: basis,
    depreciationRate: values.depreciationRate,
    hoaUnitNonRecoverableMonthly: effectiveNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: values.hoaFeeRecoverableMonthly,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 0,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: values.propertyManagementAnnual / 12,
    propertyInsuranceMonthly: values.propertyInsuranceAnnual / 12,
    otherCostsMonthly: values.otherCostsMonthly,
  });
  const taxEffectYearlyValue = taxEffectYearly(taxLineItems.taxableIncome, values.marginalTaxRate);
  const taxEffectMonthlyValue = taxEffectMonthly(taxEffectYearlyValue, 12);
  const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowAfterDebtMonthly, taxEffectMonthlyValue);

  const hasBaseData = values.name.trim() !== '' && purchasePrice > 0 && effectiveColdRentMonthly > 0;
  const hasFinancingData = hasBaseData && values.loanAmount > 0 && values.interestRate > 0 && values.amortizationRate > 0;
  const hasCostData =
    hasFinancingData &&
    (values.hoaFeeTotalMonthly > 0 || values.hoaFeeMaintenanceReserveMonthly > 0 || values.propertyManagementAnnual > 0);
  const hasTaxData = hasCostData && values.marginalTaxRate > 0 && values.buildingValue > 0;

  return {
    effectiveColdRentMonthly,
    effectiveInterestRate,
    effectivePurchasePriceUnit,
    effectiveVacancyRate,
    purchasePrice,
    closingCostsTotal,
    totalInvestment,
    loanAmount: values.loanAmount,
    equityUsed,
    monthlyMortgage,
    netOperatingIncomeYearly,
    cashflowAfterDebtMonthly,
    cashflowAfterTaxMonthly,
    mietmultiplikator: hasBaseData
      ? computeMietmultiplikator(purchasePrice, effectiveColdRentMonthly * 12, values.parkingRentMonthly * 12)
      : null,
    grossYield: hasBaseData ? computeGrossYield(effectiveColdRentMonthly * 12, values.parkingRentMonthly * 12, purchasePrice) : null,
    netYield: hasCostData ? computeNetYield(netOperatingIncomeYearly, totalInvestment) : null,
    cashOnCashReturn: hasCostData ? computeCashOnCashReturn(cashflowAfterDebtYearly, equityUsed) : null,
    dscrNOI: hasFinancingData ? computeDscrNOI(netOperatingIncomeYearly, debtServiceAnnual) : null,
    ltvRatio: hasFinancingData ? computeLtvRatio(values.loanAmount, totalInvestment) : null,
    breakEvenRentMonthly: hasFinancingData ? computeBreakEvenRentMonthly(operatingCostsNonRecoverableMonthly, monthlyMortgage) : null,
    hasBaseData,
    hasFinancingData,
    hasCostData,
    hasTaxData,
  };
}

export const SENSITIVITY_RANGES = {
  rent: (base: number) => [-base * 0.2, base * 0.2] as const,
  rate: [-0.02, 0.02] as const,
  price: (base: number) => [-base * 0.15, base * 0.15] as const,
  vacancy: [-0.1, 0.1] as const,
  maintenance: [-100, 100] as const,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/investmentCalculation.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/investmentCalculation.ts web/tests/data/investmentCalculation.test.ts
git commit -m "feat(investment-calculator): add computeInvestmentKPIs"
```

---

### Task 4: Data access — list, single, CRUD, promote

**Files:**
- Create: `web/lib/data/investmentCalculations.ts`
- Create: `web/lib/data/investmentCalculationActions.ts`

- [ ] **Step 1: Implement reads**

```typescript
// web/lib/data/investmentCalculations.ts
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type InvestmentCalculationRow = Database['public']['Tables']['investment_calculations']['Row'];

export async function getInvestmentCalculations(): Promise<InvestmentCalculationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('investment_calculations').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const getInvestmentCalculation = cache(async (id: string): Promise<InvestmentCalculationRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('investment_calculations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
});
```

- [ ] **Step 2: Implement server actions**

```typescript
// web/lib/data/investmentCalculationActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/supabase/types';

export async function createInvestmentCalculation(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data, error } = await supabase
    .from('investment_calculations')
    .insert({ user_id: user.id, name: 'Neuer Kaufkandidat' })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/investment-calculator');
  return data.id;
}

export async function updateInvestmentCalculation(id: string, patch: TablesUpdate<'investment_calculations'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('investment_calculations').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath('/investment-calculator');
  revalidatePath(`/investment-calculator/${id}`);
}

export async function deleteInvestmentCalculation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('investment_calculations').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/investment-calculator');
}

/**
 * Copies a calculation's fields into a new `properties` row (real
 * Stammdaten/Objektdaten fields not covered by the calculation keep the
 * `properties` table's own column defaults) and marks the calculation as
 * promoted. Redirects straight to the new property's detail page.
 */
export async function promoteInvestmentCalculation(id: string): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: calc, error: calcError } = await supabase.from('investment_calculations').select('*').eq('id', id).single();
  if (calcError) throw calcError;

  const today = new Date().toISOString().slice(0, 10);

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      user_id: user.id,
      name: calc.name,
      purchase_date: today,
      economic_transfer_date: today,
      loan_start_date: today,
      purchase_price_unit: calc.purchase_price_unit,
      purchase_price_parking: calc.purchase_price_parking,
      land_transfer_tax: calc.land_transfer_tax,
      notary_costs: calc.notary_costs,
      land_registry_costs: calc.land_registry_costs,
      agent_fee: calc.agent_fee,
      appraisal_costs: calc.appraisal_costs,
      renovation_modernization_costs: calc.renovation_modernization_costs,
      renovation_afa_eligible: calc.renovation_afa_eligible,
      cold_rent_monthly: calc.cold_rent_monthly,
      parking_rent_monthly: calc.parking_rent_monthly,
      other_income_monthly: calc.other_income_monthly,
      vacancy_rate_assumption: calc.vacancy_rate_assumption,
      loan_amount: calc.loan_amount,
      interest_rate: calc.interest_rate,
      amortization_rate: calc.amortization_rate,
      monthly_mortgage: calc.monthly_mortgage,
      hoa_fee_total_monthly: calc.hoa_fee_total_monthly,
      hoa_fee_recoverable_monthly: calc.hoa_fee_recoverable_monthly,
      hoa_fee_maintenance_reserve_monthly: calc.hoa_fee_maintenance_reserve_monthly,
      property_management_annual: calc.property_management_annual,
      property_insurance_annual: calc.property_insurance_annual,
      other_costs_monthly: calc.other_costs_monthly,
      building_value: calc.building_value,
      depreciation_rate: calc.depreciation_rate,
      marginal_tax_rate: calc.marginal_tax_rate,
    })
    .select('id')
    .single();
  if (propertyError) throw propertyError;

  const { error: updateError } = await supabase
    .from('investment_calculations')
    .update({ is_promoted: true, promoted_property_id: property.id, promoted_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) throw updateError;

  revalidatePath('/');
  revalidatePath('/investment-calculator');
  redirect(`/properties/${property.id}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/data/investmentCalculations.ts web/lib/data/investmentCalculationActions.ts
git commit -m "feat(investment-calculator): add CRUD reads/actions and promote flow"
```

---

### Task 5: `InvestmentKPIPanel`

**Files:**
- Create: `web/components/investment-calculator/InvestmentKPIPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/components/investment-calculator/InvestmentKPIPanel.tsx
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent, formatMultiplier, formatNumber } from '@/lib/formatters';
import type { InvestmentKPIs } from '@/lib/data/investmentCalculation';

function valueColor(value: number): string {
  return value >= 0 ? 'text-positive' : 'text-negative';
}

function Kpi({ label, value, unlocked, valueClassName = 'text-text-primary' }: { label: string; value: string; unlocked: boolean; valueClassName?: string }) {
  return (
    <div className="relative px-4 py-3">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p className={`text-[15px] font-bold ${unlocked ? valueClassName : 'text-text-dim/50'}`}>{unlocked ? value : '–'}</p>
      {!unlocked && <span className="absolute right-2 top-2 text-[9px] text-text-dim/50">🔒</span>}
    </div>
  );
}

export function InvestmentKPIPanel({ kpis }: { kpis: InvestmentKPIs }) {
  return (
    <GlassCard className="p-0 divide-y divide-black/[0.06]">
      <div className="grid grid-cols-4 divide-x divide-black/[0.06]">
        <Kpi label="Kaufpreisfaktor" value={kpis.mietmultiplikator !== null ? formatMultiplier(kpis.mietmultiplikator) : '–'} unlocked={kpis.hasBaseData} />
        <Kpi label="Bruttorendite" value={kpis.grossYield !== null ? formatPercent(kpis.grossYield) : '–'} unlocked={kpis.hasBaseData} />
        <Kpi
          label="Cashflow/Mon"
          value={formatCurrency(kpis.cashflowAfterDebtMonthly)}
          unlocked={kpis.hasFinancingData}
          valueClassName={valueColor(kpis.cashflowAfterDebtMonthly)}
        />
        <Kpi label="Nettorendite" value={kpis.netYield !== null ? formatPercent(kpis.netYield) : '–'} unlocked={kpis.hasCostData} />
      </div>
      <div className="grid grid-cols-4 divide-x divide-black/[0.06]">
        <Kpi label="Cash-on-Cash" value={kpis.cashOnCashReturn !== null ? formatPercent(kpis.cashOnCashReturn) : '–'} unlocked={kpis.hasCostData} />
        <Kpi
          label="Break-Even-Miete"
          value={kpis.breakEvenRentMonthly !== null ? formatCurrency(kpis.breakEvenRentMonthly) : '–'}
          unlocked={kpis.hasFinancingData}
        />
        <Kpi label="DSCR" value={kpis.dscrNOI !== null ? formatNumber(kpis.dscrNOI, 2) : '–'} unlocked={kpis.hasFinancingData} />
        <Kpi label="LTV" value={kpis.ltvRatio !== null ? formatPercent(kpis.ltvRatio) : '–'} unlocked={kpis.hasFinancingData} />
      </div>
      {kpis.hasTaxData && (
        <div className="px-4 py-2 text-sm">
          <span className="text-text-secondary">Nach Steuer: </span>
          <span className={`font-semibold ${valueColor(kpis.cashflowAfterTaxMonthly)}`}>{formatCurrency(kpis.cashflowAfterTaxMonthly)}/Mon</span>
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/investment-calculator/InvestmentKPIPanel.tsx
git commit -m "feat(investment-calculator): add InvestmentKPIPanel"
```

---

### Task 6: `InvestmentInputSections`

**Files:**
- Create: `web/components/investment-calculator/InvestmentInputSections.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/components/investment-calculator/InvestmentInputSections.tsx
'use client';

import type { UseFormRegister, Control } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { TextField } from '@/components/ui/TextField';
import type { InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-text-secondary">{title}</p>
      <div className="glass-card grid grid-cols-2 gap-3 p-4">{children}</div>
    </div>
  );
}

export function InvestmentInputSections({
  register,
  control,
}: {
  register: UseFormRegister<InvestmentCalculatorValues>;
  control: Control<InvestmentCalculatorValues>;
}) {
  return (
    <div className="space-y-6">
      <Section title="Objekt">
        <div className="col-span-2">
          <TextField label="Name" name="name" register={register} required />
        </div>
      </Section>

      <Section title="Kauf — Stufe 1">
        <CurrencyField label="Kaufpreis Wohnung" name="purchasePriceUnit" register={register} required />
        <CurrencyField label="Kaufpreis Stellplatz" name="purchasePriceParking" register={register} />
        <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
        <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
        <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
        <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
        <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
        <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
        <CurrencyField label="davon aktivierungspflichtig" name="renovationAfaEligible" register={register} />
      </Section>

      <Section title="Einnahmen — Stufe 1">
        <CurrencyField label="Kaltmiete/Monat" name="coldRentMonthly" register={register} required />
        <CurrencyField label="Parkingmiete/Monat" name="parkingRentMonthly" register={register} />
        <CurrencyField label="Sonstige Einnahmen/Monat" name="otherIncomeMonthly" register={register} />
        <PercentField label="Leerstandsquote" name="vacancyRateAssumption" control={control} />
      </Section>

      <Section title="Finanzierung — Stufe 2">
        <CurrencyField label="Darlehensbetrag" name="loanAmount" register={register} required />
        <PercentField label="Zinssatz" name="interestRate" control={control} required />
        <PercentField label="Tilgungssatz" name="amortizationRate" control={control} required />
        <CurrencyField label="Monatsrate" name="monthlyMortgage" register={register} />
        <TextField label="Darlehensbeginn" name="loanStartDate" register={register} type="date" />
      </Section>

      <Section title="Kosten — Stufe 3">
        <CurrencyField label="Hausgeld gesamt/Monat" name="hoaFeeTotalMonthly" register={register} />
        <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeRecoverableMonthly" register={register} />
        <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeMaintenanceReserveMonthly" register={register} />
        <CurrencyField label="Hausverwaltung/Jahr" name="propertyManagementAnnual" register={register} />
        <CurrencyField label="Gebäudeversicherung/Jahr" name="propertyInsuranceAnnual" register={register} />
        <CurrencyField label="Sonstige Kosten/Monat" name="otherCostsMonthly" register={register} />
      </Section>

      <Section title="AfA & Steuer — Stufe 4">
        <CurrencyField label="Gebäudewert" name="buildingValue" register={register} />
        <PercentField label="AfA-Satz" name="depreciationRate" control={control} />
        <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} />
      </Section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/investment-calculator/InvestmentInputSections.tsx
git commit -m "feat(investment-calculator): add InvestmentInputSections"
```

---

### Task 7: `InvestmentSensitivityPanel`

**Files:**
- Create: `web/components/investment-calculator/InvestmentSensitivityPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/components/investment-calculator/InvestmentSensitivityPanel.tsx
'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SENSITIVITY_RANGES, type SensitivityDeltas, type InvestmentKPIs } from '@/lib/data/investmentCalculation';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatted,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatted: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-text-primary">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="w-44 shrink-0 text-right font-mono text-xs text-text-secondary">{formatted}</span>
    </div>
  );
}

export function InvestmentSensitivityPanel({
  baseRent,
  basePrice,
  sensitivity,
  onChange,
  kpis,
}: {
  baseRent: number;
  basePrice: number;
  sensitivity: SensitivityDeltas;
  onChange: (next: SensitivityDeltas) => void;
  kpis: InvestmentKPIs;
}) {
  const [rentMin, rentMax] = SENSITIVITY_RANGES.rent(baseRent);
  const [priceMin, priceMax] = SENSITIVITY_RANGES.price(basePrice);
  const [rateMin, rateMax] = SENSITIVITY_RANGES.rate;
  const [vacancyMin, vacancyMax] = SENSITIVITY_RANGES.vacancy;
  const [maintenanceMin, maintenanceMax] = SENSITIVITY_RANGES.maintenance;

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-text-secondary">Sensitivitätsanalyse</p>
        <button
          type="button"
          onClick={() => onChange({ rentDelta: 0, rateDelta: 0, priceDelta: 0, vacancyDelta: 0, maintenanceDelta: 0 })}
          className="text-xs text-accent hover:underline"
        >
          Zurücksetzen
        </button>
      </div>

      <Slider
        label="Kaltmiete"
        value={sensitivity.rentDelta}
        min={rentMin}
        max={rentMax}
        step={10}
        onChange={(v) => onChange({ ...sensitivity, rentDelta: v })}
        formatted={`${sensitivity.rentDelta >= 0 ? '+' : ''}${sensitivity.rentDelta} € → ${formatCurrency(kpis.effectiveColdRentMonthly)}`}
      />
      <Slider
        label="Zinssatz"
        value={sensitivity.rateDelta}
        min={rateMin}
        max={rateMax}
        step={0.001}
        onChange={(v) => onChange({ ...sensitivity, rateDelta: v })}
        formatted={`${sensitivity.rateDelta >= 0 ? '+' : ''}${formatPercent(sensitivity.rateDelta)} → ${formatPercent(kpis.effectiveInterestRate)}`}
      />
      <Slider
        label="Kaufpreis"
        value={sensitivity.priceDelta}
        min={priceMin}
        max={priceMax}
        step={1000}
        onChange={(v) => onChange({ ...sensitivity, priceDelta: v })}
        formatted={`${sensitivity.priceDelta >= 0 ? '+' : ''}${Math.round(sensitivity.priceDelta / 1000)}k € → ${formatCurrency(kpis.effectivePurchasePriceUnit)}`}
      />
      <Slider
        label="Leerstand"
        value={sensitivity.vacancyDelta}
        min={vacancyMin}
        max={vacancyMax}
        step={0.01}
        onChange={(v) => onChange({ ...sensitivity, vacancyDelta: v })}
        formatted={`${sensitivity.vacancyDelta >= 0 ? '+' : ''}${formatPercent(sensitivity.vacancyDelta)} → ${formatPercent(kpis.effectiveVacancyRate)}`}
      />
      <Slider
        label="Instandhaltung"
        value={sensitivity.maintenanceDelta}
        min={maintenanceMin}
        max={maintenanceMax}
        step={5}
        onChange={(v) => onChange({ ...sensitivity, maintenanceDelta: v })}
        formatted={`${sensitivity.maintenanceDelta >= 0 ? '+' : ''}${sensitivity.maintenanceDelta} €/Mon`}
      />
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/investment-calculator/InvestmentSensitivityPanel.tsx
git commit -m "feat(investment-calculator): add InvestmentSensitivityPanel"
```

---

### Task 8: `PromoteDialog`

**Files:**
- Create: `web/components/investment-calculator/PromoteDialog.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/components/investment-calculator/PromoteDialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { promoteInvestmentCalculation } from '@/lib/data/investmentCalculationActions';

export function PromoteDialog({ calculationId, calculationName, disabled }: { calculationId: string; calculationName: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Als Immobilie übernehmen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[400px] space-y-4 rounded-xl bg-white p-8 text-center">
            <p className="text-lg font-bold text-text-primary">Als Immobilie übernehmen?</p>
            <p className="text-sm text-text-secondary">
              &ldquo;{calculationName}&rdquo; wird als neue Immobilie ins Portfolio aufgenommen. Dieser Eintrag bleibt als
              Prognose-Referenz erhalten.
            </p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-black/10 px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => promoteInvestmentCalculation(calculationId))}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/investment-calculator/PromoteDialog.tsx
git commit -m "feat(investment-calculator): add PromoteDialog"
```

---

### Task 9: `InvestmentCalculatorDetail` (form shell + autosave)

**Files:**
- Create: `web/components/investment-calculator/InvestmentCalculatorDetail.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/components/investment-calculator/InvestmentCalculatorDetail.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues, type SensitivityDeltas } from '@/lib/data/investmentCalculation';
import { updateInvestmentCalculation } from '@/lib/data/investmentCalculationActions';
import { InvestmentKPIPanel } from './InvestmentKPIPanel';
import { InvestmentInputSections } from './InvestmentInputSections';
import { InvestmentSensitivityPanel } from './InvestmentSensitivityPanel';
import { PromoteDialog } from './PromoteDialog';
import type { InvestmentCalculationRow } from '@/lib/data/investmentCalculations';

const AUTOSAVE_DEBOUNCE_MS = 600;

function toFormValues(row: InvestmentCalculationRow): InvestmentCalculatorValues {
  return {
    name: row.name,
    purchasePriceUnit: row.purchase_price_unit,
    purchasePriceParking: row.purchase_price_parking,
    landTransferTax: row.land_transfer_tax,
    notaryCosts: row.notary_costs,
    landRegistryCosts: row.land_registry_costs,
    agentFee: row.agent_fee,
    appraisalCosts: row.appraisal_costs,
    renovationModernizationCosts: row.renovation_modernization_costs,
    renovationAfaEligible: row.renovation_afa_eligible,
    coldRentMonthly: row.cold_rent_monthly,
    parkingRentMonthly: row.parking_rent_monthly,
    otherIncomeMonthly: row.other_income_monthly,
    vacancyRateAssumption: row.vacancy_rate_assumption,
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    amortizationRate: row.amortization_rate,
    monthlyMortgage: row.monthly_mortgage,
    loanStartDate: row.loan_start_date,
    hoaFeeTotalMonthly: row.hoa_fee_total_monthly,
    hoaFeeRecoverableMonthly: row.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: row.hoa_fee_maintenance_reserve_monthly,
    propertyManagementAnnual: row.property_management_annual,
    propertyInsuranceAnnual: row.property_insurance_annual,
    otherCostsMonthly: row.other_costs_monthly,
    buildingValue: row.building_value,
    depreciationRate: row.depreciation_rate,
    marginalTaxRate: row.marginal_tax_rate,
  };
}

function toPatch(values: InvestmentCalculatorValues) {
  return {
    name: values.name,
    purchase_price_unit: values.purchasePriceUnit,
    purchase_price_parking: values.purchasePriceParking,
    land_transfer_tax: values.landTransferTax,
    notary_costs: values.notaryCosts,
    land_registry_costs: values.landRegistryCosts,
    agent_fee: values.agentFee,
    appraisal_costs: values.appraisalCosts,
    renovation_modernization_costs: values.renovationModernizationCosts,
    renovation_afa_eligible: values.renovationAfaEligible,
    cold_rent_monthly: values.coldRentMonthly,
    parking_rent_monthly: values.parkingRentMonthly,
    other_income_monthly: values.otherIncomeMonthly,
    vacancy_rate_assumption: values.vacancyRateAssumption,
    loan_amount: values.loanAmount,
    interest_rate: values.interestRate,
    amortization_rate: values.amortizationRate,
    monthly_mortgage: values.monthlyMortgage,
    loan_start_date: values.loanStartDate,
    hoa_fee_total_monthly: values.hoaFeeTotalMonthly,
    hoa_fee_recoverable_monthly: values.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: values.hoaFeeMaintenanceReserveMonthly,
    property_management_annual: values.propertyManagementAnnual,
    property_insurance_annual: values.propertyInsuranceAnnual,
    other_costs_monthly: values.otherCostsMonthly,
    building_value: values.buildingValue,
    depreciation_rate: values.depreciationRate,
    marginal_tax_rate: values.marginalTaxRate,
  };
}

export function InvestmentCalculatorDetail({ calculation }: { calculation: InvestmentCalculationRow }) {
  const [sensitivity, setSensitivity] = useState<SensitivityDeltas>(ZERO_SENSITIVITY);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, control, watch } = useForm<InvestmentCalculatorValues>({ defaultValues: toFormValues(calculation) });
  const values = watch();
  const kpis = computeInvestmentKPIs(values, sensitivity);

  useEffect(() => {
    const subscription = watch((formValues) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveState('saving');
        updateInvestmentCalculation(calculation.id, toPatch(formValues as InvestmentCalculatorValues))
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, calculation.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text-primary">{values.name || 'Kaufkandidat'}</h1>
          {saveState === 'saving' && <span className="text-xs text-text-dim">Speichert…</span>}
          {saveState === 'saved' && <span className="text-xs text-positive">Gespeichert</span>}
          {saveState === 'error' && <span className="text-xs text-negative">Speichern fehlgeschlagen</span>}
        </div>
        {calculation.is_promoted ? (
          <span className="rounded-full bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">✓ übernommen</span>
        ) : (
          <PromoteDialog calculationId={calculation.id} calculationName={values.name} disabled={!kpis.hasBaseData} />
        )}
      </div>

      <InvestmentKPIPanel kpis={kpis} />

      <InvestmentInputSections register={register} control={control} />

      <InvestmentSensitivityPanel
        baseRent={values.coldRentMonthly}
        basePrice={values.purchasePriceUnit}
        sensitivity={sensitivity}
        onChange={setSensitivity}
        kpis={kpis}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/investment-calculator/InvestmentCalculatorDetail.tsx
git commit -m "feat(investment-calculator): add InvestmentCalculatorDetail with autosave"
```

---

### Task 10: List page + detail route

**Files:**
- Create: `web/components/investment-calculator/InvestmentCalculatorList.tsx`
- Create: `web/components/investment-calculator/NewCalculationButton.tsx`
- Modify: `web/app/(app)/investment-calculator/page.tsx`
- Create: `web/app/(app)/investment-calculator/[id]/page.tsx`

- [ ] **Step 1: Implement `NewCalculationButton.tsx`**

```tsx
// web/components/investment-calculator/NewCalculationButton.tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createInvestmentCalculation } from '@/lib/data/investmentCalculationActions';

export function NewCalculationButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const id = await createInvestmentCalculation();
          router.push(`/investment-calculator/${id}`);
        })
      }
      className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
    >
      <Plus size={16} /> Neu
    </button>
  );
}
```

- [ ] **Step 2: Implement `InvestmentCalculatorList.tsx`**

```tsx
// web/components/investment-calculator/InvestmentCalculatorList.tsx
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatMultiplier, formatPercent } from '@/lib/formatters';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';
import type { InvestmentCalculationRow } from '@/lib/data/investmentCalculations';

function rowToValues(row: InvestmentCalculationRow): InvestmentCalculatorValues {
  return {
    name: row.name,
    purchasePriceUnit: row.purchase_price_unit,
    purchasePriceParking: row.purchase_price_parking,
    landTransferTax: row.land_transfer_tax,
    notaryCosts: row.notary_costs,
    landRegistryCosts: row.land_registry_costs,
    agentFee: row.agent_fee,
    appraisalCosts: row.appraisal_costs,
    renovationModernizationCosts: row.renovation_modernization_costs,
    renovationAfaEligible: row.renovation_afa_eligible,
    coldRentMonthly: row.cold_rent_monthly,
    parkingRentMonthly: row.parking_rent_monthly,
    otherIncomeMonthly: row.other_income_monthly,
    vacancyRateAssumption: row.vacancy_rate_assumption,
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    amortizationRate: row.amortization_rate,
    monthlyMortgage: row.monthly_mortgage,
    loanStartDate: row.loan_start_date,
    hoaFeeTotalMonthly: row.hoa_fee_total_monthly,
    hoaFeeRecoverableMonthly: row.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: row.hoa_fee_maintenance_reserve_monthly,
    propertyManagementAnnual: row.property_management_annual,
    propertyInsuranceAnnual: row.property_insurance_annual,
    otherCostsMonthly: row.other_costs_monthly,
    buildingValue: row.building_value,
    depreciationRate: row.depreciation_rate,
    marginalTaxRate: row.marginal_tax_rate,
  };
}

export function InvestmentCalculatorList({ calculations }: { calculations: InvestmentCalculationRow[] }) {
  if (calculations.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
        <Calculator size={40} className="text-text-dim" />
        <p className="text-text-secondary">
          Kaufkandidaten analysieren und bei Kauf direkt übernehmen.
          <br />
          Noch kein Kaufkandidat angelegt.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {calculations.map((row) => {
        const kpis = computeInvestmentKPIs(rowToValues(row), ZERO_SENSITIVITY);
        return (
          <Link key={row.id} href={`/investment-calculator/${row.id}`}>
            <GlassCard className="space-y-2 hover:bg-black/[0.02]">
              <div className="flex items-center justify-between">
                <p className="font-bold text-text-primary">{row.name || 'Unbenannt'}</p>
                {row.is_promoted && <span className="text-xs font-semibold text-positive">✓ übernommen</span>}
              </div>
              {row.purchase_price_unit > 0 && <p className="text-sm text-text-secondary">{formatCurrency(row.purchase_price_unit)}</p>}
              <div className="flex gap-4 text-xs text-text-secondary">
                {kpis.grossYield !== null && <span>Brutto {formatPercent(kpis.grossYield)}</span>}
                {kpis.mietmultiplikator !== null && <span>Faktor {formatMultiplier(kpis.mietmultiplikator)}</span>}
                {kpis.hasFinancingData && <span>CF/Mon {formatCurrency(kpis.cashflowAfterDebtMonthly)}</span>}
              </div>
            </GlassCard>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Replace the stub list page**

```tsx
// web/app/(app)/investment-calculator/page.tsx
import { getInvestmentCalculations } from '@/lib/data/investmentCalculations';
import { InvestmentCalculatorList } from '@/components/investment-calculator/InvestmentCalculatorList';
import { NewCalculationButton } from '@/components/investment-calculator/NewCalculationButton';

export default async function InvestmentCalculatorPage() {
  const calculations = await getInvestmentCalculations();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Investment-Rechner</h1>
        <NewCalculationButton />
      </div>
      <InvestmentCalculatorList calculations={calculations} />
    </div>
  );
}
```

- [ ] **Step 4: Create the detail route**

```tsx
// web/app/(app)/investment-calculator/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInvestmentCalculation } from '@/lib/data/investmentCalculations';
import { InvestmentCalculatorDetail } from '@/components/investment-calculator/InvestmentCalculatorDetail';

export default async function InvestmentCalculatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculation = await getInvestmentCalculation(id);
  if (!calculation) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/investment-calculator" className="text-xs text-text-dim hover:underline">
        ← Investment-Rechner
      </Link>
      <InvestmentCalculatorDetail calculation={calculation} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/components/investment-calculator/InvestmentCalculatorList.tsx web/components/investment-calculator/NewCalculationButton.tsx web/app/\(app\)/investment-calculator/page.tsx "web/app/(app)/investment-calculator/[id]/page.tsx"
git commit -m "feat(investment-calculator): wire up list and detail routes"
```

---

### Task 11: Full-suite verification and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS, no regressions.

- [ ] **Step 2: Run the linter and build**

Run: `cd web && npm run lint && npm run build`
Expected: No lint errors, build succeeds.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

1. Sidebar → "Investment-Rechner" → shows empty state.
2. Click "+ Neu" → new "Neuer Kaufkandidat" created, redirected to its detail page.
3. Enter Kaufpreis Wohnung (250000) + Kaltmiete/Monat (950) → Kaufpreisfaktor and Bruttorendite unlock immediately in the KPI panel (no page reload).
4. Enter Darlehensbetrag (230000), Zinssatz (4,3%), Tilgungssatz (1%) → Cashflow/Mon, Break-Even, DSCR, LTV unlock.
5. Enter Hausgeld gesamt/Monat (180) → Nettorendite, Cash-on-Cash unlock.
6. Enter Gebäudewert (180000) and Grenzsteuersatz (42%) → "Nach Steuer" row appears below the KPI grid.
7. Move the Kaltmiete sensitivity slider → Cashflow/Mon updates live without a save round-trip; move the Zinssatz slider → Cashflow/Mon and DSCR both update.
8. Click "Zurücksetzen" → sliders return to the base values, KPIs return to their pre-slider numbers.
9. Reload the page → all entered inputs persisted (autosave), sensitivity sliders reset to zero (never persisted).
10. Click "Als Immobilie übernehmen" → confirm dialog → "Übernehmen" → redirected to the new property's `/properties/[id]` overview page with the same purchase price, rent, and financing values.
11. Back in "Investment-Rechner" → the promoted calculation shows the "✓ übernommen" badge and its Promote button is gone.
12. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it (with a matching test update where the mismatch is in `computeInvestmentKPIs`) before considering this plan done.

---

## Self-Review Checklist

- [x] **Spec coverage:** List view with sort by last-edited. KPI panel shows all 8 KPIs with stage-based lock icons. Sensitivity sliders for all 5 parameters with the same ranges/steps as the native plan, non-persistent (`useState`, never sent to `updateInvestmentCalculation`). Promote flow: confirmation dialog → creates `properties` row → marks `is_promoted` → badge in list and detail.
- [x] **No placeholders:** Every task has complete, runnable code.
- [x] **Type consistency:** `InvestmentCalculatorValues` field names match exactly between `investmentCalculation.ts`, `InvestmentCalculatorDetail.tsx`'s `toFormValues`/`toPatch`, and `InvestmentCalculatorList.tsx`'s `rowToValues`. `InvestmentKPIs` fields used in `InvestmentKPIPanel.tsx` and `InvestmentSensitivityPanel.tsx` match the interface defined in Task 3.
- [x] **DRY:** Zero new pure calculation functions — every KPI composes existing `kpiCalculator.ts`/`amortizationCalculator.ts`/`depreciationCalculator.ts`/`taxCalculator.ts`/`cashflowCalculator.ts` exports.
