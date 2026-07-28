'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues, type SensitivityDeltas } from '@/lib/data/investmentCalculation';
import { updateInvestmentCalculation } from '@/lib/data/investmentCalculationActions';
import { InvestmentKPIPanel } from './InvestmentKPIPanel';
import { InvestmentInputSections } from './InvestmentInputSections';
import { InvestmentSensitivityPanel } from './InvestmentSensitivityPanel';
import { PromoteDialog } from './PromoteDialog';
import type { InvestmentCalculationRow } from '@/lib/data/investmentCalculations';

const AUTOSAVE_DEBOUNCE_MS = 600;

function toFormValues(row: InvestmentCalculationRow): InvestmentCalculatorValues {
  return {
    name: row.name,
    purchasePriceUnit: row.purchase_price_unit,
    purchasePriceParking: row.purchase_price_parking,
    landTransferTax: row.land_transfer_tax,
    notaryCosts: row.notary_costs,
    landRegistryCosts: row.land_registry_costs,
    agentFee: row.agent_fee,
    appraisalCosts: row.appraisal_costs,
    renovationModernizationCosts: row.renovation_modernization_costs,
    renovationAfaEligible: row.renovation_afa_eligible,
    coldRentMonthly: row.cold_rent_monthly,
    parkingRentMonthly: row.parking_rent_monthly,
    otherIncomeMonthly: row.other_income_monthly,
    vacancyRateAssumption: row.vacancy_rate_assumption,
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    amortizationRate: row.amortization_rate,
    monthlyMortgage: row.monthly_mortgage,
    loanStartDate: row.loan_start_date,
    hoaFeeTotalMonthly: row.hoa_fee_total_monthly,
    hoaFeeRecoverableMonthly: row.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: row.hoa_fee_maintenance_reserve_monthly,
    propertyManagementAnnual: row.property_management_annual,
    propertyInsuranceAnnual: row.property_insurance_annual,
    otherCostsMonthly: row.other_costs_monthly,
    buildingValue: row.building_value,
    depreciationRate: row.depreciation_rate,
    marginalTaxRate: row.marginal_tax_rate,
  };
}

function toPatch(values: InvestmentCalculatorValues) {
  return {
    name: values.name,
    purchase_price_unit: values.purchasePriceUnit,
    purchase_price_parking: values.purchasePriceParking,
    land_transfer_tax: values.landTransferTax,
    notary_costs: values.notaryCosts,
    land_registry_costs: values.landRegistryCosts,
    agent_fee: values.agentFee,
    appraisal_costs: values.appraisalCosts,
    renovation_modernization_costs: values.renovationModernizationCosts,
    renovation_afa_eligible: values.renovationAfaEligible,
    cold_rent_monthly: values.coldRentMonthly,
    parking_rent_monthly: values.parkingRentMonthly,
    other_income_monthly: values.otherIncomeMonthly,
    vacancy_rate_assumption: values.vacancyRateAssumption,
    loan_amount: values.loanAmount,
    interest_rate: values.interestRate,
    amortization_rate: values.amortizationRate,
    monthly_mortgage: values.monthlyMortgage,
    loan_start_date: values.loanStartDate,
    hoa_fee_total_monthly: values.hoaFeeTotalMonthly,
    hoa_fee_recoverable_monthly: values.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: values.hoaFeeMaintenanceReserveMonthly,
    property_management_annual: values.propertyManagementAnnual,
    property_insurance_annual: values.propertyInsuranceAnnual,
    other_costs_monthly: values.otherCostsMonthly,
    building_value: values.buildingValue,
    depreciation_rate: values.depreciationRate,
    marginal_tax_rate: values.marginalTaxRate,
  };
}

export function InvestmentCalculatorDetail({ calculation }: { calculation: InvestmentCalculationRow }) {
  const [sensitivity, setSensitivity] = useState<SensitivityDeltas>(ZERO_SENSITIVITY);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValuesRef = useRef<InvestmentCalculatorValues | null>(null);

  const { register, control, watch } = useForm<InvestmentCalculatorValues>({ defaultValues: toFormValues(calculation) });
  const values = watch();
  const kpis = computeInvestmentKPIs(values, sensitivity);

  useEffect(() => {
    const subscription = watch((formValues) => {
      // `formValues` is typed as a DeepPartial by react-hook-form's watch() signature, but in
      // practice it's never actually partial here: defaultValues (toFormValues) populates every
      // field synchronously on construction.
      latestValuesRef.current = formValues as InvestmentCalculatorValues;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setSaveState('saving');
        updateInvestmentCalculation(calculation.id, toPatch(formValues as InvestmentCalculatorValues))
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (latestValuesRef.current) {
          // Component is unmounting (e.g. user navigated away mid-debounce) — flush the
          // pending edit rather than silently dropping it. Fire-and-forget: there's no
          // component left to show saving/saved/error state to.
          updateInvestmentCalculation(calculation.id, toPatch(latestValuesRef.current)).catch(() => {
            // Best-effort flush on unmount; nothing left to report the error to.
          });
        }
      }
    };
  }, [watch, calculation.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text-primary">{values.name || 'Kaufkandidat'}</h1>
          {saveState === 'saving' && <span className="text-xs text-text-dim">Speichert…</span>}
          {saveState === 'saved' && <span className="text-xs text-positive">Gespeichert</span>}
          {saveState === 'error' && <span className="text-xs text-negative">Speichern fehlgeschlagen</span>}
        </div>
        {calculation.is_promoted ? (
          <span className="rounded-full bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">✓ übernommen</span>
        ) : (
          <PromoteDialog calculationId={calculation.id} calculationName={values.name} disabled={!kpis.hasBaseData} />
        )}
      </div>

      <InvestmentKPIPanel kpis={kpis} />

      <InvestmentInputSections register={register} control={control} />

      <InvestmentSensitivityPanel
        baseRent={values.coldRentMonthly}
        basePrice={values.purchasePriceUnit}
        sensitivity={sensitivity}
        onChange={setSensitivity}
        kpis={kpis}
      />
    </div>
  );
}
