import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { taxLineItemsForScenario, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';
import { cashflowAfterTax } from '@/lib/calculations/cashflowCalculator';
import {
  closingCostsTotal as computeClosingCostsTotal,
  totalInvestment as computeTotalInvestment,
  equityUsed as computeEquityUsed,
  effectiveGrossIncomeYearly,
  netOperatingIncomeYearly as computeNetOperatingIncomeYearly,
  hoaNonRecoverableMonthly,
  mietmultiplikator as computeMietmultiplikator,
  grossYield as computeGrossYield,
  netYield as computeNetYield,
  cashOnCashReturn as computeCashOnCashReturn,
  dscrNOI as computeDscrNOI,
  ltvRatio as computeLtvRatio,
  breakEvenRentMonthly as computeBreakEvenRentMonthly,
} from '@/lib/calculations/kpiCalculator';

export interface InvestmentCalculatorValues {
  name: string;
  purchasePriceUnit: number;
  purchasePriceParking: number;
  landTransferTax: number;
  notaryCosts: number;
  landRegistryCosts: number;
  agentFee: number;
  appraisalCosts: number;
  renovationModernizationCosts: number;
  renovationAfaEligible: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  otherIncomeMonthly: number;
  vacancyRateAssumption: number;
  loanAmount: number;
  interestRate: number;
  amortizationRate: number;
  monthlyMortgage: number;
  loanStartDate: string;
  hoaFeeTotalMonthly: number;
  hoaFeeRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  propertyManagementAnnual: number;
  propertyInsuranceAnnual: number;
  otherCostsMonthly: number;
  buildingValue: number;
  depreciationRate: number;
  marginalTaxRate: number;
}

export interface SensitivityDeltas {
  rentDelta: number; // € per month, applied to coldRentMonthly
  rateDelta: number; // decimal, applied to interestRate
  priceDelta: number; // € applied to purchasePriceUnit
  vacancyDelta: number; // decimal, applied to vacancyRateAssumption
  maintenanceDelta: number; // € per month, applied to the non-recoverable HOA fee
}

export const ZERO_SENSITIVITY: SensitivityDeltas = {
  rentDelta: 0,
  rateDelta: 0,
  priceDelta: 0,
  vacancyDelta: 0,
  maintenanceDelta: 0,
};

export interface InvestmentKPIs {
  effectiveColdRentMonthly: number;
  effectiveInterestRate: number;
  effectivePurchasePriceUnit: number;
  effectiveVacancyRate: number;
  purchasePrice: number;
  closingCostsTotal: number;
  totalInvestment: number;
  loanAmount: number;
  equityUsed: number;
  monthlyMortgage: number;
  netOperatingIncomeYearly: number;
  cashflowAfterDebtMonthly: number;
  cashflowAfterTaxMonthly: number;
  mietmultiplikator: number | null;
  grossYield: number | null;
  netYield: number | null;
  cashOnCashReturn: number | null;
  dscrNOI: number | null;
  ltvRatio: number | null;
  breakEvenRentMonthly: number | null;
  hasBaseData: boolean;
  hasFinancingData: boolean;
  hasCostData: boolean;
  hasTaxData: boolean;
}

/**
 * Pure composition of Plan 1's calculation layer for a pre-purchase candidate.
 * Sensitivity deltas are applied here (not persisted) so the UI can render
 * live "what-if" KPIs from slider input without a server round-trip.
 */
export function computeInvestmentKPIs(
  values: InvestmentCalculatorValues,
  sensitivity: SensitivityDeltas,
  today: Date = new Date()
): InvestmentKPIs {
  const effectiveColdRentMonthly = Math.max(0, values.coldRentMonthly + sensitivity.rentDelta);
  const effectiveInterestRate = Math.max(0.001, values.interestRate + sensitivity.rateDelta);
  const effectivePurchasePriceUnit = Math.max(1, values.purchasePriceUnit + sensitivity.priceDelta);
  const effectiveVacancyRate = Math.max(0, Math.min(1, values.vacancyRateAssumption + sensitivity.vacancyDelta));

  const baseNonRecoverableMonthly = hoaNonRecoverableMonthly(
    values.hoaFeeTotalMonthly,
    values.hoaFeeRecoverableMonthly,
    values.hoaFeeMaintenanceReserveMonthly
  );
  const effectiveNonRecoverableMonthly = Math.max(0, baseNonRecoverableMonthly + sensitivity.maintenanceDelta);

  const purchasePrice = effectivePurchasePriceUnit + values.purchasePriceParking;
  const closingCostsTotal = computeClosingCostsTotal(
    values.landTransferTax,
    values.notaryCosts,
    values.landRegistryCosts,
    values.agentFee,
    values.appraisalCosts
  );
  const totalInvestment = computeTotalInvestment(purchasePrice, closingCostsTotal, values.renovationModernizationCosts);
  const equityUsed = computeEquityUsed(totalInvestment, values.loanAmount);

  // Sensitivity on interestRate must recompute the mortgage rate live — the stored
  // monthlyMortgage reflects the base rate the user actually entered/overrode.
  const monthlyMortgage =
    sensitivity.rateDelta === 0
      ? values.monthlyMortgage
      : monthlyMortgageCalc(values.loanAmount, effectiveInterestRate, values.amortizationRate);
  const debtServiceAnnual = monthlyMortgage * 12;

  const grossIncomeMonthly = effectiveColdRentMonthly + values.parkingRentMonthly + values.otherIncomeMonthly;
  const effectiveGrossIncomeYearlyValue = effectiveGrossIncomeYearly(grossIncomeMonthly * 12, effectiveVacancyRate);

  const operatingCostsNonRecoverableMonthly =
    effectiveNonRecoverableMonthly +
    values.hoaFeeMaintenanceReserveMonthly +
    values.propertyManagementAnnual / 12 +
    values.propertyInsuranceAnnual / 12 +
    values.otherCostsMonthly;
  const operatingCostsNonRecoverableYearly = operatingCostsNonRecoverableMonthly * 12;

  const netOperatingIncomeYearly = computeNetOperatingIncomeYearly(effectiveGrossIncomeYearlyValue, operatingCostsNonRecoverableYearly);
  const cashflowAfterDebtYearly = netOperatingIncomeYearly - debtServiceAnnual;
  const cashflowAfterDebtMonthly = cashflowAfterDebtYearly / 12;

  const basis = afaBasis(values.buildingValue, closingCostsTotal, purchasePrice, values.renovationAfaEligible);
  const taxLineItems = taxLineItemsForScenario({
    scenario: 'vollvermietung',
    year: today.getUTCFullYear(),
    coldRentMonthly: effectiveColdRentMonthly,
    parkingRentMonthly: values.parkingRentMonthly,
    loanStartDate: new Date(values.loanStartDate + 'T00:00:00Z'),
    loanAmount: values.loanAmount,
    interestRate: effectiveInterestRate,
    monthlyMortgage,
    afaBasis: basis,
    depreciationRate: values.depreciationRate,
    hoaUnitNonRecoverableMonthly: effectiveNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: values.hoaFeeRecoverableMonthly,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 0,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: values.propertyManagementAnnual / 12,
    propertyInsuranceMonthly: values.propertyInsuranceAnnual / 12,
    otherCostsMonthly: values.otherCostsMonthly,
  });
  const taxEffectYearlyValue = taxEffectYearly(taxLineItems.taxableIncome, values.marginalTaxRate);
  const taxEffectMonthlyValue = taxEffectMonthly(taxEffectYearlyValue, 12);
  const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowAfterDebtMonthly, taxEffectMonthlyValue);

  const hasBaseData = values.name.trim() !== '' && purchasePrice > 0 && effectiveColdRentMonthly > 0;
  const hasFinancingData = hasBaseData && values.loanAmount > 0 && values.interestRate > 0 && values.amortizationRate > 0;
  const hasCostData =
    hasFinancingData &&
    (values.hoaFeeTotalMonthly > 0 || values.hoaFeeMaintenanceReserveMonthly > 0 || values.propertyManagementAnnual > 0);
  const hasTaxData = hasCostData && values.marginalTaxRate > 0 && values.buildingValue > 0;

  return {
    effectiveColdRentMonthly,
    effectiveInterestRate,
    effectivePurchasePriceUnit,
    effectiveVacancyRate,
    purchasePrice,
    closingCostsTotal,
    totalInvestment,
    loanAmount: values.loanAmount,
    equityUsed,
    monthlyMortgage,
    netOperatingIncomeYearly,
    cashflowAfterDebtMonthly,
    cashflowAfterTaxMonthly,
    mietmultiplikator: hasBaseData
      ? computeMietmultiplikator(purchasePrice, effectiveColdRentMonthly * 12, values.parkingRentMonthly * 12)
      : null,
    grossYield: hasBaseData ? computeGrossYield(effectiveColdRentMonthly * 12, values.parkingRentMonthly * 12, purchasePrice) : null,
    netYield: hasCostData ? computeNetYield(netOperatingIncomeYearly, totalInvestment) : null,
    cashOnCashReturn: hasCostData ? computeCashOnCashReturn(cashflowAfterDebtYearly, equityUsed) : null,
    dscrNOI: hasFinancingData ? computeDscrNOI(netOperatingIncomeYearly, debtServiceAnnual) : null,
    ltvRatio: hasFinancingData ? computeLtvRatio(values.loanAmount, totalInvestment) : null,
    breakEvenRentMonthly: hasFinancingData ? computeBreakEvenRentMonthly(operatingCostsNonRecoverableMonthly, monthlyMortgage) : null,
    hasBaseData,
    hasFinancingData,
    hasCostData,
    hasTaxData,
  };
}

export const SENSITIVITY_RANGES = {
  rent: (base: number) => [-base * 0.2, base * 0.2] as const,
  rate: [-0.02, 0.02] as const,
  price: (base: number) => [-base * 0.15, base * 0.15] as const,
  vacancy: [-0.1, 0.1] as const,
  maintenance: [-100, 100] as const,
};
