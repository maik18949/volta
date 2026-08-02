import { describe, it, expect } from 'vitest';
import { fixtures as f } from './calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { kpiCalculationText } from '@/lib/kpiCalculationText';
import { formatCurrency, formatPercent } from '@/lib/formatters';

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

describe('kpiCalculationText', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);
  const summary = computePropertySummary(property, statusEntries, today);
  const overview = computeOverviewMetrics(property, statusEntries, [], summary, today);

  it('grossYield: shows the monthly rents, ×12, over the purchase price, ending in the formatted result', () => {
    const text = kpiCalculationText('grossYield', property, summary, overview);
    expect(text).toContain(formatCurrency(f.coldRentMonthly));
    expect(text).toContain(formatCurrency(f.parkingRentMonthly));
    expect(text).toContain(formatCurrency(f.purchasePrice));
    expect(text?.endsWith(formatPercent(overview.grossYield!))).toBe(true);
  });

  it('netYield: NOI over total investment', () => {
    const text = kpiCalculationText('netYield', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.netOperatingIncomeYearly));
    expect(text).toContain(formatCurrency(summary.totalInvestment));
    expect(text?.endsWith(formatPercent(summary.netYield!))).toBe(true);
  });

  it('dscr: NOI over annual debt service (monthly mortgage × 12)', () => {
    const text = kpiCalculationText('dscr', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.netOperatingIncomeYearly));
    expect(text).toContain(formatCurrency(property.monthly_mortgage * 12));
  });

  it('ltv: remaining debt over total investment', () => {
    const text = kpiCalculationText('ltv', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.remainingDebtNow));
    expect(text).toContain(formatCurrency(summary.totalInvestment));
    expect(text?.endsWith(formatPercent(overview.ltv!))).toBe(true);
  });

  it('kaufpreisfaktor: purchase price over yearly rent, ending in the ×-formatted result', () => {
    const text = kpiCalculationText('kaufpreisfaktor', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.totalPurchasePrice));
    expect(text).toMatch(/×$/);
  });

  it('returns null when the underlying KPI value itself is null (e.g. no status history for actualVacancyRate)', () => {
    const noHistoryOverview = computeOverviewMetrics(property, [], [], summary, today);
    expect(noHistoryOverview.actualVacancyRate).toBeNull();
    expect(kpiCalculationText('actualVacancyRate', property, summary, noHistoryOverview)).toBeNull();
  });

  it('actualVacancyRate: shows leerstand days over ownership days when history exists', () => {
    const text = kpiCalculationText('actualVacancyRate', property, summary, overview);
    expect(text).toContain(`${overview.leerstandDaysSinceTransfer}`);
    expect(text).toContain(`${overview.ownershipDaysSinceTransfer}`);
  });

  it('cashOnCash: pre-tax annual cashflow over equity used', () => {
    const text = kpiCalculationText('cashOnCash', property, summary, overview);
    expect(text).toContain(formatCurrency(overview.cashflowBeforeTaxYear));
    expect(text).toContain(formatCurrency(overview.equityUsed));
    expect(text?.endsWith(formatPercent(overview.cashOnCash!))).toBe(true);
  });

  it('eigenkapitalrendite: numerator (interest-only, not full Kreditrate) over equity used', () => {
    const text = kpiCalculationText('eigenkapitalrendite', property, summary, overview);
    expect(text).toContain(formatCurrency(overview.eigenkapitalrenditeNumerator));
    expect(text).toContain(formatCurrency(overview.equityUsed));
    expect(text?.endsWith(formatPercent(overview.eigenkapitalrendite!))).toBe(true);
  });
});
