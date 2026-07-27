import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import type { Database } from '@/lib/supabase/types';
import { mapPropertyToEditFormValues, mapEditFormValuesToPropertyUpdate, type PropertyEditFormValues } from '@/lib/wizard/propertyEditLogic';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

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
    year_built: 1998,
    notes: 'Ruhige Lage',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: true,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: true,
    parking_type: 'tiefgarage',
    parking_count: 1,
    heating_type: 'gas',
    energy_efficiency_class: 'c',
    condition: 'gepflegt',
    last_renovation_year: 2015,
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
    warmmiete_monthly: 1100,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: 0.05,
    market_rent_per_sqm: 15.5,
    current_market_value: 320_000,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 30,
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
    equity_contributed: 68_000,
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

describe('mapPropertyToEditFormValues', () => {
  it('maps every snake_case DB column to its camelCase form field', () => {
    const property = makeProperty();
    const values = mapPropertyToEditFormValues(property);
    expect(values.name).toBe('ETW Dresden Neustadt');
    expect(values.purchasePriceUnit).toBe(f.purchasePriceUnit);
    expect(values.parkingType).toBe('tiefgarage');
    expect(values.vacancyRateAssumption).toBe(0.05);
    expect(values.marketRentPerSqm).toBe(15.5);
    expect(values.currentMarketValue).toBe(320_000);
  });

  it('a round trip through mapEditFormValuesToPropertyUpdate reproduces the original core fields', () => {
    const property = makeProperty();
    const values = mapPropertyToEditFormValues(property);
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.name).toBe(property.name);
    expect(update.purchase_price_unit).toBe(property.purchase_price_unit);
    expect(update.loan_amount).toBe(property.loan_amount);
    expect(update.vacancy_rate_assumption).toBe(property.vacancy_rate_assumption);
    expect(update.market_rent_per_sqm).toBe(property.market_rent_per_sqm);
    expect(update.current_market_value).toBe(property.current_market_value);
  });

  it('every mapped column round-trips to its original value (exhaustive check)', () => {
    const property = makeProperty();
    const values = mapPropertyToEditFormValues(property);
    const update = mapEditFormValuesToPropertyUpdate(values);

    // Columns this form never touches (managed elsewhere, or DB-only bookkeeping) — excluded from the diff.
    const excludedColumns: Array<keyof typeof property> = [
      'id',
      'user_id',
      'sort_order',
      'created_at',
      'updated_at',
      'land_area_sqm',
      'bedrooms',
      'bathrooms',
      'floor_level',
      'basement_size_sqm',
      'parking_count',
    ];

    for (const key of Object.keys(property) as Array<keyof typeof property>) {
      if (excludedColumns.includes(key)) continue;
      expect(update[key], `field "${key}" did not round-trip correctly`).toEqual(property[key]);
    }
  });
});

describe('mapEditFormValuesToPropertyUpdate', () => {
  it('converts NaN/null optional Annahmen fields to null, guards non-nullable numerics against NaN', () => {
    const property = makeProperty();
    const values: PropertyEditFormValues = {
      ...mapPropertyToEditFormValues(property),
      marketRentPerSqm: NaN,
      currentMarketValue: null,
      vacancyRateAssumption: NaN,
    };
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.market_rent_per_sqm).toBeNull();
    expect(update.current_market_value).toBeNull();
    expect(update.vacancy_rate_assumption).toBe(0);
  });

  it('zeroes out parking fields when parkingType is nicht_vorhanden (reuses mapToPropertyInsert behavior)', () => {
    const property = makeProperty();
    const values: PropertyEditFormValues = {
      ...mapPropertyToEditFormValues(property),
      parkingType: 'nicht_vorhanden',
    };
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.purchase_price_parking).toBe(0);
    expect(update.parking_rent_monthly).toBe(0);
  });
});
