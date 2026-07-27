import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

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

function makeExtraordinaryCost(overrides: Partial<ExtraordinaryCostRow> = {}): ExtraordinaryCostRow {
  return {
    id: 'cost-1',
    property_id: 'prop-1',
    cost_month: '2026-06-01',
    amount: 500,
    category: 'sonstiges',
    description_text: 'Reparatur',
    is_deductible: true,
    ...overrides,
  };
}

describe('computeTaxCurrentYear', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('year is the current calendar year', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.year).toBe(2026);
  });

  it('taxEffectYearly is positive (refund) for a loss-making acquisition year', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.lineItems.taxableIncome).toBeLessThan(0);
    expect(result.taxEffectYearly).toBeGreaterThan(0);
  });

  it('only deductible extraordinary costs in the current year reduce taxableIncome', () => {
    const withoutCosts = computeTaxCurrentYear(property, statusEntries, [], today);
    const deductibleCost = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-03-01', amount: 500, is_deductible: true });
    const nonDeductibleCost = makeExtraordinaryCost({ id: 'c2', cost_month: '2026-03-01', amount: 300, is_deductible: false });
    const lastYearCost = makeExtraordinaryCost({ id: 'c3', cost_month: '2025-12-01', amount: 999, is_deductible: true });
    const withCosts = computeTaxCurrentYear(property, statusEntries, [deductibleCost, nonDeductibleCost, lastYearCost], today);
    expect(withoutCosts.lineItems.taxableIncome - withCosts.lineItems.taxableIncome).toBeCloseTo(500, 2);
    expect(withCosts.lineItems.extraordinaryCostsDeductible).toBe(500);
  });

  it('hoaUnitSplitWarning is true when is_hoa_unit_split is false', () => {
    const notSplit = makeProperty({ is_hoa_unit_split: false });
    const result = computeTaxCurrentYear(notSplit, statusEntries, [], today);
    expect(result.hoaUnitSplitWarning).toBe(true);
  });

  it('hoaParkingSplitWarning is false when there is no parking', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.hoaParkingSplitWarning).toBe(false);
  });

  it('hoaParkingSplitWarning is true when parking exists but is not split', () => {
    const withParking = makeProperty({ parking_type: 'tiefgarage', is_hoa_parking_split: false });
    const result = computeTaxCurrentYear(withParking, statusEntries, [], today);
    expect(result.hoaParkingSplitWarning).toBe(true);
  });

  it('transferInFuture is true when economic_transfer_date is after today', () => {
    const futureTransfer = makeProperty({ economic_transfer_date: '2027-01-01' });
    const result = computeTaxCurrentYear(futureTransfer, [], [], today);
    expect(result.transferInFuture).toBe(true);
    expect(result.lineItems.taxableIncome).toBe(0);
  });

  it('lineItems fields are individually wired correctly (insurance, other costs, and parking all nonzero)', () => {
    // economic_transfer_date is 2026-02-01 (day 1 of the month), so ownership
    // for 2026 is exactly 11 full months (Feb-Dec) — ownershipMonthEquivalent
    // = 11 with no partial-month fraction to account for. That makes every
    // field below (all scaled by ownershipMonthEquivalent, not by the
    // leerstand fraction) an exact expected number, independent of statusEntries.
    const withExtras = makeProperty({
      property_insurance_annual: 240, // /12 = 20/mo
      other_costs_monthly: 15,
      parking_type: 'tiefgarage',
      hoa_fee_parking_total_monthly: 30,
      is_hoa_parking_split: true,
      hoa_fee_parking_recoverable_monthly: 12,
      hoa_fee_parking_maintenance_reserve_monthly: 3,
      property_tax_parking_annual: 60, // /12 = 5/mo
    });
    const result = computeTaxCurrentYear(withExtras, statusEntries, [], today);

    expect(result.lineItems.insuranceWE).toBeCloseTo(20 * 11, 2); // 220
    expect(result.lineItems.otherCostsWE).toBeCloseTo(15 * 11, 2); // 165
    // hoaParkingNonRecoverableMonthly = 30 - 12 - 3 = 15/mo
    expect(result.lineItems.hoaNonRecoverableTE).toBeCloseTo(15 * 11, 2); // 165
    expect(result.lineItems.hoaRecoverableTE).toBeCloseTo(12 * 11, 2); // 132
    expect(result.lineItems.propertyTaxTE).toBeCloseTo(5 * 11, 2); // 55
  });
});

describe('computeTaxForecastYear', () => {
  const property = makeProperty();

  it('vollvermietung: full annual income, no owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 'vollvermietung');
    expect(result.year).toBe(2028);
    expect(result.lineItems.income).toBeCloseTo(f.coldRentYearly + f.parkingRentYearly, 2);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 'leerstand');
    expect(result.lineItems.income).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly * 12, 2);
  });

  it('depreciation is never acquisition-year-prorated', () => {
    const result = computeTaxForecastYear(property, 2035, 'vollvermietung');
    const basis = f.buildingValue + f.closingCostsTotal * (f.buildingValue / f.purchasePrice) + f.renovationAfaEligible;
    expect(result.lineItems.depreciation).toBeCloseTo(basis * f.depreciationRate, 0);
  });

  it('taxEffectMonthly divides the yearly effect by 12 (always a full year)', () => {
    const result = computeTaxForecastYear(property, 2028, 'vollvermietung');
    expect(result.taxEffectMonthly).toBeCloseTo(result.taxEffectYearly / 12, 4);
  });

  it('lineItems fields are individually wired correctly (insurance, other costs, management, and parking all nonzero)', () => {
    // vollvermietung -> the unit's owner-borne recoverable/property-tax fields
    // (hoaRecoverableWE, propertyTaxWE) stay 0; every field below is a plain
    // monthlyValue * 12, so a copy-paste swap between any two of the several
    // *Monthly cost inputs passed into taxLineItemsForScenario would flip two
    // of these expectations without failing the other tests in this block.
    const withExtras = makeProperty({
      property_insurance_annual: 240, // /12 = 20/mo
      other_costs_monthly: 15,
      parking_type: 'tiefgarage',
      hoa_fee_parking_total_monthly: 30,
      is_hoa_parking_split: true,
      hoa_fee_parking_recoverable_monthly: 12,
      hoa_fee_parking_maintenance_reserve_monthly: 3,
      property_tax_parking_annual: 60, // /12 = 5/mo
    });
    const result = computeTaxForecastYear(withExtras, 2028, 'vollvermietung');

    expect(result.lineItems.insuranceWE).toBeCloseTo(20 * 12, 2); // 240
    expect(result.lineItems.otherCostsWE).toBeCloseTo(15 * 12, 2); // 180
    expect(result.lineItems.managementWE).toBeCloseTo(f.propertyManagementMonthly * 12, 2);
    // hoaUnitNonRecoverableMonthly = hoa_fee_total_monthly - recoverable - maintenance reserve = 417 - 292 - 34.76 = 90.24/mo
    expect(result.lineItems.hoaNonRecoverableWE).toBeCloseTo((f.hoaFeeTotalMonthly - f.hoaFeeRecoverableMonthly - f.maintenanceReserveMonthly) * 12, 2);
    // hoaParkingNonRecoverableMonthly = 30 - 12 - 3 = 15/mo
    expect(result.lineItems.hoaNonRecoverableTE).toBeCloseTo(15 * 12, 2); // 180
    expect(result.lineItems.hoaRecoverableTE).toBeCloseTo(12 * 12, 2); // 144
    expect(result.lineItems.propertyTaxTE).toBeCloseTo(5 * 12, 2); // 60
    expect(result.lineItems.propertyTaxWE).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });
});
