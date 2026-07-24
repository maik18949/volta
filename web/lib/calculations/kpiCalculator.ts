/** Bruttorendite = (Kaltmiete jährlich + Parkingmiete jährlich) / Kaufpreis */
export function grossYield(coldRentYearly: number, parkingRentYearly: number, purchasePrice: number): number | null {
  if (purchasePrice <= 0) return null;
  return (coldRentYearly + parkingRentYearly) / purchasePrice;
}

/** Nettorendite = NOI / Gesamtinvestment */
export function netYield(netOperatingIncomeYearly: number, totalInvestment: number): number | null {
  if (totalInvestment <= 0) return null;
  return netOperatingIncomeYearly / totalInvestment;
}

/** Cap Rate = NOI / Kaufpreis (ohne Nebenkosten) */
export function capRate(netOperatingIncomeYearly: number, purchasePrice: number): number | null {
  if (purchasePrice <= 0) return null;
  return netOperatingIncomeYearly / purchasePrice;
}

/** Cash-on-Cash Return = Cashflow nach Schuldendienst / eingesetztes EK */
export function cashOnCashReturn(cashflowAfterDebtYearly: number, equityUsed: number): number | null {
  if (equityUsed <= 0) return null;
  return cashflowAfterDebtYearly / equityUsed;
}

/** DSCR (NOI-basiert) = NOI / jährlicher Schuldendienst */
export function dscrNOI(netOperatingIncomeYearly: number, debtServiceAnnual: number): number | null {
  if (debtServiceAnnual <= 0) return null;
  return netOperatingIncomeYearly / debtServiceAnnual;
}

/** Mietmultiplikator = Kaufpreis / Jahreskaltmiete (inkl. Parking) */
export function mietmultiplikator(
  purchasePrice: number,
  coldRentYearly: number,
  parkingRentYearly: number
): number | null {
  const totalRent = coldRentYearly + parkingRentYearly;
  if (totalRent <= 0) return null;
  return purchasePrice / totalRent;
}

/** Break-Even-Miete = nicht-umlagefähige Kosten + Kreditrate */
export function breakEvenRentMonthly(operatingCostsNonRecoverableMonthly: number, monthlyMortgage: number): number {
  return operatingCostsNonRecoverableMonthly + monthlyMortgage;
}

/** LTV = Restschuld / Gesamtinvestment */
export function ltvRatio(remainingDebt: number, totalInvestment: number): number | null {
  if (totalInvestment <= 0) return null;
  return remainingDebt / totalInvestment;
}

/** Effektives Bruttoeinkommen = Bruttomiete * (1 - Leerstandsquote) */
export function effectiveGrossIncomeYearly(grossIncomeYearly: number, vacancyRate: number): number {
  return grossIncomeYearly * (1 - vacancyRate);
}

/** NOI = effektives Bruttoeinkommen - nicht-umlagefähige Kosten */
export function netOperatingIncomeYearly(
  effectiveGrossIncome: number,
  operatingCostsNonRecoverableYearly: number
): number {
  return effectiveGrossIncome - operatingCostsNonRecoverableYearly;
}

/** Eingesetztes Eigenkapital = Gesamtinvestment - Darlehen */
export function equityUsed(totalInvestment: number, loanAmount: number): number {
  return totalInvestment - loanAmount;
}

/** Gesamtinvestment = Kaufpreis + Kaufnebenkosten + Renovierung */
export function totalInvestment(
  purchasePrice: number,
  closingCostsTotal: number,
  renovationModernizationCosts: number
): number {
  return purchasePrice + closingCostsTotal + renovationModernizationCosts;
}

/** Kaufnebenkosten gesamt */
export function closingCostsTotal(
  landTransferTax: number,
  notaryCosts: number,
  landRegistryCosts: number,
  agentFee: number,
  appraisalCosts: number
): number {
  return landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts;
}
