import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { grossYield, mietmultiplikator, cashOnCashReturn } from '@/lib/calculations/kpiCalculator';
import { annualCashflowBeforeTax } from '@/lib/calculations/cashflowCalculator';
import { principalForCalendarYear } from '@/lib/calculations/amortizationCalculator';

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

describe('computeOverviewMetrics', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const extraordinaryCosts: ExtraordinaryCostRow[] = [];
  const today = makeDate(2026, 6, 15);
  const summary = computePropertySummary(property, statusEntries, today);
  const result = computeOverviewMetrics(property, statusEntries, extraordinaryCosts, summary, today);

  it('grossYield matches the direct formula', () => {
    const expected = grossYield(f.coldRentYearly, f.parkingRentYearly, f.purchasePrice);
    expect(result.grossYield).toBeCloseTo(expected!, 4);
  });

  it('kaufpreisfaktor matches the direct formula', () => {
    const expected = mietmultiplikator(f.purchasePrice, f.coldRentYearly, f.parkingRentYearly);
    expect(result.kaufpreisfaktor).toBeCloseTo(expected!, 4);
  });

  it('dscr = NOI / (monthlyMortgage * 12), consistent with the summary it was built from', () => {
    expect(result.dscr).toBeCloseTo(summary.netOperatingIncomeYearly / (property.monthly_mortgage * 12), 6);
  });

  it('ltv = remainingDebtNow / totalInvestment, consistent with the summary it was built from', () => {
    expect(result.ltv).toBeCloseTo(summary.remainingDebtNow / summary.totalInvestment, 6);
  });

  it('equityUsed = totalInvestment - loanAmount', () => {
    expect(result.equityUsed).toBeCloseTo(f.equityUsed, 0);
  });

  it('actualVacancyRate is 0 for a fully vermietet history since acquisition', () => {
    expect(result.actualVacancyRate).toBeCloseTo(0, 4);
  });

  it('breakEvenRentMonthly = WE running costs (no parking in the base fixture) + monthly mortgage', () => {
    // operatingCostsNonRecoverableMonthly = 90.24 (hoaFeeNonRecoverable) + 34.76 (reserve)
    //   + 33 (propertyManagement/12) + 0 (insurance) + 0 (other) = 158.0
    expect(result.breakEvenRentMonthly).toBeCloseTo(158.0 + f.monthlyMortgage, 1);
  });

  it('valueGain/valueGainPercent are null when current_market_value is unset', () => {
    expect(result.valueGain).toBeNull();
    expect(result.valueGainPercent).toBeNull();
  });

  it('valueGain/valueGainPercent are computed once current_market_value is set', () => {
    const propertyWithValue = makeProperty({ current_market_value: f.purchasePrice + 30_000 });
    const withValueSummary = computePropertySummary(propertyWithValue, statusEntries, today);
    const withValueResult = computeOverviewMetrics(propertyWithValue, statusEntries, extraordinaryCosts, withValueSummary, today);
    expect(withValueResult.valueGain).toBeCloseTo(30_000, 0);
    expect(withValueResult.valueGainPercent).toBeCloseTo(30_000 / f.purchasePrice, 4);
  });

  it('actualVacancyRate is null when there is no status history at all', () => {
    const withoutHistory = computeOverviewMetrics(property, [], extraordinaryCosts, summary, today);
    expect(withoutHistory.actualVacancyRate).toBeNull();
  });

  it('cashOnCash matches annualCashflowBeforeTax(...) PRE-tax, divided by equityUsed (equityContributed is 0)', () => {
    const hoaFeeNonRecoverableMonthly =
      property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
    const operatingCostsNonRecoverableMonthly =
      hoaFeeNonRecoverableMonthly +
      property.hoa_fee_maintenance_reserve_monthly +
      property.property_management_annual / 12 +
      property.property_insurance_annual / 12 +
      property.other_costs_monthly;

    const expectedCashflowYear = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }],
      economicTransferDate: makeDate(2026, 2, 1),
      today,
      coldRentMonthly: property.cold_rent_monthly,
      parkingRentMonthly: property.parking_rent_monthly,
      otherIncomeMonthly: property.other_income_monthly,
      monthlyMortgage: property.monthly_mortgage,
      operatingCostsNonRecoverableMonthly,
      hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
      propertyTaxAnnual: property.property_tax_annual,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth: new Map(),
    });
    // Cash-on-Cash is defined pre-tax per standard usage — no + summary.taxEffectYearly here.
    const expected = cashOnCashReturn(expectedCashflowYear, f.equityUsed);
    expect(result.cashOnCash).toBeCloseTo(expected!, 2);
  });

  it('cashOnCash denominator combines equityContributed and brokerCommissionAgreement when either is set', () => {
    // A separate, privately-arranged broker commission (paid in cash, outside the notarized
    // closing costs) is real invested equity just like equityContributed — per product decision,
    // it must count toward the Cash-on-Cash denominator, not toward Gesamtinvestment/AfA-Basis.
    const totalEquity = 5_134.96 + 15_000;
    const propertyWithEquity = makeProperty({ equity_contributed: 5_134.96, broker_commission_agreement: 15_000 });
    const summaryWithEquity = computePropertySummary(propertyWithEquity, statusEntries, today);
    const resultWithEquity = computeOverviewMetrics(propertyWithEquity, statusEntries, extraordinaryCosts, summaryWithEquity, today);

    // equityContributed/brokerCommissionAgreement don't affect cashflow or taxEffectYearly, only
    // the cashOnCash denominator — so the numerator is identical to the base fixture's above.
    const expected = (result.cashOnCash! * f.equityUsed) / totalEquity;
    expect(resultWithEquity.cashOnCash).toBeCloseTo(expected, 4);
  });

  it('equityUsed (the "Eigenkapital" display value) also reflects real contributed equity once entered', () => {
    const propertyWithEquity = makeProperty({ equity_contributed: 5_134.96, broker_commission_agreement: 15_000 });
    const summaryWithEquity = computePropertySummary(propertyWithEquity, statusEntries, today);
    const resultWithEquity = computeOverviewMetrics(propertyWithEquity, statusEntries, extraordinaryCosts, summaryWithEquity, today);
    expect(resultWithEquity.equityUsed).toBeCloseTo(5_134.96 + 15_000, 2);
  });

  describe('eigenkapitalrendite = (Jahresnettokaltmiete - nicht umlegbare Kosten - Steuern - NUR Zinsen) / eingesetztes Eigenkapital', () => {
    it('equals (cashflowAfterTax + Tilgungsanteil dieses Jahres) / equityUsed — i.e. cashOnCash with only interest subtracted, not the full rate', () => {
      // Once Cash-on-Cash is pre-tax: cashflowBeforeTaxYear = cashOnCash * equityUsed.
      const cashflowBeforeTaxYear = result.cashOnCash! * result.equityUsed;
      const cashflowAfterTaxYear = cashflowBeforeTaxYear + summary.taxEffectYearly;
      const principalThisYear = principalForCalendarYear(
        2026,
        new Date(property.loan_start_date + 'T00:00:00Z'),
        property.loan_amount,
        property.interest_rate,
        property.monthly_mortgage
      );
      const expected = (cashflowAfterTaxYear + principalThisYear) / result.equityUsed;
      expect(result.eigenkapitalrendite).toBeCloseTo(expected, 3);
    });

    it('is unaffected by current_market_value — Wertsteigerung is not part of this formula', () => {
      const propertyWithValue = makeProperty({ current_market_value: f.purchasePrice + 30_000 });
      const summaryWithValue = computePropertySummary(propertyWithValue, statusEntries, today);
      const resultWithValue = computeOverviewMetrics(propertyWithValue, statusEntries, extraordinaryCosts, summaryWithValue, today);

      expect(resultWithValue.eigenkapitalrendite).toBeCloseTo(result.eigenkapitalrendite!, 6);
    });

    it('differs from cashOnCash by exactly (Tilgungsanteil + Steuereffekt) / equityUsed — cashOnCash is pre-tax and subtracts the full Kreditrate, this is after-tax and only subtracts interest', () => {
      const principalThisYear = principalForCalendarYear(
        2026,
        new Date(property.loan_start_date + 'T00:00:00Z'),
        property.loan_amount,
        property.interest_rate,
        property.monthly_mortgage
      );
      const expectedDelta = (principalThisYear + summary.taxEffectYearly) / result.equityUsed;
      expect(result.eigenkapitalrendite! - result.cashOnCash!).toBeCloseTo(expectedDelta, 4);
    });
  });
});
