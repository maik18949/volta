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

/** Tatsächliche Leerstandsquote = Leerstandstage / Eigentumstage seit Erwerb. */
export function actualVacancyRate(leerstandDays: number, ownershipDays: number): number | null {
  if (ownershipDays <= 0) return null;
  return leerstandDays / ownershipDays;
}

export type BenchmarkKpi = 'grossYield' | 'netYield' | 'cashOnCash' | 'kaufpreisfaktor' | 'dscr' | 'ltv' | 'actualVacancyRate';
export type BenchmarkColor = 'green' | 'orange' | 'red';

interface BenchmarkThreshold {
  direction: 'higherIsBetter' | 'lowerIsBetter';
  green: number;
  orange: number;
}

// Per spec-overview-tab.md's 3-tier chip table (grün/orange/rot) — the richer
// 4-tier "Kontext" copy in docs/superpowers/specs/2026-06-14-kpi-benchmarks.md
// feeds the KPI info sheet's text, not this coloring.
const BENCHMARK_THRESHOLDS: Record<BenchmarkKpi, BenchmarkThreshold> = {
  grossYield: { direction: 'higherIsBetter', green: 0.05, orange: 0.03 },
  netYield: { direction: 'higherIsBetter', green: 0.04, orange: 0.02 },
  cashOnCash: { direction: 'higherIsBetter', green: 0.06, orange: 0.03 },
  kaufpreisfaktor: { direction: 'lowerIsBetter', green: 20, orange: 25 },
  dscr: { direction: 'higherIsBetter', green: 1.25, orange: 1.0 },
  ltv: { direction: 'lowerIsBetter', green: 0.7, orange: 0.8 },
  actualVacancyRate: { direction: 'lowerIsBetter', green: 0.03, orange: 0.08 },
};

/** Chip color for a KPI value. null value (no data yet) -> null (no chip rendered). */
export function benchmarkColor(kpi: BenchmarkKpi, value: number | null): BenchmarkColor | null {
  if (value === null) return null;
  const t = BENCHMARK_THRESHOLDS[kpi];
  if (t.direction === 'higherIsBetter') {
    if (value >= t.green) return 'green';
    if (value >= t.orange) return 'orange';
    return 'red';
  }
  if (value <= t.green) return 'green';
  if (value <= t.orange) return 'orange';
  return 'red';
}
