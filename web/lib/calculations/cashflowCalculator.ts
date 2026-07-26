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
