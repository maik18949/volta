import { leerstandDayFraction } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';

/**
 * Recoverable Wohnung (unit) costs the owner bears for a given month, day-prorated:
 * 0 on days the property is vermietet (tenant pays via Nebenkostenabrechnung),
 * full hoaFeeRecoverable + propertyTax/12 on days it is leerstand/mietgarantie.
 */
export function ownerBorneRecoverableWEForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): number {
  const fraction = leerstandDayFraction(month, statusHistory, today);
  return (hoaFeeRecoverableMonthly + propertyTaxAnnual / 12) * fraction;
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
