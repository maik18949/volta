import { monthOf } from './dateHelpers';

/**
 * AfA-Basis = Gebäudewert + (Nebenkosten × Gebäudeanteil) + aktivierungspflichtige Renovierung.
 * buildingValue and landValue come from the government valuation spreadsheet (Sachwertverfahren);
 * the building-share ratio is derived from them, never the other way around.
 */
export function afaBasis(
  buildingValue: number,
  closingCostsTotal: number,
  purchasePrice: number,
  renovationAfaEligible: number
): number {
  if (purchasePrice <= 0) return 0;
  const buildingShareRatio = buildingValue / purchasePrice;
  return buildingValue + closingCostsTotal * buildingShareRatio + renovationAfaEligible;
}

export function depreciationYearly(basis: number, rate: number): number {
  return basis * rate;
}

export function depreciationMonthly(basis: number, rate: number): number {
  return depreciationYearly(basis, rate) / 12;
}

/** Fractional deviation of (buildingValue + landValue) from purchasePrice; 0 when purchasePrice or both values are 0. */
export function valuationDeviation(buildingValue: number, landValue: number, purchasePrice: number): number {
  if (purchasePrice <= 0 || (buildingValue <= 0 && landValue <= 0)) return 0;
  return Math.abs(buildingValue + landValue - purchasePrice) / purchasePrice;
}

/**
 * AfA in the acquisition year: prorated from the first full month after
 * economicTransferDate (the month of transfer itself counts in full, per §7 EStG).
 */
export function depreciationProratedInAcquisitionYear(
  basis: number,
  rate: number,
  economicTransferDate: Date
): number {
  const monthsRemaining = 13 - monthOf(economicTransferDate); // e.g. Feb (2) -> 11 months (Feb-Dec)
  return depreciationMonthly(basis, rate) * monthsRemaining;
}
