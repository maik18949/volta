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
