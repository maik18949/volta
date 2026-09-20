'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { TextField } from '@/components/ui/TextField';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection } from '@/components/ui/FormLayout';
import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import {
  benchmarkColor,
  equityUsed,
  ltvRatio,
  totalInvestment as computeTotalInvestment,
  closingCostsTotal,
} from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

const LTV_COLOR = { green: 'text-positive', orange: 'text-warning', red: 'text-negative' } as const;

export function StepFinanzierung() {
  const { register, control, setValue, getFieldState } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const loanAmount = safeNum(values.loanAmount);
  const interestRate = safeNum(values.interestRate);
  const amortizationRate = safeNum(values.amortizationRate);
  const calculatedMortgage = monthlyMortgageCalc(loanAmount, interestRate, amortizationRate);
  const firstMonthInterest = (loanAmount * interestRate) / 12;

  // Auto-fill `monthlyMortgage` from the calculated value until the user has actually
  // touched (blurred) the field themselves. `isTouched` is set on blur regardless of the
  // value typed (including an explicit 0), and is NOT set by this effect's own
  // programmatic setValue() calls, so it can't be fooled by value coincidences.
  useEffect(() => {
    if (!getFieldState('monthlyMortgage').isTouched) {
      setValue('monthlyMortgage', Math.round(calculatedMortgage * 100) / 100);
    }
  }, [calculatedMortgage, getFieldState, setValue]);

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const closingCosts = closingCostsTotal(
    safeNum(values.landTransferTax),
    safeNum(values.notaryCosts),
    safeNum(values.landRegistryCosts),
    safeNum(values.agentFee),
    safeNum(values.appraisalCosts)
  );
  const total = computeTotalInvestment(purchasePrice, closingCosts, safeNum(values.renovationModernizationCosts));
  const theoreticalEquity = equityUsed(total, loanAmount);
  // Same resolution as computeOverviewMetrics: real contributed equity (eingebracht +
  // Eigenprovisions-Vereinbarung) once entered, else the theoretical totalInvestment-minus-loan
  // estimate — so this preview matches the saved property's Übersicht tab, not a different number.
  const totalEquityContributed = safeNum(values.equityContributed) + safeNum(values.brokerCommissionAgreement);
  const equity = totalEquityContributed > 0 ? totalEquityContributed : theoreticalEquity;
  const ltv = ltvRatio(loanAmount, total);
  const ltvColor = benchmarkColor('ltv', ltv);

  return (
    <FormSection>
      <FormHint>Die Monatsrate wird automatisch aus Darlehensbetrag, Zins- und Tilgungssatz berechnet — du kannst sie danach frei überschreiben.</FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="Darlehen">
          <FormGrid>
            <CurrencyField label="Darlehensbetrag" name="loanAmount" register={register} required className="sm:col-span-2" />
            <PercentField label="Zinssatz" name="interestRate" control={control} required />
            <PercentField label="Tilgungssatz" name="amortizationRate" control={control} required />
            <NumberStepper label="Zinsbindung (Jahre)" name="fixedInterestPeriodYears" control={control} min={1} max={40} />
            <TextField label="Darlehensbeginn" name="loanStartDate" register={register} type="date" />
            <CurrencyField label="Monatliche Rate" name="monthlyMortgage" register={register} className="sm:col-span-2" />
            <CurrencyField label="Eigenkapital eingebracht" name="equityContributed" register={register} className="sm:col-span-2" />
            <CurrencyField
              label="Eigenprovisions-Vereinbarung"
              name="brokerCommissionAgreement"
              register={register}
              className="sm:col-span-2"
            />
          </FormGrid>
        </FormCard>

        <CalcSummary
          className="self-start"
          rows={[
            { label: 'Berechnete Monatsrate', value: formatCurrency(calculatedMortgage) },
            { label: 'davon Zinsen', value: formatCurrency(firstMonthInterest) },
            { label: 'davon Tilgung', value: formatCurrency(calculatedMortgage - firstMonthInterest) },
            { label: 'Eigenkapital (genutzt)', value: formatCurrency(equity) },
          ]}
          total={{ label: 'Anfangs-LTV', value: ltv !== null ? formatPercent(ltv) : '–', valueClassName: ltvColor ? LTV_COLOR[ltvColor] : undefined }}
        />
      </div>
    </FormSection>
  );
}
