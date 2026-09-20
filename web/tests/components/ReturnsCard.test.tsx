// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ReturnsCard } from '@/components/property/overview/ReturnsCard';
import { scalePosition } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { Database } from '@/lib/supabase/types';

afterEach(cleanup);

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'Test',
    address: 'Teststr. 1',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01097',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: 1996,
    notes: '',
    living_area_sqm: 76.41,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 2,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'tiefgarage',
    parking_count: 1,
    heating_type: 'gas',
    energy_efficiency_class: 'd',
    condition: 'gepflegt',
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: 263_600,
    purchase_price_parking: 15_000,
    land_transfer_tax: 15_323,
    notary_costs: 3_631.96,
    land_registry_costs: 1_180,
    agent_fee: 0,
    appraisal_costs: 0,
    renovation_modernization_costs: 0,
    renovation_afa_eligible: 0,
    cold_rent_monthly: 950,
    warmmiete_monthly: null,
    parking_rent_monthly: 48,
    other_income_monthly: 0,
    vacancy_rate_assumption: 0.03,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: 417,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: 292,
    hoa_fee_maintenance_reserve_monthly: 34.76,
    property_tax_annual: 205,
    property_management_annual: 396,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: 230_000,
    interest_rate: 0.043,
    amortization_rate: 0.01,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: 1_242.85,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: 50_600,
    building_value: 228_000,
    depreciation_rate: 0.0384,
    marginal_tax_rate: 0.42,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSummary(overrides: Partial<PropertySummary> = {}): PropertySummary {
  return {
    totalInvestment: 0,
    totalPurchasePrice: 0,
    purchasePricePerSqm: 0,
    remainingDebtNow: 0,
    netYield: null,
    netOperatingIncomeYearly: 0,
    currentStatus: 'vermietet',
    cashflowAfterTaxMonthly: 0,
    incomeActualMonthly: 0,
    incomeWohnungMonthly: 0,
    incomeStellplatzMonthly: 0,
    cashflowBeforeTaxMonthly: 0,
    taxEffectMonthly: 0,
    taxEffectYearly: 0,
    runningCostsBreakdown: [],
    ...overrides,
  };
}

function makeOverview(overrides: Partial<OverviewMetrics> = {}): OverviewMetrics {
  return {
    grossYield: null,
    cashOnCash: null,
    eigenkapitalrendite: null,
    kaufpreisfaktor: null,
    dscr: null,
    ltv: null,
    actualVacancyRate: null,
    cashflowBeforeTaxYear: 0,
    eigenkapitalrenditeNumerator: 0,
    leerstandDaysSinceTransfer: 0,
    ownershipDaysSinceTransfer: 0,
    leerstandDaysThisYear: 0,
    ownershipDaysThisYear: 0,
    actualVacancyRateYear: null,
    breakEvenRentMonthly: 0,
    equityUsed: 0,
    currentMarketValue: null,
    valueGain: null,
    valueGainPercent: null,
    ...overrides,
  };
}

function markerLeftPercent(row: HTMLElement): number {
  const marker = row.querySelector('[style]') as HTMLElement;
  return Number(marker.style.left.replace('%', ''));
}

describe('ReturnsCard — KPI scale positions', () => {
  it('places each row\'s scale marker at that KPI\'s own scalePosition — not a shared/mismatched one', () => {
    const overview = makeOverview({
      grossYield: 0.043,
      cashOnCash: -0.291,
      eigenkapitalrendite: 0.092,
      kaufpreisfaktor: 23.3,
      dscr: 0.65,
      ltv: 0.867,
      actualVacancyRate: 0.068,
      actualVacancyRateYear: 0,
    });
    const summary = makeSummary({ netYield: 0.033 });

    render(<ReturnsCard property={makeProperty()} summary={summary} overview={overview} />);

    const cases: Array<[string, string, number]> = [
      ['Bruttorendite', 'grossYield', 0.043],
      ['Nettorendite', 'netYield', 0.033],
      ['Cash-on-Cash', 'cashOnCash', -0.291],
      ['Eigenkapitalrendite', 'eigenkapitalrendite', 0.092],
      ['Kaufpreisfaktor', 'kaufpreisfaktor', 23.3],
      ['DSCR (NOI)', 'dscr', 0.65],
      ['LTV', 'ltv', 0.867],
      ['Tats. Leerstandsquote', 'actualVacancyRate', 0.068],
      ['Tats. Leerstandsquote (Jahr)', 'actualVacancyRateYear', 0],
    ];

    for (const [label, kpi, value] of cases) {
      const row = screen.getByText(label).closest('div.flex.items-center.justify-between') as HTMLElement;
      expect(markerLeftPercent(row)).toBeCloseTo(scalePosition(kpi as Parameters<typeof scalePosition>[0], value) * 100, 5);
    }
  });
});
