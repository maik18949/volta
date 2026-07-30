'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { TextField } from '@/components/ui/TextField';
import { monthlyMortgageCalc } from '@/lib/calculations/amortizationCalculator';
import { equityUsed, ltvRatio, totalInvestment as computeTotalInvestment, closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepFinanzierung() {
  const { register, control, setValue, getFieldState } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const loanAmount = safeNum(values.loanAmount);
  const interestRate = safeNum(values.interestRate);
  const amortizationRate = safeNum(values.amortizationRate);
  const calculatedMortgage = monthlyMortgageCalc(loanAmount, interestRate, amortizationRate);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Die Monatsrate wird automatisch aus Darlehensbetrag, Zins- und Tilgungssatz berechnet — du kannst sie danach frei überschreiben.
      </p>

      <CurrencyField label="Darlehensbetrag" name="loanAmount" register={register} required />
      <div className="grid grid-cols-2 gap-3">
        <PercentField label="Zinssatz" name="interestRate" control={control} required />
        <PercentField label="Tilgungssatz" name="amortizationRate" control={control} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Zinsbindung (Jahre)" name="fixedInterestPeriodYears" register={register} type="number" />
        <TextField label="Darlehensbeginn" name="loanStartDate" register={register} type="date" />
      </div>
      <CurrencyField label="Monatsrate" name="monthlyMortgage" register={register} />

      <CurrencyField label="Eigenkapital eingebracht" name="equityContributed" register={register} />
      <CurrencyField
        label="Eigenprovisions-Vereinbarung"
        name="brokerCommissionAgreement"
        register={register}
        hint="Maklerkosten aus separater Vereinbarung — zählt wie eingebrachtes Eigenkapital für die Cash-on-Cash-Rendite"
      />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Berechnete Monatsrate</span>
          <span>{formatCurrency(calculatedMortgage)}</span>
        </div>
        <div className="flex justify-between">
          <span>Eigenkapital (genutzt)</span>
          <span>{formatCurrency(equity)}</span>
        </div>
        <div className="flex justify-between">
          <span>Anfangs-LTV</span>
          <span>{ltv !== null ? formatPercent(ltv) : '–'}</span>
        </div>
      </div>
    </div>
  );
}
