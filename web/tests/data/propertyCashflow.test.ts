import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computeCashflowForecastMonth, computeCashflowYearTable } from '@/lib/data/propertyCashflow';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';

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

describe('computeCashflowForecastMonth', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('vollvermietung: full income, no owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'vollvermietung', today);
    expect(result.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'leerstand', today);
    expect(result.lineItems.income).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
  });

  it('taxEffectMonthly matches computeTaxCurrentYear exactly (spec requires the two tabs to agree)', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'vollvermietung', today);
    const taxResult = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.taxEffectMonthly).toBe(taxResult.taxEffectMonthly);
  });

  it('cashflowAfterTax = cashflowBeforeTax + taxEffectMonthly', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'leerstand', today);
    expect(result.cashflowAfterTax).toBeCloseTo(result.lineItems.cashflowBeforeTax + result.taxEffectMonthly, 6);
  });

  it('Card 1 never includes an actual extraordinary cost (it is a hypothetical typical month)', () => {
    const cost = makeExtraordinaryCost({ cost_month: today.toISOString().slice(0, 10) });
    const result = computeCashflowForecastMonth(property, statusEntries, [cost], 'vollvermietung', today);
    expect(result.lineItems.extraordinaryCosts).toBe(0);
  });

  it('lineItems fields are individually wired correctly (insurance, management, other costs, and parking all nonzero)', () => {
    // vollvermietung -> the unit's owner-borne recoverable/property-tax fields
    // (hoaRecoverableWE, propertyTaxWE) stay 0; every field below is a plain
    // monthlyValue, so a copy-paste swap between any two of the several
    // *Monthly cost inputs passed into cashflowLineItemsForScenario would flip
    // two of these expectations without failing the other tests in this block.
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
    const result = computeCashflowForecastMonth(withExtras, statusEntries, [], 'vollvermietung', today);

    expect(result.lineItems.insuranceWE).toBeCloseTo(20, 2);
    expect(result.lineItems.otherCostsWE).toBeCloseTo(15, 2);
    expect(result.lineItems.managementWE).toBeCloseTo(f.propertyManagementMonthly, 2);
    // hoaUnitNonRecoverableMonthly = hoa_fee_total_monthly - recoverable - maintenance reserve
    expect(result.lineItems.hoaNonRecoverableWE).toBeCloseTo(
      f.hoaFeeTotalMonthly - f.hoaFeeRecoverableMonthly - f.maintenanceReserveMonthly,
      2
    );
    // hoaParkingNonRecoverableMonthly = 30 - 12 - 3 = 15/mo
    expect(result.lineItems.hoaNonRecoverableTE).toBeCloseTo(15, 2);
    expect(result.lineItems.maintenanceReserveTE).toBeCloseTo(3, 2);
    expect(result.lineItems.hoaRecoverableTE).toBeCloseTo(12, 2);
    expect(result.lineItems.propertyTaxTE).toBeCloseTo(5, 2);
    expect(result.lineItems.propertyTaxWE).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });
});

describe('computeCashflowYearTable', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()]; // vermietet from 2026-02-01
  const today = makeDate(2026, 6, 15);

  it('returns 12 month columns', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.months).toHaveLength(12);
  });

  it('months before economic_transfer_date are unowned (isOwned false, zeroed line items)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.isOwned).toBe(false);
    expect(january.lineItems.income).toBe(0);
    expect(january.statusLabel).toBeNull();
  });

  it('owned months carry a status label and correct income', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.isOwned).toBe(true);
    expect(june.statusLabel).toBe('vermietet');
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
  });

  it('ownershipMonthCount sums to 11 for a Feb 1 acquisition (Feb-Dec)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.ownershipMonthCount).toBeCloseTo(11, 4);
  });

  it('totalColumn sums cashflowBeforeTax across owned months; avgColumn divides by ownershipMonthCount', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.totalColumn).not.toBeNull();
    expect(result.avgColumn).not.toBeNull();
    expect(result.avgColumn!.cashflowBeforeTax).toBeCloseTo(result.totalColumn!.cashflowBeforeTax / result.ownershipMonthCount, 4);
  });

  it('an extraordinary cost appears in its month, contributes to the year total, and is excluded from Ø when there is only 1 entry', () => {
    const cost = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-06-01', amount: 500 });
    const result = computeCashflowYearTable(property, statusEntries, [cost], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.extraordinaryCostRows).toHaveLength(1);
    expect(june.lineItems.extraordinaryCosts).toBe(500);
    expect(result.extraordinaryCostsTotalForYear).toBe(500);
    expect(result.extraordinaryCostsEntryCountForYear).toBe(1);
    expect(result.extraordinaryCostsAvgForYear).toBeNull(); // spec: only shown when >= 2 entries
  });

  it('extraordinaryCostsAvgForYear is populated once there are >= 2 entries in the year', () => {
    const cost1 = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-03-01', amount: 300 });
    const cost2 = makeExtraordinaryCost({ id: 'c2', cost_month: '2026-06-01', amount: 700 });
    const result = computeCashflowYearTable(property, statusEntries, [cost1, cost2], 2026, today);
    expect(result.extraordinaryCostsTotalForYear).toBe(1000);
    expect(result.extraordinaryCostsAvgForYear).toBeCloseTo(500, 2);
  });

  it('no StatusEntry at all falls back to the vollvermietung scenario for every owned month, all marked as projection', () => {
    const result = computeCashflowYearTable(property, [], [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.isOwned).toBe(true);
    expect(june.statusLabel).toBeNull();
    expect(june.isProjection).toBe(true);
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
    expect(june.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('a future year (beyond the current year) blanks taxEffectMonthly and every month\'s cashflowAfterTax', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2027, today);
    expect(result.isFutureYear).toBe(true);
    expect(result.taxEffectMonthly).toBeNull();
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.cashflowAfterTax).toBeNull();
  });

  it('the current year does not blank taxEffectMonthly, and it matches computeTaxCurrentYear', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.isFutureYear).toBe(false);
    const taxResult = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.taxEffectMonthly).toBe(taxResult.taxEffectMonthly);
  });

  it('hoaUnitSplitWarning mirrors is_hoa_unit_split', () => {
    const notSplit = makeProperty({ is_hoa_unit_split: false });
    const result = computeCashflowYearTable(notSplit, statusEntries, [], 2026, today);
    expect(result.hoaUnitSplitWarning).toBe(true);
  });

  it('a mid-month acquisition prorates the acquisition month\'s line items by ownerFraction', () => {
    // June has 30 days; a transfer on day 15 owns days 15-30 inclusive = 16 days.
    const ownerFraction = (30 - 15 + 1) / 30;
    const midMonthProperty = makeProperty({ economic_transfer_date: '2026-06-15' });
    const fullMonthProperty = makeProperty({ economic_transfer_date: '2026-06-01' });
    const midMonthStatus = [makeStatusEntry({ date: '2026-06-15' })];
    const fullMonthStatus = [makeStatusEntry({ date: '2026-06-01' })];

    const midResult = computeCashflowYearTable(midMonthProperty, midMonthStatus, [], 2026, today);
    const fullResult = computeCashflowYearTable(fullMonthProperty, fullMonthStatus, [], 2026, today);

    const midJune = midResult.months.find((m) => m.month === 6)!;
    const fullJune = fullResult.months.find((m) => m.month === 6)!;

    expect(midJune.lineItems.mortgage).toBeCloseTo(fullJune.lineItems.mortgage * ownerFraction, 4);
  });
});
