import { makeDate } from './dateHelpers';
import { interestForCalendarYear } from './amortizationCalculator';
import { ownershipDayFraction, leerstandDayFraction, incomeForMonth } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';

export interface AnnualTaxableIncomeInput {
  year: number;
  statusHistory: StatusEntry[];
  economicTransferDate: Date;
  loanStartDate: Date;
  loanAmount: number;
  interestRate: number;
  monthlyMortgage: number;
  afaBasis: number;
  depreciationRate: number;
  hoaUnitNonRecoverableMonthly: number;
  hoaUnitRecoverableMonthly: number;
  hoaParkingNonRecoverableMonthly: number;
  hoaParkingRecoverableMonthly: number; // Stellplatz recoverable — always owner-borne
  propertyTaxUnitMonthly: number;
  propertyTaxParkingMonthly: number; // Stellplatz Grundsteuer — always owner-borne
  propertyManagementMonthly: number;
  otherCostsMonthly: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  today: Date;
}

/**
 * Full annual taxable income for V+V (§21 EStG). Handles acquisition-year
 * proration, exact amortizing interest, and day-level status/ownership splits.
 */
export function annualTaxableIncome(input: AnnualTaxableIncomeInput): number {
  const isAcquisitionYear = input.year === input.economicTransferDate.getUTCFullYear();

  const ownershipMonths: Date[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = makeDate(input.year, month, 1);
    if (ownershipDayFraction(d, input.economicTransferDate) > 0) {
      ownershipMonths.push(d);
    }
  }
  if (ownershipMonths.length === 0) return 0;

  const interestYear = interestForCalendarYear(
    input.year,
    input.loanStartDate,
    input.loanAmount,
    input.interestRate,
    input.monthlyMortgage
  );

  const afaYear = isAcquisitionYear
    ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
    : input.afaBasis * input.depreciationRate;

  let totalIncome = 0;
  let ownershipMonthEquivalent = 0;
  let leerstandEquivalentMonths = 0;

  for (const month of ownershipMonths) {
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    ownershipMonthEquivalent += ownerFraction;

    const leerstandFraction = leerstandDayFraction(month, input.statusHistory, input.today);
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    totalIncome +=
      incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly) *
      ownerFraction;
  }

  const alwaysDeductions =
    (input.hoaUnitNonRecoverableMonthly +
      input.hoaParkingNonRecoverableMonthly +
      input.hoaParkingRecoverableMonthly +
      input.propertyTaxParkingMonthly +
      input.propertyManagementMonthly +
      input.otherCostsMonthly) *
    ownershipMonthEquivalent;

  const leerstandDeductions = (input.hoaUnitRecoverableMonthly + input.propertyTaxUnitMonthly) * leerstandEquivalentMonths;

  return totalIncome - interestYear - afaYear - alwaysDeductions - leerstandDeductions;
}

/** Jährlicher Steuereffekt: negatives Ergebnis (Verlust) × Grenzsteuersatz = Erstattung. */
export function taxEffectYearly(taxableIncomeVV: number, marginalTaxRate: number): number {
  return taxableIncomeVV * marginalTaxRate * -1;
}

/** Monatlicher Steuereffekt = jährlicher Effekt ÷ Eigentumsmonate im Jahr (not always 12). */
export function taxEffectMonthly(taxEffectYearlyValue: number, ownershipMonths: number): number {
  if (ownershipMonths <= 0) return 0;
  return taxEffectYearlyValue / ownershipMonths;
}
