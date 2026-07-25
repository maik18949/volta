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
