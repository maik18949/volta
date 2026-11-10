import { makeDate } from '@/lib/calculations/dateHelpers';

export const fixtures = {
  purchasePriceUnit: 263_600.0,
  purchasePriceParking: 15_000.0,
  purchasePrice: 278_600.0, // unit + parking

  landTransferTax: 15_323.0,
  notaryCosts: 3_631.96,
  landRegistryCosts: 1_180.0,
  agentFee: 0.0,
  appraisalCosts: 0.0,
  closingCostsTotal: 20_134.96,
  renovationModernizationCosts: 0.0,
  renovationAfaEligible: 0.0,
  totalInvestment: 298_734.96,

  coldRentMonthly: 950.0,
  parkingRentMonthly: 48.0,
  coldRentYearly: 11_400.0,
  parkingRentYearly: 576.0,
  vacancyRateAssumption: 0.03,
  effectiveGrossIncomeYearly: 11_616.72, // (cold+parking)*12*(1-0.03)

  hoaFeeTotalMonthly: 417.0,
  hoaFeeRecoverableMonthly: 292.0,
  hoaFeeNonRecoverableMonthly: 125.0, // total - recoverable
  propertyTaxAnnual: 205.0,
  propertyTaxMonthly: 17.0833333, // 205/12
  propertyManagementAnnual: 396.0,
  propertyManagementMonthly: 33.0, // 396/12
  maintenanceReserveMonthly: 34.76,
  propertyInsuranceAnnual: 0.0,
  operatingCostsNonRecoverableMonthly: 192.76, // 125 + 34.76 + 33.0
  operatingCostsNonRecoverableYearly: 2_313.12,
  operatingCostsRecoverableMonthly: 309.0833333, // 292 + 17.0833 + 0

  netOperatingIncomeYearly: 9_303.60, // effective - nonRecovYearly

  loanAmount: 230_000.0,
  interestRate: 0.043,
  amortizationRate: 0.01,
  monthlyMortgage: 1_242.85,
  debtServiceAnnual: 14_914.20, // mortgage * 12
  interestAnnual: 9_890.0, // loanAmount * interestRate
  equityUsed: 68_734.96, // totalInvestment - loanAmount
  cashflowAfterDebtYearly: -5_610.60, // NOI - debtService
  cashflowAfterDebtMonthly: -467.55,

  loanStartDate: makeDate(2025, 10, 1),
  economicTransferDate: makeDate(2026, 2, 1),

  // Kaufpreisaufteilung laut BMF-Rechner auf Basis der Gesamtanschaffungskosten
  // (Kaufpreis + Nebenkosten = 298_734.96); beide Werte summieren sich dazu.
  landValue: 70_710.0,
  buildingValue: 228_024.0,
  depreciationRate: 0.0384,
  marginalTaxRate: 0.42,
  // afaBasis = buildingValue + renovationAfaEligible (Nebenkosten stecken schon im Gebäudewert)
  afaBasis: 228_024.0,
  depreciationYearly: 8_756.12, // afaBasis * 0.0384
  depreciationMonthly: 729.68,

  taxableIncomeVV: -9_342.52, // 11616.72 - 2313.12 - 9890 - 8756.12
  taxEffectYearly: 3_923.86, // 9342.52 * 0.42
  taxEffectMonthly: 326.99,
};
