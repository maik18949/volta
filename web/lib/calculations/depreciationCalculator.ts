import { monthOf } from './dateHelpers';

/**
 * Gesamtanschaffungskosten = Kaufpreis + Kaufnebenkosten. Auf diese Basis bezieht sich die
 * Kaufpreisaufteilung (BMF-Arbeitshilfe): Gebäude- und Grundstückswert summieren sich dazu.
 */
export function acquisitionCostsTotal(purchasePrice: number, closingCostsTotal: number): number {
  return purchasePrice + closingCostsTotal;
}

/**
 * AfA-Basis = Gebäudewert + aktivierungspflichtige Renovierung.
 * Der Gebäudewert stammt aus der Kaufpreisaufteilung (BMF-Arbeitshilfe) und ist bereits auf die
 * Gesamtanschaffungskosten (Kaufpreis + Nebenkosten) bezogen, enthält also den anteiligen
 * Nebenkostenanteil. Nebenkosten dürfen deshalb NICHT nochmals aufgeschlagen werden.
 */
export function afaBasis(buildingValue: number, renovationAfaEligible: number): number {
  return buildingValue + renovationAfaEligible;
}

export function depreciationYearly(basis: number, rate: number): number {
  return basis * rate;
}

export function depreciationMonthly(basis: number, rate: number): number {
  return depreciationYearly(basis, rate) / 12;
}

/** Fractional deviation of (buildingValue + landValue) from the total acquisition costs; 0 when those or both values are 0. */
export function valuationDeviation(buildingValue: number, landValue: number, totalAcquisitionCosts: number): number {
  if (totalAcquisitionCosts <= 0 || (buildingValue <= 0 && landValue <= 0)) return 0;
  return Math.abs(buildingValue + landValue - totalAcquisitionCosts) / totalAcquisitionCosts;
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
