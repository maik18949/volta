import { makeDate } from './dateHelpers';
import { leerstandDayFraction, incomeForMonth, ownershipDayFraction } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';

export interface OwnerBorneRecoverableWEBreakdown {
  hoaRecoverable: number;
  propertyTax: number;
}

/**
 * Splits ownerBorneRecoverableWEForMonth's combined value into its two line
 * items — the Cashflow tab shows "Umlagef. Kosten WE" and "Grundsteuer WE" as
 * separate rows, both day-fraction-weighted the same way.
 */
export function ownerBorneRecoverableWEBreakdown(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): OwnerBorneRecoverableWEBreakdown {
  const fraction = leerstandDayFraction(month, statusHistory, today);
  return {
    hoaRecoverable: hoaFeeRecoverableMonthly * fraction,
    propertyTax: (propertyTaxAnnual / 12) * fraction,
  };
}

/**
 * Recoverable Wohnung (unit) costs the owner bears for a given month, day-prorated:
 * 0 on days the property is vermietet (tenant pays via Nebenkostenabrechnung),
 * full hoaFeeRecoverable + propertyTax/12 on days it is leerstand/mietgarantie.
 *
 * NOTE: takes propertyTaxAnnual here (divided internally by 12). In contrast,
 * taxCalculator.ts's equivalent field (propertyTaxUnitMonthly) expects the value
 * pre-divided to monthly instead — don't mix these up when wiring a single
 * properties row into both calculators.
 */
export function ownerBorneRecoverableWEForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): number {
  const { hoaRecoverable, propertyTax } = ownerBorneRecoverableWEBreakdown(
    month,
    statusHistory,
    today,
    hoaFeeRecoverableMonthly,
    propertyTaxAnnual
  );
  return hoaRecoverable + propertyTax;
}

export interface CashflowBeforeTaxInput {
  incomeActualMonthly: number;
  monthlyMortgage: number;
  operatingCostsNonRecoverableMonthly: number; // WE: hoaNonRecoverable + maintenanceReserve + propertyManagement/12 + propertyInsurance/12 + otherCosts
  ownerBorneRecoverableWEMonthly: number; // from ownerBorneRecoverableWEForMonth
  hoaFeeParkingNonRecoverableMonthly: number; // TE — always owner-borne, only nonzero if parking exists
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingMonthly: number;
  extraordinaryCostsThisMonth: number;
}

/** Cashflow before tax for a single month. */
export function cashflowBeforeTax(input: CashflowBeforeTaxInput): number {
  return (
    input.incomeActualMonthly -
    input.monthlyMortgage -
    input.operatingCostsNonRecoverableMonthly -
    input.ownerBorneRecoverableWEMonthly -
    input.hoaFeeParkingNonRecoverableMonthly -
    input.hoaFeeParkingMaintenanceReserveMonthly -
    input.hoaFeeParkingRecoverableMonthly -
    input.propertyTaxParkingMonthly -
    input.extraordinaryCostsThisMonth
  );
}

/** Cashflow after tax = before tax + monthly tax effect (positive when the year is a loss). */
export function cashflowAfterTax(cashflowBeforeTaxValue: number, taxEffectMonthly: number): number {
  return cashflowBeforeTaxValue + taxEffectMonthly;
}

export interface AnnualCashflowBeforeTaxInput {
  year: number;
  statusHistory: StatusEntry[];
  economicTransferDate: Date;
  today: Date;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  monthlyMortgage: number;
  operatingCostsNonRecoverableMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingMonthly: number;
  /** key = 'YYYY-MM', value = Σ extraordinary_costs.amount for that month. */
  extraordinaryCostsByMonth: Map<string, number>;
}

/**
 * Sum of cashflowBeforeTax across every ownership month of `year` — the
 * numerator half of spec-calculations.md's cashOnCashReturn (the other half,
 * taxEffectYearly, is added by the caller — see propertyOverview.ts). Mirrors
 * taxCalculator.annualTaxableIncome's ownerFraction-weighting: each month's
 * whole result (income, mortgage, and costs alike) is scaled by that month's
 * ownership fraction, so an acquisition-year partial month isn't over- or
 * under-counted.
 */
export function annualCashflowBeforeTax(input: AnnualCashflowBeforeTaxInput): number {
  let total = 0;

  for (let m = 1; m <= 12; m++) {
    const month = makeDate(input.year, m, 1);
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    if (ownerFraction <= 0) continue;

    const income = incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly);
    const ownerBorneRecoverableWE = ownerBorneRecoverableWEForMonth(
      month,
      input.statusHistory,
      input.today,
      input.hoaFeeRecoverableMonthly,
      input.propertyTaxAnnual
    );
    const key = `${input.year}-${String(m).padStart(2, '0')}`;
    const extraordinaryCostsThisMonth = input.extraordinaryCostsByMonth.get(key) ?? 0;

    const monthResult = cashflowBeforeTax({
      incomeActualMonthly: income,
      monthlyMortgage: input.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: input.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: ownerBorneRecoverableWE,
      hoaFeeParkingNonRecoverableMonthly: input.hoaFeeParkingNonRecoverableMonthly,
      hoaFeeParkingMaintenanceReserveMonthly: input.hoaFeeParkingMaintenanceReserveMonthly,
      hoaFeeParkingRecoverableMonthly: input.hoaFeeParkingRecoverableMonthly,
      propertyTaxParkingMonthly: input.propertyTaxParkingMonthly,
      extraordinaryCostsThisMonth,
    });

    total += monthResult * ownerFraction;
  }

  return total;
}

export interface CashflowLineItems {
  income: number;
  mortgage: number;
  hoaNonRecoverableWE: number;
  maintenanceReserveWE: number;
  insuranceWE: number;
  managementWE: number;
  otherCostsWE: number;
  hoaRecoverableWE: number;
  propertyTaxWE: number;
  hoaNonRecoverableTE: number;
  maintenanceReserveTE: number;
  hoaRecoverableTE: number;
  propertyTaxTE: number;
  extraordinaryCosts: number;
  cashflowBeforeTax: number;
}

function cashflowBeforeTaxFromLineItems(items: Omit<CashflowLineItems, 'cashflowBeforeTax'>): number {
  return (
    items.income -
    items.mortgage -
    items.hoaNonRecoverableWE -
    items.maintenanceReserveWE -
    items.insuranceWE -
    items.managementWE -
    items.otherCostsWE -
    items.hoaRecoverableWE -
    items.propertyTaxWE -
    items.hoaNonRecoverableTE -
    items.maintenanceReserveTE -
    items.hoaRecoverableTE -
    items.propertyTaxTE -
    items.extraordinaryCosts
  );
}

/**
 * NOTE: unlike CashflowBeforeTaxInput.propertyTaxParkingMonthly (already
 * pre-divided), propertyTaxParkingAnnual here (and propertyTaxAnnual) are
 * annual and divided by 12 internally — don't mix the two input shapes up.
 */
export interface CashflowScenarioInput {
  scenario: 'vollvermietung' | 'leerstand';
  coldRentMonthly: number;
  parkingRentMonthly: number;
  otherIncomeMonthly: number;
  monthlyMortgage: number;
  hoaFeeNonRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  propertyInsuranceAnnual: number;
  propertyManagementAnnual: number;
  otherCostsMonthly: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingAnnual: number;
  extraordinaryCostsThisMonth: number;
}

/**
 * Card 1 ("Prognose / Monat") basis — a full settings-only month for a chosen
 * scenario, no status history. Vollvermietung: full income, tenant pays
 * recoverable WE costs (0 owner-borne). Leerstand: zero income, owner bears
 * the full recoverable WE costs. Parking (TE) costs are always owner-borne
 * in both scenarios, per spec-cashflow-tab.md.
 */
export function cashflowLineItemsForScenario(input: CashflowScenarioInput): CashflowLineItems {
  const income =
    input.scenario === 'vollvermietung' ? input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly : 0;
  const hoaRecoverableWE = input.scenario === 'leerstand' ? input.hoaFeeRecoverableMonthly : 0;
  const propertyTaxWE = input.scenario === 'leerstand' ? input.propertyTaxAnnual / 12 : 0;

  const items: Omit<CashflowLineItems, 'cashflowBeforeTax'> = {
    income,
    mortgage: input.monthlyMortgage,
    hoaNonRecoverableWE: input.hoaFeeNonRecoverableMonthly,
    maintenanceReserveWE: input.hoaFeeMaintenanceReserveMonthly,
    insuranceWE: input.propertyInsuranceAnnual / 12,
    managementWE: input.propertyManagementAnnual / 12,
    otherCostsWE: input.otherCostsMonthly,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE: input.hoaFeeParkingNonRecoverableMonthly,
    maintenanceReserveTE: input.hoaFeeParkingMaintenanceReserveMonthly,
    hoaRecoverableTE: input.hoaFeeParkingRecoverableMonthly,
    propertyTaxTE: input.propertyTaxParkingAnnual / 12,
    extraordinaryCosts: input.extraordinaryCostsThisMonth,
  };

  return { ...items, cashflowBeforeTax: cashflowBeforeTaxFromLineItems(items) };
}

export interface CashflowActualMonthInput {
  month: Date;
  statusHistory: StatusEntry[];
  today: Date;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  monthlyMortgage: number;
  hoaFeeNonRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  propertyInsuranceAnnual: number;
  propertyManagementAnnual: number;
  otherCostsMonthly: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingAnnual: number;
  extraordinaryCostsThisMonth: number;
}

/**
 * Card 2 (year table) basis — a real calendar month, day-fraction-weighted
 * by the actual status history (via incomeForMonth / ownerBorneRecoverableWEBreakdown).
 * Past months are Ist, the in-progress month is Ist-to-date + projection,
 * future months project the last known status — all handled by those two
 * functions already.
 */
export function cashflowLineItemsForActualMonth(input: CashflowActualMonthInput): CashflowLineItems {
  const income = incomeForMonth(input.month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly);
  const { hoaRecoverable: hoaRecoverableWE, propertyTax: propertyTaxWE } = ownerBorneRecoverableWEBreakdown(
    input.month,
    input.statusHistory,
    input.today,
    input.hoaFeeRecoverableMonthly,
    input.propertyTaxAnnual
  );

  const items: Omit<CashflowLineItems, 'cashflowBeforeTax'> = {
    income,
    mortgage: input.monthlyMortgage,
    hoaNonRecoverableWE: input.hoaFeeNonRecoverableMonthly,
    maintenanceReserveWE: input.hoaFeeMaintenanceReserveMonthly,
    insuranceWE: input.propertyInsuranceAnnual / 12,
    managementWE: input.propertyManagementAnnual / 12,
    otherCostsWE: input.otherCostsMonthly,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE: input.hoaFeeParkingNonRecoverableMonthly,
    maintenanceReserveTE: input.hoaFeeParkingMaintenanceReserveMonthly,
    hoaRecoverableTE: input.hoaFeeParkingRecoverableMonthly,
    propertyTaxTE: input.propertyTaxParkingAnnual / 12,
    extraordinaryCosts: input.extraordinaryCostsThisMonth,
  };

  return { ...items, cashflowBeforeTax: cashflowBeforeTaxFromLineItems(items) };
}
