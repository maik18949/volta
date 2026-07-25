# Volta Web — Plan 3: Property Setup Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 7-step (+ optional 8th) Property Setup Wizard at `properties/new` so a signed-in user can create a new property through a guided flow, replacing the Plan-2 stub page. Only on "Fertigstellen" is anything written to Supabase.

**Architecture:** A single client-component form (`PropertyWizard`) holds all wizard state via `react-hook-form`'s `useForm` + `FormProvider`, keyed by a plain `WizardFormValues` interface — no Zod/required-field resolver, because a single schema validated across all steps at once fights a multi-step wizard (fields from step 7 would show as "invalid" while the user is still on step 1). Instead, a pure module `lib/wizard/wizardLogic.ts` (TDD'd in isolation, no React) provides `canProceedFromStep`, `canFinish`, `requiresStatusOnboarding`, and the two mapping functions that turn `WizardFormValues` into Supabase insert rows — mirroring the orchestration-layer pattern `lib/data/propertySummary.ts` already established in Plan 2. Step components are dumb — they read the shared form via `useFormContext`, render fields, and show a live-computed summary panel by calling the same `lib/calculations/*` pure functions Plan 1 built (no duplicate math). A single Server Action `createProperty` (added to the existing `lib/data/propertyActions.ts`) does the actual insert, setting `user_id` from the authenticated session server-side — never trusting client input for it.

**Tech Stack:** `react-hook-form` (`useForm`, `FormProvider`, `useFormContext`, `useWatch`, `useController`) — already a dependency, unused until now. Next.js Server Actions. The Plan-1 calculation functions and Plan-2 UI primitives/formatters.

**Depends on:** Plan 1 (calculations, Supabase types), Plan 2 (`GlassCard`, design tokens, the `properties/new` stub route, `lib/data/propertyActions.ts`).

---

## Context: what this plan does NOT cover

Per `docs/specs/spec-property-setup.md`, translated 1:1 from the native app spec for the web:

- **Photos** (spec Step 2 "Fotos" section) — no Supabase Storage bucket exists yet for `property_photos`; deferred to its own plan once Storage is wired up.
- **`vacancy_rate_assumption`, `market_rent_per_sqm`, `current_market_value`** — the spec explicitly says these "sind keine Property-Setup-Eingaben — werden als Annahmen im Immobiliendaten-Tab gepflegt" (not wizard inputs; edited later in the Immobiliendaten tab, which doesn't exist yet — Plan 4). They keep their DB column defaults (`vacancy_rate_assumption` defaults to `0.03`).
- **Editing an existing property** — this plan only covers the create flow. Edit/update is a Property Detail concern (Plan 4).
- **`parking_count`, `land_area_sqm`, `bedrooms`, `bathrooms`, `floor_level`, `basement_size_sqm`** — present in the DB schema for the future Immobiliendaten tab but not listed as wizard inputs in `spec-property-setup.md`; they keep their DB defaults (`null`/`0`).
- **Property Detail tabs** (Übersicht/Cashflow/Steuer/Verlauf/Finanzierung/Immobiliendaten) — Plan 4, per Plan 2's own scoping note.
- **Drag-reorder / `sort_order` assignment** — new properties get the DB default `sort_order = 0`, same as existing rows; no reordering UI exists yet (tracked, not blocking).

---

## File Map

```
web/
├── app/(app)/properties/new/page.tsx      # Rewrite: renders <PropertyWizard />
│
├── components/
│   ├── ui/
│   │   ├── TextField.tsx                  # New: labeled text/date/number input, RHF register-based
│   │   ├── CurrencyField.tsx              # New: labeled € input, RHF register-based (valueAsNumber)
│   │   └── PercentField.tsx               # New: labeled % input, RHF useController (displays ×100, stores fraction)
│   └── wizard/
│       ├── PropertyWizard.tsx             # New: FormProvider, step nav, progress, back/next/finish
│       └── steps/
│           ├── StepStammdaten.tsx         # Step 1
│           ├── StepObjektdaten.tsx        # Step 2
│           ├── StepKauf.tsx               # Step 3
│           ├── StepEinnahmen.tsx          # Step 4
│           ├── StepKosten.tsx             # Step 5
│           ├── StepFinanzierung.tsx       # Step 6
│           ├── StepAfaSteuer.tsx          # Step 7
│           └── StepStatusOnboarding.tsx   # Step 8 (conditional)
│
├── lib/
│   ├── wizard/
│   │   └── wizardLogic.ts                 # New: WizardFormValues type, defaults, gates, DB-row mappers
│   └── data/
│       └── propertyActions.ts             # Modify: add createProperty Server Action
│
└── tests/
    └── wizard/
        └── wizardLogic.test.ts            # New: Vitest unit tests for the pure logic module
```

---

## Task 0: Wizard domain logic (`lib/wizard/wizardLogic.ts`)

**Files:**
- Create: `web/lib/wizard/wizardLogic.ts`
- Create: `web/tests/wizard/wizardLogic.test.ts`

This is the only piece of this plan that's pure logic (no React, no Supabase call) — TDD it first, exactly like `propertySummary.ts` was in Plan 2.

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/wizard/wizardLogic.test.ts
import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  makeWizardDefaultValues,
  requiresStatusOnboarding,
  canProceedFromStep,
  canFinish,
  totalSteps,
  mapToPropertyInsert,
  mapToStatusEntryInsert,
  type WizardFormValues,
} from '@/lib/wizard/wizardLogic';

const today = makeDate(2026, 7, 25);

function makeValues(overrides: Partial<WizardFormValues> = {}): WizardFormValues {
  return { ...makeWizardDefaultValues(today), ...overrides };
}

describe('makeWizardDefaultValues', () => {
  it('defaults dates to today and depreciationRate to the DB default of 2%', () => {
    const values = makeWizardDefaultValues(today);
    expect(values.economicTransferDate).toBe('2026-07-25');
    expect(values.purchaseDate).toBe('2026-07-25');
    expect(values.loanStartDate).toBe('2026-07-25');
    expect(values.depreciationRate).toBe(0.02);
    expect(values.parkingType).toBe('nicht_vorhanden');
    expect(values.fixedInterestPeriodYears).toBe(10);
  });
});

describe('requiresStatusOnboarding', () => {
  it('is true when economicTransferDate is in the past', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-06-01' }), today)).toBe(true);
  });

  it('is true when economicTransferDate is the current month', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-07-01' }), today)).toBe(true);
  });

  it('is false when economicTransferDate is a future month', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBe(false);
  });
});

describe('totalSteps', () => {
  it('is 7 without status onboarding, 8 with it', () => {
    expect(totalSteps(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBe(7);
    expect(totalSteps(makeValues({ economicTransferDate: '2026-06-01' }), today)).toBe(8);
  });
});

describe('canProceedFromStep', () => {
  it('blocks step 1 until name, address, city are filled', () => {
    expect(canProceedFromStep(1, makeValues())).toBe(false);
    expect(canProceedFromStep(1, makeValues({ name: 'ETW', address: 'Str. 1', city: 'Dresden' }))).toBe(true);
  });

  it('blocks step 3 until purchasePriceUnit > 0', () => {
    expect(canProceedFromStep(3, makeValues())).toBe(false);
    expect(canProceedFromStep(3, makeValues({ purchasePriceUnit: 1 }))).toBe(true);
  });

  it('does not block other steps', () => {
    expect(canProceedFromStep(2, makeValues())).toBe(true);
    expect(canProceedFromStep(5, makeValues())).toBe(true);
  });
});

describe('canFinish', () => {
  const completeValues = makeValues({
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    purchasePriceUnit: 263_600,
    coldRentMonthly: 950,
    loanAmount: 230_000,
    interestRate: 0.043,
    amortizationRate: 0.01,
    buildingValue: 228_000,
    landValue: 50_600,
  });

  it('is true once every required field from spec-property-setup.md is set', () => {
    expect(canFinish(completeValues)).toBe(true);
  });

  it('is false when any single required field is missing', () => {
    expect(canFinish({ ...completeValues, coldRentMonthly: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, buildingValue: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, loanAmount: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, name: '' })).toBe(false);
  });
});

describe('mapToPropertyInsert', () => {
  it('maps camelCase wizard fields to snake_case DB columns and omits user_id', () => {
    const values = makeValues({ name: 'ETW', address: 'Str. 1', city: 'Dresden', purchasePriceUnit: 100_000 });
    const insert = mapToPropertyInsert(values);
    expect(insert.name).toBe('ETW');
    expect(insert.purchase_price_unit).toBe(100_000);
    expect(insert).not.toHaveProperty('user_id');
  });

  it('zeroes out parking fields when parkingType is nicht_vorhanden, even if stale values remain in the form', () => {
    const values = makeValues({
      parkingType: 'nicht_vorhanden',
      purchasePriceParking: 15_000,
      parkingRentMonthly: 48,
      hoaFeeParkingTotalMonthly: 20,
    });
    const insert = mapToPropertyInsert(values);
    expect(insert.purchase_price_parking).toBe(0);
    expect(insert.parking_rent_monthly).toBe(0);
    expect(insert.hoa_fee_parking_total_monthly).toBe(0);
  });

  it('keeps parking fields when parkingType is set', () => {
    const values = makeValues({ parkingType: 'tiefgarage', purchasePriceParking: 15_000, parkingRentMonthly: 48 });
    const insert = mapToPropertyInsert(values);
    expect(insert.purchase_price_parking).toBe(15_000);
    expect(insert.parking_rent_monthly).toBe(48);
  });

  it('falls back to the calculated monthly mortgage when the user left it at 0', () => {
    const values = makeValues({ loanAmount: 230_000, interestRate: 0.043, amortizationRate: 0.01, monthlyMortgage: 0 });
    const insert = mapToPropertyInsert(values);
    // (0.043 + 0.01) / 12 * 230_000 = 1_015.83...
    expect(insert.monthly_mortgage).toBeCloseTo(1015.83, 1);
  });

  it('keeps a manually-entered monthly mortgage instead of overwriting it with the calculated value', () => {
    const values = makeValues({ loanAmount: 230_000, interestRate: 0.043, amortizationRate: 0.01, monthlyMortgage: 1_242.85 });
    const insert = mapToPropertyInsert(values);
    expect(insert.monthly_mortgage).toBe(1_242.85);
  });

  it('converts NaN/null optional numeric fields to null', () => {
    const values = makeValues({ yearBuilt: NaN, usableAreaSqm: null, rooms: NaN });
    const insert = mapToPropertyInsert(values);
    expect(insert.year_built).toBeNull();
    expect(insert.usable_area_sqm).toBeNull();
    expect(insert.rooms).toBeNull();
  });

  it('guards non-nullable numeric fields against NaN (falls back to 0)', () => {
    const values = makeValues({ notaryCosts: NaN, landTransferTax: NaN });
    const insert = mapToPropertyInsert(values);
    expect(insert.notary_costs).toBe(0);
    expect(insert.land_transfer_tax).toBe(0);
  });
});

describe('mapToStatusEntryInsert', () => {
  it('returns null when the transfer date is in the future (no onboarding step)', () => {
    expect(mapToStatusEntryInsert(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBeNull();
  });

  it('maps the first status entry when the transfer date is in the past', () => {
    const values = makeValues({
      economicTransferDate: '2026-06-01',
      firstStatusDate: '2026-06-01',
      firstStatus: 'vermietet',
    });
    expect(mapToStatusEntryInsert(values, today)).toEqual({
      date: '2026-06-01',
      status: 'vermietet',
      income_actual_monthly: null,
      notes: '',
    });
  });

  it('includes income_actual_monthly only when status is mietgarantie', () => {
    const mietgarantie = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'mietgarantie', firstStatusIncome: 500 });
    expect(mapToStatusEntryInsert(mietgarantie, today)?.income_actual_monthly).toBe(500);

    const vermietet = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'vermietet', firstStatusIncome: 500 });
    expect(mapToStatusEntryInsert(vermietet, today)?.income_actual_monthly).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test wizardLogic`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/wizard/wizardLogic.ts`**

```typescript
// web/lib/wizard/wizardLogic.ts
import { firstDayOfMonth } from '@/lib/calculations/dateHelpers';
import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import type { Database, TablesInsert } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];
type AcquisitionType = Database['public']['Enums']['acquisition_type'];
type ParkingType = Database['public']['Enums']['parking_type'];
type HeatingType = Database['public']['Enums']['heating_type'];
type EnergyClass = Database['public']['Enums']['energy_class'];
type PropertyCondition = Database['public']['Enums']['property_condition'];
type PropertyStatus = Database['public']['Enums']['property_status'];

export interface WizardFormValues {
  // Step 1: Stammdaten
  name: string;
  address: string;
  city: string;
  postalCode: string;
  state: string;
  propertyType: PropertyType;
  acquisitionType: AcquisitionType;
  yearBuilt: number | null;
  notes: string;

  // Step 2: Objektdaten
  livingAreaSqm: number;
  usableAreaSqm: number | null;
  rooms: number | null;
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasGarden: boolean;
  hasBasement: boolean;
  hasFittedKitchen: boolean;
  parkingType: ParkingType;
  heatingType: HeatingType | null;
  energyEfficiencyClass: EnergyClass | null;
  condition: PropertyCondition | null;
  lastRenovationYear: number | null;

  // Step 3: Kauf & Nebenkosten
  purchaseDate: string;
  economicTransferDate: string;
  purchasePriceUnit: number;
  purchasePriceParking: number;
  landTransferTax: number;
  notaryCosts: number;
  landRegistryCosts: number;
  agentFee: number;
  appraisalCosts: number;
  renovationModernizationCosts: number;
  renovationAfaEligible: number;

  // Step 4: Einnahmen
  coldRentMonthly: number;
  warmmieteMonthly: number | null;
  parkingRentMonthly: number;
  otherIncomeMonthly: number;

  // Step 5: Kosten
  hoaFeeTotalMonthly: number;
  isHoaUnitSplit: boolean;
  hoaFeeRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  propertyTaxAnnual: number;
  propertyManagementAnnual: number;
  propertyInsuranceAnnual: number;
  otherCostsMonthly: number;
  hoaFeeParkingTotalMonthly: number;
  isHoaParkingSplit: boolean;
  hoaFeeParkingRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  propertyTaxParkingAnnual: number;

  // Step 6: Finanzierung
  loanAmount: number;
  interestRate: number;
  amortizationRate: number;
  fixedInterestPeriodYears: number;
  loanStartDate: string;
  monthlyMortgage: number;
  equityContributed: number;
  brokerCommissionAgreement: number;

  // Step 7: AfA & Steuer
  buildingValue: number;
  landValue: number;
  depreciationRate: number;
  marginalTaxRate: number;

  // Step 8: Status-Onboarding (conditional)
  firstStatusDate: string;
  firstStatus: PropertyStatus;
  firstStatusIncome: number | null;
  firstStatusNotes: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fresh default form values. `today` is a parameter (not `new Date()` inline) so callers can pass a fixed date in tests. */
export function makeWizardDefaultValues(today: Date): WizardFormValues {
  const todayStr = toDateInputValue(today);
  return {
    name: '',
    address: '',
    city: '',
    postalCode: '',
    state: '',
    propertyType: 'apartment',
    acquisitionType: 'kauf',
    yearBuilt: null,
    notes: '',

    livingAreaSqm: 0,
    usableAreaSqm: null,
    rooms: null,
    hasBalcony: false,
    hasTerrace: false,
    hasGarden: false,
    hasBasement: false,
    hasFittedKitchen: false,
    parkingType: 'nicht_vorhanden',
    heatingType: null,
    energyEfficiencyClass: null,
    condition: null,
    lastRenovationYear: null,

    purchaseDate: todayStr,
    economicTransferDate: todayStr,
    purchasePriceUnit: 0,
    purchasePriceParking: 0,
    landTransferTax: 0,
    notaryCosts: 0,
    landRegistryCosts: 0,
    agentFee: 0,
    appraisalCosts: 0,
    renovationModernizationCosts: 0,
    renovationAfaEligible: 0,

    coldRentMonthly: 0,
    warmmieteMonthly: null,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,

    hoaFeeTotalMonthly: 0,
    isHoaUnitSplit: false,
    hoaFeeRecoverableMonthly: 0,
    hoaFeeMaintenanceReserveMonthly: 0,
    propertyTaxAnnual: 0,
    propertyManagementAnnual: 0,
    propertyInsuranceAnnual: 0,
    otherCostsMonthly: 0,
    hoaFeeParkingTotalMonthly: 0,
    isHoaParkingSplit: false,
    hoaFeeParkingRecoverableMonthly: 0,
    hoaFeeParkingMaintenanceReserveMonthly: 0,
    propertyTaxParkingAnnual: 0,

    loanAmount: 0,
    interestRate: 0,
    amortizationRate: 0,
    fixedInterestPeriodYears: 10,
    loanStartDate: todayStr,
    monthlyMortgage: 0,
    equityContributed: 0,
    brokerCommissionAgreement: 0,

    buildingValue: 0,
    landValue: 0,
    depreciationRate: 0.02,
    marginalTaxRate: 0,

    firstStatusDate: todayStr,
    firstStatus: 'vermietet',
    firstStatusIncome: null,
    firstStatusNotes: '',
  };
}

/** economicTransferDate.firstDayOfMonth <= today.firstDayOfMonth. */
export function requiresStatusOnboarding(values: WizardFormValues, today: Date): boolean {
  const transferDate = new Date(values.economicTransferDate + 'T00:00:00Z');
  return firstDayOfMonth(transferDate).getTime() <= firstDayOfMonth(today).getTime();
}

export function totalSteps(values: WizardFormValues, today: Date): number {
  return requiresStatusOnboarding(values, today) ? 8 : 7;
}

/** Per-step "Weiter" gate — only steps with a hard blocking requirement are checked; the rest always allow proceeding. */
export function canProceedFromStep(step: number, values: WizardFormValues): boolean {
  switch (step) {
    case 1:
      return values.name.trim().length > 0 && values.address.trim().length > 0 && values.city.trim().length > 0;
    case 3:
      return values.purchasePriceUnit > 0;
    default:
      return true;
  }
}

/** "Fertigstellen" gate — verbatim from docs/specs/spec-property-setup.md. */
export function canFinish(values: WizardFormValues): boolean {
  return (
    values.name.trim().length > 0 &&
    values.address.trim().length > 0 &&
    values.city.trim().length > 0 &&
    values.purchasePriceUnit > 0 &&
    values.economicTransferDate.length > 0 &&
    values.coldRentMonthly > 0 &&
    values.loanAmount > 0 &&
    values.interestRate > 0 &&
    values.amortizationRate > 0 &&
    values.buildingValue > 0 &&
    values.landValue > 0
  );
}

function n(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

function nOrNull(value: number | null): number | null {
  return value === null || Number.isNaN(value) ? null : value;
}

/**
 * Maps wizard form state to a `properties` insert row. `user_id` is deliberately omitted —
 * the caller (a Server Action) must set it from the authenticated session, never from client input.
 */
export function mapToPropertyInsert(values: WizardFormValues): Omit<TablesInsert<'properties'>, 'user_id'> {
  const hasParking = values.parkingType !== 'nicht_vorhanden';
  const monthlyMortgage =
    values.monthlyMortgage > 0
      ? n(values.monthlyMortgage)
      : monthlyMortgageCalc(n(values.loanAmount), n(values.interestRate), n(values.amortizationRate));

  return {
    name: values.name.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    postal_code: values.postalCode.trim(),
    state: values.state.trim(),
    property_type: values.propertyType,
    acquisition_type: values.acquisitionType,
    year_built: nOrNull(values.yearBuilt),
    notes: values.notes,

    living_area_sqm: n(values.livingAreaSqm),
    usable_area_sqm: nOrNull(values.usableAreaSqm),
    rooms: nOrNull(values.rooms),
    has_balcony: values.hasBalcony,
    has_terrace: values.hasTerrace,
    has_garden: values.hasGarden,
    has_basement: values.hasBasement,
    has_fitted_kitchen: values.hasFittedKitchen,
    parking_type: values.parkingType,
    heating_type: values.heatingType,
    energy_efficiency_class: values.energyEfficiencyClass,
    condition: values.condition,
    last_renovation_year: nOrNull(values.lastRenovationYear),

    purchase_date: values.purchaseDate,
    economic_transfer_date: values.economicTransferDate,
    purchase_price_unit: n(values.purchasePriceUnit),
    purchase_price_parking: hasParking ? n(values.purchasePriceParking) : 0,
    land_transfer_tax: n(values.landTransferTax),
    notary_costs: n(values.notaryCosts),
    land_registry_costs: n(values.landRegistryCosts),
    agent_fee: n(values.agentFee),
    appraisal_costs: n(values.appraisalCosts),
    renovation_modernization_costs: n(values.renovationModernizationCosts),
    renovation_afa_eligible: n(values.renovationAfaEligible),

    cold_rent_monthly: n(values.coldRentMonthly),
    warmmiete_monthly: nOrNull(values.warmmieteMonthly),
    parking_rent_monthly: hasParking ? n(values.parkingRentMonthly) : 0,
    other_income_monthly: n(values.otherIncomeMonthly),

    hoa_fee_total_monthly: n(values.hoaFeeTotalMonthly),
    is_hoa_unit_split: values.isHoaUnitSplit,
    hoa_fee_recoverable_monthly: values.isHoaUnitSplit ? n(values.hoaFeeRecoverableMonthly) : 0,
    hoa_fee_maintenance_reserve_monthly: values.isHoaUnitSplit ? n(values.hoaFeeMaintenanceReserveMonthly) : 0,
    property_tax_annual: n(values.propertyTaxAnnual),
    property_management_annual: n(values.propertyManagementAnnual),
    property_insurance_annual: n(values.propertyInsuranceAnnual),
    other_costs_monthly: n(values.otherCostsMonthly),
    hoa_fee_parking_total_monthly: hasParking ? n(values.hoaFeeParkingTotalMonthly) : 0,
    is_hoa_parking_split: hasParking ? values.isHoaParkingSplit : false,
    hoa_fee_parking_recoverable_monthly: hasParking && values.isHoaParkingSplit ? n(values.hoaFeeParkingRecoverableMonthly) : 0,
    hoa_fee_parking_maintenance_reserve_monthly:
      hasParking && values.isHoaParkingSplit ? n(values.hoaFeeParkingMaintenanceReserveMonthly) : 0,
    property_tax_parking_annual: hasParking ? n(values.propertyTaxParkingAnnual) : 0,

    loan_amount: n(values.loanAmount),
    interest_rate: n(values.interestRate),
    amortization_rate: n(values.amortizationRate),
    fixed_interest_period_years: n(values.fixedInterestPeriodYears) || 10,
    loan_start_date: values.loanStartDate,
    monthly_mortgage: monthlyMortgage,
    equity_contributed: n(values.equityContributed),
    broker_commission_agreement: n(values.brokerCommissionAgreement),

    land_value: n(values.landValue),
    building_value: n(values.buildingValue),
    depreciation_rate: n(values.depreciationRate),
    marginal_tax_rate: n(values.marginalTaxRate),
  };
}

/** Returns null when the conditional Status-Onboarding step doesn't apply — no status_entries row is created. */
export function mapToStatusEntryInsert(
  values: WizardFormValues,
  today: Date
): Omit<TablesInsert<'status_entries'>, 'property_id'> | null {
  if (!requiresStatusOnboarding(values, today)) return null;

  return {
    date: values.firstStatusDate,
    status: values.firstStatus,
    income_actual_monthly: values.firstStatus === 'mietgarantie' ? nOrNull(values.firstStatusIncome) : null,
    notes: values.firstStatusNotes,
  };
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test wizardLogic`
Expected: all tests pass.

- [ ] **Step 5: Run full suite**

Run: `cd web && pnpm test`
Expected: all test files pass, no regressions in Plan 1/2's existing tests.

- [ ] **Step 6: Commit**

```bash
git add web/lib/wizard/wizardLogic.ts web/tests/wizard/wizardLogic.test.ts
git commit -m "feat(wizard): add pure wizard logic — gates, defaults, DB-row mappers"
```

---

## Task 1: createProperty Server Action + PropertyWizard container + stub steps + page wiring

**Files:**
- Modify: `web/lib/data/propertyActions.ts`
- Create: `web/components/wizard/PropertyWizard.tsx`
- Create: `web/components/wizard/steps/StepStammdaten.tsx` (stub)
- Create: `web/components/wizard/steps/StepObjektdaten.tsx` (stub)
- Create: `web/components/wizard/steps/StepKauf.tsx` (stub)
- Create: `web/components/wizard/steps/StepEinnahmen.tsx` (stub)
- Create: `web/components/wizard/steps/StepKosten.tsx` (stub)
- Create: `web/components/wizard/steps/StepFinanzierung.tsx` (stub)
- Create: `web/components/wizard/steps/StepAfaSteuer.tsx` (stub)
- Create: `web/components/wizard/steps/StepStatusOnboarding.tsx` (stub)
- Modify: `web/app/(app)/properties/new/page.tsx`

Stub step bodies now so the container compiles and its routing/gating logic can be verified end-to-end; Tasks 3–7 replace each stub with the real form.

- [ ] **Step 1: Add `createProperty` to `web/lib/data/propertyActions.ts`**

Replace the full file:

```typescript
// web/lib/data/propertyActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/lib/supabase/types';

export async function deleteProperty(propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
}

/**
 * Inserts a new property (and, if provided, its first status entry) for the signed-in user.
 * `user_id` is set here from the authenticated session — never accepted from the caller.
 */
export async function createProperty(
  propertyInsert: Omit<TablesInsert<'properties'>, 'user_id'>,
  statusEntryInsert: Omit<TablesInsert<'status_entries'>, 'property_id'> | null
): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({ ...propertyInsert, user_id: user.id })
    .select('id')
    .single();

  if (propertyError) throw propertyError;

  if (statusEntryInsert) {
    const { error: statusError } = await supabase
      .from('status_entries')
      .insert({ ...statusEntryInsert, property_id: property.id });
    if (statusError) throw statusError;
  }

  revalidatePath('/');
  return property.id;
}
```

- [ ] **Step 2: Create the 8 stub step components**

Same pattern for all eight — only the function/text name changes:

```tsx
// web/components/wizard/steps/StepStammdaten.tsx
export function StepStammdaten() {
  return <p className="text-text-secondary">Stammdaten — folgt</p>;
}
```

Repeat for `StepObjektdaten` ("Objektdaten — folgt"), `StepKauf` ("Kauf & Nebenkosten — folgt"), `StepEinnahmen` ("Einnahmen — folgt"), `StepKosten` ("Kosten — folgt"), `StepFinanzierung` ("Finanzierung — folgt"), `StepAfaSteuer` ("AfA & Steuer — folgt"), `StepStatusOnboarding` ("Nutzungsverlauf — folgt").

- [ ] **Step 3: Create `web/components/wizard/PropertyWizard.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  type WizardFormValues,
  makeWizardDefaultValues,
  canProceedFromStep,
  canFinish,
  totalSteps,
  mapToPropertyInsert,
  mapToStatusEntryInsert,
} from '@/lib/wizard/wizardLogic';
import { createProperty } from '@/lib/data/propertyActions';
import { StepStammdaten } from './steps/StepStammdaten';
import { StepObjektdaten } from './steps/StepObjektdaten';
import { StepKauf } from './steps/StepKauf';
import { StepEinnahmen } from './steps/StepEinnahmen';
import { StepKosten } from './steps/StepKosten';
import { StepFinanzierung } from './steps/StepFinanzierung';
import { StepAfaSteuer } from './steps/StepAfaSteuer';
import { StepStatusOnboarding } from './steps/StepStatusOnboarding';

const STEP_TITLES = [
  'Stammdaten',
  'Objektdaten',
  'Kauf & Nebenkosten',
  'Einnahmen',
  'Kosten',
  'Finanzierung',
  'AfA & Steuer',
  'Nutzungsverlauf',
];

export function PropertyWizard() {
  const router = useRouter();
  const [today] = useState(() => new Date());
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<WizardFormValues>({ defaultValues: makeWizardDefaultValues(today) });
  const { control } = form;
  // defaultValues fully populates every field, so after mount this is never
  // actually partial — the cast keeps the pure wizardLogic functions (which
  // take a complete WizardFormValues) usable without a second parallel type.
  const values = useWatch({ control }) as WizardFormValues;

  const stepCount = totalSteps(values, today);

  function handleNext() {
    if (canProceedFromStep(currentStep, values)) {
      setCurrentStep((s) => Math.min(s + 1, stepCount));
    }
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  function handleFinish() {
    setSubmitError(null);
    const propertyInsert = mapToPropertyInsert(values);
    const statusEntryInsert = mapToStatusEntryInsert(values, today);
    startTransition(async () => {
      try {
        await createProperty(propertyInsert, statusEntryInsert);
        router.push('/');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      }
    });
  }

  return (
    <FormProvider {...form}>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {Array.from({ length: stepCount }, (_, i) => i + 1).map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                step === currentStep
                  ? 'bg-accent font-semibold text-white'
                  : 'text-text-secondary hover:bg-black/[0.04]'
              }`}
            >
              {step}. {STEP_TITLES[step - 1]}
            </button>
          ))}
        </nav>

        <div className="glass-card flex-1 p-6">
          <p className="mb-4 text-xs font-semibold text-text-secondary">
            Schritt {currentStep} von {stepCount}
          </p>

          {currentStep === 1 && <StepStammdaten />}
          {currentStep === 2 && <StepObjektdaten />}
          {currentStep === 3 && <StepKauf />}
          {currentStep === 4 && <StepEinnahmen />}
          {currentStep === 5 && <StepKosten />}
          {currentStep === 6 && <StepFinanzierung />}
          {currentStep === 7 && <StepAfaSteuer />}
          {currentStep === 8 && <StepStatusOnboarding />}

          {submitError && (
            <p role="alert" className="mt-4 text-sm text-negative">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-black/[0.06] pt-4">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-md border border-black/10 px-4 py-2 text-sm text-text-primary"
                >
                  Zurück
                </button>
              )}
            </div>
            {currentStep < stepCount ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep, values)}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish(values) || isPending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? 'Wird gespeichert…' : 'Fertigstellen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
```

- [ ] **Step 4: Rewrite `web/app/(app)/properties/new/page.tsx`**

```tsx
import { PropertyWizard } from '@/components/wizard/PropertyWizard';

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-bold text-text-primary">Neue Immobilie</h1>
      <PropertyWizard />
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd web && pnpm build`
Expected: succeeds.

- [ ] **Step 6: Manual smoke test**

Run `pnpm dev`, sign in, click "+ Immobilie" from the portfolio page. Verify: 7 steps listed in the left nav (economicTransferDate defaults to today, so `requiresStatusOnboarding` is true and it should actually show **8** — confirm the 8th "Nutzungsverlauf" entry appears). "Weiter" is disabled on step 1 (empty form). Clicking step numbers in the nav jumps freely. "Fertigstellen" on the last step is disabled (required fields are all still empty/zero).

- [ ] **Step 7: Commit**

```bash
git add web/lib/data/propertyActions.ts web/components/wizard/PropertyWizard.tsx \
        web/components/wizard/steps/ web/app/\(app\)/properties/new/page.tsx
git commit -m "feat(wizard): add PropertyWizard container, createProperty action, stub steps"
```

---

## Task 2: Shared form field primitives

**Files:**
- Create: `web/components/ui/TextField.tsx`
- Create: `web/components/ui/CurrencyField.tsx`
- Create: `web/components/ui/PercentField.tsx`

Three thin RHF-aware wrappers reused across all 8 step files — the DRY layer the native app's per-file `formField` helper covered, done once here since this plan has 8 step files sharing it.

- [ ] **Step 1: Create `web/components/ui/TextField.tsx`**

```tsx
'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export function TextField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  type = 'text',
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  type?: 'text' | 'date' | 'number';
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">
        {label}
        {required && ' *'}
      </span>
      <input
        type={type}
        className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary outline-none"
        {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
    </label>
  );
}
```

- [ ] **Step 2: Create `web/components/ui/CurrencyField.tsx`**

```tsx
'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export function CurrencyField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  hint,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">
        {label}
        {required && ' *'}
      </span>
      <div className="mt-1 flex items-center rounded-md border border-black/10 bg-white/90 px-3">
        <input
          type="number"
          step="0.01"
          className="w-full bg-transparent py-2 text-sm text-text-primary outline-none"
          {...register(name, { valueAsNumber: true })}
        />
        <span className="text-sm text-text-dim">€</span>
      </div>
      {hint && <span className="mt-1 block text-xs text-text-dim">{hint}</span>}
    </label>
  );
}
```

- [ ] **Step 3: Create `web/components/ui/PercentField.tsx`**

Uses `useController` (not plain `register`) because the display value (e.g. `4.3`) and the stored value (the fraction `0.043`, matching every DB percent column) differ — a transform `register`'s `valueAsNumber` can't express.

```tsx
'use client';

import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

export function PercentField<T extends FieldValues>({
  label,
  name,
  control,
  required = false,
  hint,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  required?: boolean;
  hint?: string;
}) {
  const { field } = useController({ name, control });
  const displayValue = typeof field.value === 'number' ? field.value * 100 : '';

  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">
        {label}
        {required && ' *'}
      </span>
      <div className="mt-1 flex items-center rounded-md border border-black/10 bg-white/90 px-3">
        <input
          type="number"
          step="0.01"
          value={displayValue}
          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
          onBlur={field.onBlur}
          className="w-full bg-transparent py-2 text-sm text-text-primary outline-none"
        />
        <span className="text-sm text-text-dim">%</span>
      </div>
      {hint && <span className="mt-1 block text-xs text-text-dim">{hint}</span>}
    </label>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: succeeds (nothing imports these yet, but they must type-check standalone).

- [ ] **Step 5: Commit**

```bash
git add web/components/ui/TextField.tsx web/components/ui/CurrencyField.tsx web/components/ui/PercentField.tsx
git commit -m "feat(ui): add TextField, CurrencyField, PercentField wizard form primitives"
```

---

## Task 3: Steps 1–2 (Stammdaten, Objektdaten)

**Files:**
- Modify: `web/components/wizard/steps/StepStammdaten.tsx`
- Modify: `web/components/wizard/steps/StepObjektdaten.tsx`

- [ ] **Step 1: Replace `StepStammdaten.tsx`**

```tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const PROPERTY_TYPES: Array<[WizardFormValues['propertyType'], string]> = [
  ['apartment', 'Apartment'],
  ['einfamilienhaus', 'Einfamilienhaus'],
  ['mehrfamilienhaus', 'Mehrfamilienhaus'],
  ['gewerbe', 'Gewerbe'],
  ['grundstuck', 'Grundstück'],
  ['sonstiges', 'Sonstiges'],
];

const ACQUISITION_TYPES: Array<[WizardFormValues['acquisitionType'], string]> = [
  ['kauf', 'Kauf'],
  ['erbschaft', 'Erbschaft'],
  ['schenkung', 'Schenkung'],
];

export function StepStammdaten() {
  const { register } = useFormContext<WizardFormValues>();

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Gib die Basisdaten deiner Immobilie ein. Name, Adresse und Stadt sind Pflichtfelder.
      </p>

      <TextField label="Name" name="name" register={register} required />
      <TextField label="Adresse" name="address" register={register} required />

      <div className="grid grid-cols-3 gap-3">
        <TextField label="PLZ" name="postalCode" register={register} />
        <TextField label="Stadt" name="city" register={register} required />
        <TextField label="Bundesland" name="state" register={register} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Objekttyp</span>
          <select
            {...register('propertyType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {PROPERTY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Erwerbsart</span>
          <select
            {...register('acquisitionType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {ACQUISITION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Baujahr" name="yearBuilt" register={register} type="number" />
      </div>

      <label className="block">
        <span className="text-[13px] font-medium text-text-secondary">Notizen</span>
        <textarea
          {...register('notes')}
          rows={3}
          className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Replace `StepObjektdaten.tsx`**

```tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const PARKING_TYPES: Array<[WizardFormValues['parkingType'], string]> = [
  ['nicht_vorhanden', 'Nicht vorhanden'],
  ['tiefgarage', 'Tiefgarage'],
  ['aussenstellplatz', 'Außenstellplatz'],
  ['garage', 'Garage'],
];

const HEATING_TYPES: Array<[NonNullable<WizardFormValues['heatingType']>, string]> = [
  ['fernwarme', 'Fernwärme'],
  ['gas', 'Gas'],
  ['ol', 'Öl'],
  ['warmepumpe', 'Wärmepumpe'],
  ['pellet', 'Pellet'],
  ['elektro', 'Elektro'],
  ['sonstiges', 'Sonstiges'],
];

const ENERGY_CLASSES: Array<NonNullable<WizardFormValues['energyEfficiencyClass']>> = [
  'a_plus_plus',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
];

const CONDITIONS: Array<[NonNullable<WizardFormValues['condition']>, string]> = [
  ['neubau', 'Neubau'],
  ['erstbezug', 'Erstbezug'],
  ['gepflegt', 'Gepflegt'],
  ['renovierungsbedurftig', 'Renovierungsbedürftig'],
  ['sanierungsbedurftig', 'Sanierungsbedürftig'],
];

const BOOLEAN_FEATURES = [
  { field: 'hasBalcony', label: 'Balkon' },
  { field: 'hasTerrace', label: 'Terrasse' },
  { field: 'hasGarden', label: 'Garten' },
  { field: 'hasBasement', label: 'Keller' },
  { field: 'hasFittedKitchen', label: 'Einbauküche' },
] as const;

export function StepObjektdaten() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">Objektdaten — trage ein, was du weißt.</p>

      <div className="grid grid-cols-3 gap-3">
        <TextField label="Wohnfläche (m²)" name="livingAreaSqm" register={register} type="number" required />
        <TextField label="Nutzfläche (m²)" name="usableAreaSqm" register={register} type="number" />
        <TextField label="Zimmer" name="rooms" register={register} type="number" />
      </div>

      <div className="flex flex-wrap gap-4">
        {BOOLEAN_FEATURES.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" {...register(field)} />
            {label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Stellplatz</span>
          <select
            {...register('parkingType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {PARKING_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Heizung</span>
          <select
            {...register('heatingType', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {HEATING_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Energieklasse</span>
          <select
            {...register('energyEfficiencyClass', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {ENERGY_CLASSES.map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase().replace('_PLUS_PLUS', '++')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Zustand</span>
          <select
            {...register('condition', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {CONDITIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TextField label="Letzte Renovierung (Jahr)" name="lastRenovationYear" register={register} type="number" />

      {parkingType !== 'nicht_vorhanden' && (
        <p className="text-xs text-text-dim">Stellplatz-Felder (Kaufpreis, Miete, Kosten) erscheinen in den folgenden Schritten.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build and manual check**

Run: `cd web && pnpm build`
Expected: succeeds. In `pnpm dev`, step 1 shows all fields; typing name/address/city enables "Weiter". Step 2 shows area/room fields, toggles, and the 4 selects; switching "Stellplatz" away from "Nicht vorhanden" shows the hint text.

- [ ] **Step 4: Commit**

```bash
git add web/components/wizard/steps/StepStammdaten.tsx web/components/wizard/steps/StepObjektdaten.tsx
git commit -m "feat(wizard): implement steps 1-2 (Stammdaten, Objektdaten)"
```

---

## Task 4: Steps 3–4 (Kauf & Nebenkosten, Einnahmen)

**Files:**
- Modify: `web/components/wizard/steps/StepKauf.tsx`
- Modify: `web/components/wizard/steps/StepEinnahmen.tsx`

- [ ] **Step 1: Replace `StepKauf.tsx`**

```tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { closingCostsTotal, totalInvestment as computeTotalInvestment } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

export function StepKauf() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePriceUnit = values.purchasePriceUnit ?? 0;
  const purchasePriceParking = parkingType !== 'nicht_vorhanden' ? (values.purchasePriceParking ?? 0) : 0;
  const purchasePrice = purchasePriceUnit + purchasePriceParking;
  const closingCosts = closingCostsTotal(
    values.landTransferTax ?? 0,
    values.notaryCosts ?? 0,
    values.landRegistryCosts ?? 0,
    values.agentFee ?? 0,
    values.appraisalCosts ?? 0
  );
  const renovation = values.renovationModernizationCosts ?? 0;
  const total = computeTotalInvestment(purchasePrice, closingCosts, renovation);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Der wirtschaftliche Übergang bestimmt den AfA-Beginn — in der Regel das Datum des Besitzübergangs laut Kaufvertrag.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Kaufdatum" name="purchaseDate" register={register} type="date" />
        <TextField label="Wirtschaftlicher Übergang" name="economicTransferDate" register={register} type="date" required />
      </div>

      <CurrencyField label="Kaufpreis Wohnung" name="purchasePriceUnit" register={register} required />
      {parkingType !== 'nicht_vorhanden' && (
        <CurrencyField label="Kaufpreis Stellplatz" name="purchasePriceParking" register={register} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
        <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
        <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
        <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
        <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
        <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
      </div>
      <CurrencyField label="davon aktivierungspflichtig" name="renovationAfaEligible" register={register} />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Kaufpreis</span>
          <span>{formatCurrency(purchasePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Kaufnebenkosten</span>
          <span>{formatCurrency(closingCosts)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Renovierung</span>
          <span>{formatCurrency(renovation)}</span>
        </div>
        <div className="flex justify-between border-t border-black/[0.08] pt-1 font-bold">
          <span>= Gesamtinvestment</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `StepEinnahmen.tsx`**

```tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { grossYield } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

export function StepEinnahmen() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const coldRentMonthly = values.coldRentMonthly ?? 0;
  const parkingRentMonthly = parkingType !== 'nicht_vorhanden' ? (values.parkingRentMonthly ?? 0) : 0;
  const purchasePrice =
    (values.purchasePriceUnit ?? 0) + (parkingType !== 'nicht_vorhanden' ? (values.purchasePriceParking ?? 0) : 0);
  const coldRentYearly = coldRentMonthly * 12;
  const warmmieteYearly = values.warmmieteMonthly ? values.warmmieteMonthly * 12 : null;
  const yieldValue = grossYield(coldRentYearly, parkingRentMonthly * 12, purchasePrice);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Prognose-Einnahmen bei Vollvermietung. Die Nettokaltmiete ist Pflicht — sie ist Basis aller Rendite-KPIs.
      </p>

      <CurrencyField label="Nettomiete/Monat" name="coldRentMonthly" register={register} required />
      <CurrencyField label="Bruttomiete/Monat" name="warmmieteMonthly" register={register} hint="Optional, vereinbarte Warmmiete inkl. NK" />
      {parkingType !== 'nicht_vorhanden' && (
        <CurrencyField label="Parkingmiete/Monat" name="parkingRentMonthly" register={register} />
      )}
      <CurrencyField label="Sonstige Einnahmen/Monat" name="otherIncomeMonthly" register={register} />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Nettomiete / Jahr</span>
          <span>{formatCurrency(coldRentYearly)}</span>
        </div>
        {warmmieteYearly !== null && (
          <div className="flex justify-between">
            <span>Bruttomiete / Jahr</span>
            <span>{formatCurrency(warmmieteYearly)}</span>
          </div>
        )}
      </div>

      {yieldValue !== null && <p className="text-sm font-semibold text-text-primary">Bruttorendite: {formatPercent(yieldValue)}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify build and manual check**

Run: `cd web && pnpm build`
Expected: succeeds. Step 3's summary panel updates live as prices/costs are typed; toggling "Stellplatz" in step 2 shows/hides the Stellplatz price field here. Step 4 shows the gross-yield badge once both rent and purchase price are set.

- [ ] **Step 4: Commit**

```bash
git add web/components/wizard/steps/StepKauf.tsx web/components/wizard/steps/StepEinnahmen.tsx
git commit -m "feat(wizard): implement steps 3-4 (Kauf & Nebenkosten, Einnahmen)"
```

---

## Task 5: Steps 5–6 (Kosten, Finanzierung)

**Files:**
- Modify: `web/components/wizard/steps/StepKosten.tsx`
- Modify: `web/components/wizard/steps/StepFinanzierung.tsx`

- [ ] **Step 1: Replace `StepKosten.tsx`**

```tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

export function StepKosten() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const isHoaUnitSplit = useWatch({ control, name: 'isHoaUnitSplit' });
  const isHoaParkingSplit = useWatch({ control, name: 'isHoaParkingSplit' });
  const values = useWatch({ control });

  const hoaFeeTotalMonthly = values.hoaFeeTotalMonthly ?? 0;
  const hoaFeeRecoverableMonthly = isHoaUnitSplit ? (values.hoaFeeRecoverableMonthly ?? 0) : 0;
  const hoaFeeMaintenanceReserveMonthly = isHoaUnitSplit ? (values.hoaFeeMaintenanceReserveMonthly ?? 0) : 0;
  const hoaFeeNonRecoverableMonthly = hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - hoaFeeMaintenanceReserveMonthly;
  const nonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    hoaFeeMaintenanceReserveMonthly +
    (values.propertyManagementAnnual ?? 0) / 12 +
    (values.propertyInsuranceAnnual ?? 0) / 12 +
    (values.otherCostsMonthly ?? 0);
  const hoaSplitExceedsTotal = hoaFeeRecoverableMonthly + hoaFeeMaintenanceReserveMonthly > hoaFeeTotalMonthly;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Bei WEG-Wohnungen enthält das Hausgeld meist Instandhaltungsrücklage — nur zusätzliche Kosten separat eintragen.
      </p>

      <div className="space-y-3 rounded-md border border-black/[0.06] p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Hausgeld Wohnung</p>
        <CurrencyField label="Hausgeld gesamt/Monat" name="hoaFeeTotalMonthly" register={register} required />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" {...register('isHoaUnitSplit')} /> Aufteilen
        </label>
        {isHoaUnitSplit ? (
          <>
            <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeRecoverableMonthly" register={register} required />
            <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeMaintenanceReserveMonthly" register={register} />
            <p className="text-sm text-text-secondary">davon nicht umlagefähig/Monat: {formatCurrency(hoaFeeNonRecoverableMonthly)}</p>
            {hoaSplitExceedsTotal && (
              <p className="text-sm text-warning">⚠ Umlagefähig + Rücklage darf das Hausgeld gesamt nicht übersteigen.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-text-dim">Hausgeld aufteilen für genaue steuerliche Berechnung.</p>
        )}
      </div>

      <CurrencyField label="Grundsteuer Wohnung/Jahr" name="propertyTaxAnnual" register={register} required />
      <CurrencyField label="Verwaltung/Jahr" name="propertyManagementAnnual" register={register} />
      <CurrencyField label="Gebäudeversicherung/Jahr (separat)" name="propertyInsuranceAnnual" register={register} />
      <CurrencyField label="Sonstige Kosten/Monat" name="otherCostsMonthly" register={register} />

      {parkingType !== 'nicht_vorhanden' && (
        <div className="space-y-3 rounded-md border border-black/[0.06] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Hausgeld Stellplatz</p>
          <CurrencyField label="Hausgeld Stellplatz gesamt/Monat" name="hoaFeeParkingTotalMonthly" register={register} />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" {...register('isHoaParkingSplit')} /> Aufteilen
          </label>
          {isHoaParkingSplit && (
            <>
              <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeParkingRecoverableMonthly" register={register} />
              <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeParkingMaintenanceReserveMonthly" register={register} />
            </>
          )}
          <CurrencyField label="Grundsteuer Stellplatz/Jahr" name="propertyTaxParkingAnnual" register={register} />
        </div>
      )}

      <p className="font-bold text-text-primary">Nicht umlagefähige Kosten Wohnung/Monat: {formatCurrency(nonRecoverableMonthly)}</p>
    </div>
  );
}
```

- [ ] **Step 2: Replace `StepFinanzierung.tsx`**

The monthly-rate field auto-syncs to the calculated value until the user edits it directly (`isDirty` on that field), matching the spec's "vorausgefüllt, editierbar" behavior without a separate shadow field.

```tsx
'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { TextField } from '@/components/ui/TextField';
import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import { equityUsed, ltvRatio, totalInvestment as computeTotalInvestment, closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

export function StepFinanzierung() {
  const { register, control, setValue, getFieldState } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const loanAmount = values.loanAmount ?? 0;
  const interestRate = values.interestRate ?? 0;
  const amortizationRate = values.amortizationRate ?? 0;
  const calculatedMortgage = monthlyMortgageCalc(loanAmount, interestRate, amortizationRate);

  useEffect(() => {
    if (!getFieldState('monthlyMortgage').isDirty) {
      setValue('monthlyMortgage', Math.round(calculatedMortgage * 100) / 100);
    }
  }, [calculatedMortgage, getFieldState, setValue]);

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = (values.purchasePriceUnit ?? 0) + (parkingType !== 'nicht_vorhanden' ? (values.purchasePriceParking ?? 0) : 0);
  const closingCosts = closingCostsTotal(
    values.landTransferTax ?? 0,
    values.notaryCosts ?? 0,
    values.landRegistryCosts ?? 0,
    values.agentFee ?? 0,
    values.appraisalCosts ?? 0
  );
  const total = computeTotalInvestment(purchasePrice, closingCosts, values.renovationModernizationCosts ?? 0);
  const equity = equityUsed(total, loanAmount);
  const ltv = ltvRatio(loanAmount, total);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Die Monatsrate wird automatisch aus Darlehensbetrag, Zins- und Tilgungssatz berechnet — du kannst sie danach frei überschreiben.
      </p>

      <CurrencyField label="Darlehensbetrag" name="loanAmount" register={register} required />
      <div className="grid grid-cols-2 gap-3">
        <PercentField label="Zinssatz" name="interestRate" control={control} required />
        <PercentField label="Tilgungssatz" name="amortizationRate" control={control} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Zinsbindung (Jahre)" name="fixedInterestPeriodYears" register={register} type="number" />
        <TextField label="Darlehensbeginn" name="loanStartDate" register={register} type="date" />
      </div>
      <CurrencyField label="Monatsrate" name="monthlyMortgage" register={register} />

      <CurrencyField label="Eigenkapital eingebracht" name="equityContributed" register={register} />
      <CurrencyField
        label="Eigenprovisions-Vereinbarung"
        name="brokerCommissionAgreement"
        register={register}
        hint="Maklerkosten aus separater Vereinbarung — Anschaffungsnebenkosten, erhöht die AfA-Basis"
      />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Berechnete Monatsrate</span>
          <span>{formatCurrency(calculatedMortgage)}</span>
        </div>
        <div className="flex justify-between">
          <span>Eigenkapital (genutzt)</span>
          <span>{formatCurrency(equity)}</span>
        </div>
        <div className="flex justify-between">
          <span>Anfangs-LTV</span>
          <span>{ltv !== null ? formatPercent(ltv) : '–'}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build and manual check**

Run: `cd web && pnpm build`
Expected: succeeds. In step 5, toggling "Aufteilen" reveals the recoverable/reserve fields; entering values that exceed the total shows the warning. In step 6, entering loan amount/interest/amortization auto-fills "Monatsrate" until it's edited by hand, after which it stops auto-updating.

- [ ] **Step 4: Commit**

```bash
git add web/components/wizard/steps/StepKosten.tsx web/components/wizard/steps/StepFinanzierung.tsx
git commit -m "feat(wizard): implement steps 5-6 (Kosten, Finanzierung)"
```

---

## Task 6: Step 7 (AfA & Steuer)

**Files:**
- Modify: `web/components/wizard/steps/StepAfaSteuer.tsx`

- [ ] **Step 1: Replace `StepAfaSteuer.tsx`**

```tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { afaBasis, depreciationYearly, depreciationMonthly } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

export function StepAfaSteuer() {
  const { register, control } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = (values.purchasePriceUnit ?? 0) + (parkingType !== 'nicht_vorhanden' ? (values.purchasePriceParking ?? 0) : 0);
  const closingCosts = closingCostsTotal(
    values.landTransferTax ?? 0,
    values.notaryCosts ?? 0,
    values.landRegistryCosts ?? 0,
    values.agentFee ?? 0,
    values.appraisalCosts ?? 0
  );
  const buildingValue = values.buildingValue ?? 0;
  const landValue = values.landValue ?? 0;
  const depreciationRate = values.depreciationRate ?? 0;

  const basis = afaBasis(buildingValue, closingCosts, purchasePrice, values.renovationAfaEligible ?? 0);
  const yearly = depreciationYearly(basis, depreciationRate);
  const monthly = depreciationMonthly(basis, depreciationRate);

  const sumDeviation = purchasePrice > 0 ? Math.abs(buildingValue + landValue - purchasePrice) / purchasePrice : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (Regierungs-Excel). Beide Werte sollten sich zum Kaufpreis
        addieren (Toleranz ±5%).
      </p>

      <CurrencyField label="Gebäudewert (aus Regierungs-Excel)" name="buildingValue" register={register} required />
      <CurrencyField label="Grundstückswert (aus Regierungs-Excel)" name="landValue" register={register} required />

      {sumDeviation > 0.05 && purchasePrice > 0 && (
        <p className="text-sm text-warning">
          ⚠ Gebäude + Grundstück ({formatCurrency(buildingValue + landValue)}) weicht {(sumDeviation * 100).toFixed(1)}% vom Kaufpreis
          ab — Werte aus dem Regierungs-Excel prüfen.
        </p>
      )}

      <PercentField label="AfA-Satz" name="depreciationRate" control={control} required />
      <p className="text-xs text-text-dim">Standard: 2,0% (ab 1925) · 2,5% (vor 1925) · 3,0% (Neubau ab 2023) · individuell per Gutachten</p>

      <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>AfA-Bemessungsgrundlage</span>
          <span>{formatCurrency(basis)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>AfA / Jahr</span>
          <span>{formatCurrency(yearly)}</span>
        </div>
        <div className="flex justify-between">
          <span>AfA / Monat</span>
          <span>{formatCurrency(monthly)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build and manual check**

Run: `cd web && pnpm build`
Expected: succeeds. Entering building/land values that deviate >5% from the purchase price (step 3) shows the warning; AfA summary updates live.

- [ ] **Step 3: Commit**

```bash
git add web/components/wizard/steps/StepAfaSteuer.tsx
git commit -m "feat(wizard): implement step 7 (AfA & Steuer)"
```

---

## Task 7: Step 8 (Status-Onboarding, conditional) + full wizard verification

**Files:**
- Modify: `web/components/wizard/steps/StepStatusOnboarding.tsx`

- [ ] **Step 1: Replace `StepStatusOnboarding.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { formatDate } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const STATUS_OPTIONS: Array<[WizardFormValues['firstStatus'], string]> = [
  ['vermietet', 'Vermietet'],
  ['leerstand', 'Leerstand'],
  ['mietgarantie', 'Mietgarantie'],
];

export function StepStatusOnboarding() {
  const { register, control, setValue, getFieldState } = useFormContext<WizardFormValues>();
  const economicTransferDate = useWatch({ control, name: 'economicTransferDate' });
  const firstStatus = useWatch({ control, name: 'firstStatus' });

  useEffect(() => {
    if (!getFieldState('firstStatusDate').isDirty && economicTransferDate) {
      setValue('firstStatusDate', economicTransferDate);
    }
  }, [economicTransferDate, getFieldState, setValue]);

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-accent/10 p-3 text-sm text-text-primary">
        Der wirtschaftliche Übergang ({economicTransferDate ? formatDate(new Date(economicTransferDate + 'T00:00:00Z')) : '–'}) liegt
        in der Vergangenheit. Erfasse den bisherigen Nutzungsverlauf — mindestens ein Eintrag ab diesem Datum ist Pflicht.
      </p>

      <TextField label="Erster Statuseintrag ab (Datum)" name="firstStatusDate" register={register} type="date" required />

      <label className="block">
        <span className="text-[13px] font-medium text-text-secondary">Status</span>
        <select
          {...register('firstStatus')}
          className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {firstStatus === 'mietgarantie' && (
        <CurrencyField label="Einnahmen in diesem Zeitraum/Monat" name="firstStatusIncome" register={register} />
      )}

      <TextField label="Notiz (optional)" name="firstStatusNotes" register={register} />

      <p className="text-xs text-text-dim">Weitere Statuswechsel können nach dem Anlegen im Cashflow-Tab ergänzt werden.</p>
    </div>
  );
}
```

- [ ] **Step 2: Full end-to-end manual verification**

Run `pnpm dev`, sign in, click "+ Immobilie".

1. Leave `economicTransferDate` at its default (today) — confirm 8 steps show and step 8 ("Nutzungsverlauf") requires a status before... actually step 8 has no blocking gate (`canProceedFromStep` default `true`) but `canFinish` doesn't require it either, per spec's literal formula — verify "Fertigstellen" still requires only the spec's 8 listed fields, confirm this is intentional per spec.
2. Fill Stammdaten (name/address/city), toggle "Stellplatz" to "Tiefgarage" in Objektdaten and confirm the parking price/rent/cost fields appear in steps 3–5.
3. Fill Kauf (purchasePriceUnit), Einnahmen (coldRentMonthly), Finanzierung (loanAmount/interestRate/amortizationRate — confirm Monatsrate auto-fills), AfA & Steuer (buildingValue/landValue).
4. Set `economicTransferDate` to a date more than a year in the future — confirm the step count drops to 7 and step 8 disappears from the nav.
5. Set it back to a past date, fill step 8 (status = "Vermietet", date defaults to the transfer date).
6. Click "Fertigstellen" — confirm redirect to `/` and the new property card appears in the portfolio grid with the entered KPIs (cashflow, net yield, purchase price/m², remaining debt).
7. Confirm in Supabase (`select * from properties order by created_at desc limit 1`) that parking fields are `0`/`false` if you toggled parking back off before finishing, and that `monthly_mortgage` matches either your manual entry or the calculated fallback.

- [ ] **Step 3: Run full test suite one more time**

Run: `cd web && pnpm test && pnpm build`
Expected: all pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/components/wizard/steps/StepStatusOnboarding.tsx
git commit -m "feat(wizard): implement step 8 (Status-Onboarding)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 7 base steps + conditional step 8 from `docs/specs/spec-property-setup.md` implemented, including per-step live summaries (Kauf, Einnahmen, Kosten, Finanzierung, AfA), the ±5% AfA deviation warning, the HOA-split validation warning, and the exact `canFinish` formula quoted verbatim from the spec.
- [x] **Not covered here (tracked separately):** photo upload (Storage not wired), Immobiliendaten-only fields (`vacancy_rate_assumption`, `market_rent_per_sqm`, `current_market_value`, `parking_count`, room/floor detail fields not in the wizard spec), editing an existing property, Property Detail tabs (Plan 4).
- [x] **Placeholder scan:** no TBD/TODO in any step; all 8 step components and the domain-logic module are fully implemented, not stubbed, by the end of Task 7.
- [x] **Type consistency:** `WizardFormValues` field names match 1:1 with what every step component reads via `useFormContext`/`useWatch`, and `mapToPropertyInsert`/`mapToStatusEntryInsert` map every one of them to the exact snake_case column name from `Database['public']['Tables']['properties']['Insert']` / `['status_entries']['Insert']` — checked against `web/lib/supabase/types.ts` directly, not from memory.
- [x] **Security:** `createProperty` sets `user_id` from `supabase.auth.getUser()` server-side; the client-supplied insert row never carries it (enforced at the type level via `Omit<TablesInsert<'properties'>, 'user_id'>`).
