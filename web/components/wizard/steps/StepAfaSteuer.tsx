'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { afaBasis, depreciationYearly, depreciationMonthly } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepAfaSteuer() {
  const { register, control } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const closingCosts = closingCostsTotal(
    safeNum(values.landTransferTax),
    safeNum(values.notaryCosts),
    safeNum(values.landRegistryCosts),
    safeNum(values.agentFee),
    safeNum(values.appraisalCosts)
  );
  const buildingValue = safeNum(values.buildingValue);
  const landValue = safeNum(values.landValue);
  const depreciationRate = safeNum(values.depreciationRate);

  const basis = afaBasis(buildingValue, closingCosts, purchasePrice, safeNum(values.renovationAfaEligible));
  const yearly = depreciationYearly(basis, depreciationRate);
  const monthly = depreciationMonthly(basis, depreciationRate);

  const sumDeviation = purchasePrice > 0 ? Math.abs(buildingValue + landValue - purchasePrice) / purchasePrice : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (Regierungs-Excel). Beide Werte sollten sich zum Kaufpreis
        addieren (Toleranz ±5%).
      </p>

      <CurrencyField label="Gebäudewert (aus Regierungs-Excel)" name="buildingValue" register={register} required />
      <CurrencyField label="Grundstückswert (aus Regierungs-Excel)" name="landValue" register={register} required />

      {sumDeviation > 0.05 && purchasePrice > 0 && (
        <p className="text-sm text-warning">
          ⚠ Gebäude + Grundstück ({formatCurrency(buildingValue + landValue)}) weicht {(sumDeviation * 100).toFixed(1)}% vom Kaufpreis
          ab — Werte aus dem Regierungs-Excel prüfen.
        </p>
      )}

      <PercentField label="AfA-Satz" name="depreciationRate" control={control} required />
      <p className="text-xs text-text-dim">Standard: 2,0% (ab 1925) · 2,5% (vor 1925) · 3,0% (Neubau ab 2023) · individuell per Gutachten</p>

      <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>AfA-Bemessungsgrundlage</span>
          <span>{formatCurrency(basis)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>AfA / Jahr</span>
          <span>{formatCurrency(yearly)}</span>
        </div>
        <div className="flex justify-between">
          <span>AfA / Monat</span>
          <span>{formatCurrency(monthly)}</span>
        </div>
      </div>
    </div>
  );
}
