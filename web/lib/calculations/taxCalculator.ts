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
  propertyInsuranceMonthly: number; // nur wenn > 0
  otherCostsMonthly: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  today: Date;
}

export interface TaxLineItems {
  income: number;
  interest: number;
  depreciation: number;
  hoaNonRecoverableWE: number;
  insuranceWE: number;
  managementWE: number;
  otherCostsWE: number;
  hoaRecoverableWE: number;
  propertyTaxWE: number;
  hoaNonRecoverableTE: number;
  hoaRecoverableTE: number;
  propertyTaxTE: number;
  extraordinaryCostsDeductible: number;
  taxableIncome: number;
}

export interface AnnualTaxableIncomeBreakdownInput extends AnnualTaxableIncomeInput {
  /** Sum of extraordinary_costs.amount for the year where is_deductible = true. */
  extraordinaryCostsDeductibleYearly: number;
}

const ZERO_TAX_LINE_ITEMS: TaxLineItems = {
  income: 0,
  interest: 0,
  depreciation: 0,
  hoaNonRecoverableWE: 0,
  insuranceWE: 0,
  managementWE: 0,
  otherCostsWE: 0,
  hoaRecoverableWE: 0,
  propertyTaxWE: 0,
  hoaNonRecoverableTE: 0,
  hoaRecoverableTE: 0,
  propertyTaxTE: 0,
  extraordinaryCostsDeductible: 0,
  taxableIncome: 0,
};

/**
 * Itemized version of annualTaxableIncome (§21 EStG) — same acquisition-year
 * proration and day-level status/ownership splits, but returns every
 * deduction as its own field instead of just the final total. `annualTaxableIncome`
 * (below) is a thin wrapper around this with extraordinaryCostsDeductibleYearly
 * hardcoded to 0, so its behavior is unchanged by this refactor.
 */
export function annualTaxableIncomeBreakdown(input: AnnualTaxableIncomeBreakdownInput): TaxLineItems {
  const isAcquisitionYear = input.year === input.economicTransferDate.getUTCFullYear();

  const ownershipMonths: Date[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = makeDate(input.year, month, 1);
    if (ownershipDayFraction(d, input.economicTransferDate) > 0) {
      ownershipMonths.push(d);
    }
  }
  if (ownershipMonths.length === 0) return ZERO_TAX_LINE_ITEMS;

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
    // KNOWN LIMITATION: for a mid-month economicTransferDate, this multiplication
    // is not exact — leerstandFraction is a whole-month fraction from
    // statusPeriodCalculator, which defaults days with no StatusEntry (including
    // pre-ownership days in the acquisition month) to 'leerstand'. This can
    // produce a small spurious leerstand-deduction for an acquisition month that
    // was actually fully rented from day one of ownership. Confirmed reachable
    // (e.g. economicTransferDate = day 15, StatusEntry='vermietet' from day 15
    // onward still yields a nonzero leerstand contribution for that month).
    // Fixing this properly requires ownership-window-aware day segmentation in
    // statusPeriodCalculator, not just here — tracked as a follow-up, not fixed
    // in this task.
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    totalIncome +=
      incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly) *
      ownerFraction;
  }

  const hoaNonRecoverableWE = input.hoaUnitNonRecoverableMonthly * ownershipMonthEquivalent;
  const insuranceWE = input.propertyInsuranceMonthly * ownershipMonthEquivalent;
  const managementWE = input.propertyManagementMonthly * ownershipMonthEquivalent;
  const otherCostsWE = input.otherCostsMonthly * ownershipMonthEquivalent;
  const hoaNonRecoverableTE = input.hoaParkingNonRecoverableMonthly * ownershipMonthEquivalent;
  const hoaRecoverableTE = input.hoaParkingRecoverableMonthly * ownershipMonthEquivalent;
  const propertyTaxTE = input.propertyTaxParkingMonthly * ownershipMonthEquivalent;

  const hoaRecoverableWE = input.hoaUnitRecoverableMonthly * leerstandEquivalentMonths;
  const propertyTaxWE = input.propertyTaxUnitMonthly * leerstandEquivalentMonths;

  const extraordinaryCostsDeductible = input.extraordinaryCostsDeductibleYearly;

  const taxableIncome =
    totalIncome -
    interestYear -
    afaYear -
    hoaNonRecoverableWE -
    insuranceWE -
    managementWE -
    otherCostsWE -
    hoaNonRecoverableTE -
    hoaRecoverableTE -
    propertyTaxTE -
    hoaRecoverableWE -
    propertyTaxWE -
    extraordinaryCostsDeductible;

  return {
    income: totalIncome,
    interest: interestYear,
    depreciation: afaYear,
    hoaNonRecoverableWE,
    insuranceWE,
    managementWE,
    otherCostsWE,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE,
    hoaRecoverableTE,
    propertyTaxTE,
    extraordinaryCostsDeductible,
    taxableIncome,
  };
}

/**
 * Full annual taxable income for V+V (§21 EStG). Handles acquisition-year
 * proration, exact amortizing interest, and day-level status/ownership splits.
 */
export function annualTaxableIncome(input: AnnualTaxableIncomeInput): number {
  return annualTaxableIncomeBreakdown({ ...input, extraordinaryCostsDeductibleYearly: 0 }).taxableIncome;
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
