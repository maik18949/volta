import { mapToPropertyInsert, n, nOrNull, type WizardFormValues } from './wizardLogic';
import type { Database, TablesUpdate } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export interface PropertyEditFormValues extends WizardFormValues {
  vacancyRateAssumption: number;
  marketRentPerSqm: number | null;
  currentMarketValue: number | null;
}

/**
 * Reverse of mapToPropertyInsert — a real properties row -> form values. The
 * wizard never needs this (it always starts from makeWizardDefaultValues);
 * the Immobiliendaten edit form always starts from an existing property.
 * firstStatus* fields are Status-Onboarding-only (wizard step 8) and aren't
 * edited here (status is managed in the Verlauf tab) — filled with inert
 * defaults purely so this object satisfies WizardFormValues's shape.
 */
export function mapPropertyToEditFormValues(property: PropertyRow): PropertyEditFormValues {
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    postalCode: property.postal_code,
    state: property.state,
    propertyType: property.property_type,
    acquisitionType: property.acquisition_type,
    yearBuilt: property.year_built,
    notes: property.notes,

    livingAreaSqm: property.living_area_sqm,
    usableAreaSqm: property.usable_area_sqm,
    rooms: property.rooms,
    hasBalcony: property.has_balcony,
    hasTerrace: property.has_terrace,
    hasGarden: property.has_garden,
    hasBasement: property.has_basement,
    hasFittedKitchen: property.has_fitted_kitchen,
    parkingType: property.parking_type,
    heatingType: property.heating_type,
    energyEfficiencyClass: property.energy_efficiency_class,
    condition: property.condition,
    lastRenovationYear: property.last_renovation_year,

    purchaseDate: property.purchase_date,
    economicTransferDate: property.economic_transfer_date,
    purchasePriceUnit: property.purchase_price_unit,
    purchasePriceParking: property.purchase_price_parking,
    landTransferTax: property.land_transfer_tax,
    notaryCosts: property.notary_costs,
    landRegistryCosts: property.land_registry_costs,
    agentFee: property.agent_fee,
    appraisalCosts: property.appraisal_costs,
    renovationModernizationCosts: property.renovation_modernization_costs,
    renovationAfaEligible: property.renovation_afa_eligible,

    coldRentMonthly: property.cold_rent_monthly,
    warmmieteMonthly: property.warmmiete_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,

    hoaFeeTotalMonthly: property.hoa_fee_total_monthly,
    isHoaUnitSplit: property.is_hoa_unit_split,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyManagementAnnual: property.property_management_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingTotalMonthly: property.hoa_fee_parking_total_monthly,
    isHoaParkingSplit: property.is_hoa_parking_split,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,

    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    amortizationRate: property.amortization_rate,
    fixedInterestPeriodYears: property.fixed_interest_period_years,
    loanStartDate: property.loan_start_date,
    monthlyMortgage: property.monthly_mortgage,
    equityContributed: property.equity_contributed,
    brokerCommissionAgreement: property.broker_commission_agreement,

    buildingValue: property.building_value,
    landValue: property.land_value,
    depreciationRate: property.depreciation_rate,
    marginalTaxRate: property.marginal_tax_rate,

    firstStatusDate: property.economic_transfer_date,
    firstStatus: 'vermietet',
    firstStatusIncome: null,
    firstStatusNotes: '',

    vacancyRateAssumption: property.vacancy_rate_assumption,
    marketRentPerSqm: property.market_rent_per_sqm,
    currentMarketValue: property.current_market_value,
  };
}

/**
 * mapToPropertyInsert's Omit<TablesInsert<'properties'>, 'user_id'> return is assignable to TablesUpdate<'properties'>.
 *
 * Used by the Immobiliendaten tab's debounced auto-save, which sends the
 * full row on every save rather than a diff of only changed fields — a
 * deliberate simplification (no dirty-tracking needed) that trades off
 * last-write-wins semantics if the same property is ever edited
 * concurrently in two sessions.
 */
export function mapEditFormValuesToPropertyUpdate(values: PropertyEditFormValues): TablesUpdate<'properties'> {
  return {
    ...mapToPropertyInsert(values),
    vacancy_rate_assumption: n(values.vacancyRateAssumption),
    market_rent_per_sqm: nOrNull(values.marketRentPerSqm),
    current_market_value: nOrNull(values.currentMarketValue),
  };
}
