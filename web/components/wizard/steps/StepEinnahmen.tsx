'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { grossYield } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepEinnahmen() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const coldRentMonthly = safeNum(values.coldRentMonthly);
  const parkingRentMonthly = parkingType !== 'nicht_vorhanden' ? safeNum(values.parkingRentMonthly) : 0;
  const purchasePrice =
    safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const coldRentYearly = coldRentMonthly * 12;
  const warmmieteYearly =
    typeof values.warmmieteMonthly === 'number' && !Number.isNaN(values.warmmieteMonthly)
      ? values.warmmieteMonthly * 12
      : null;
  const yieldValue = grossYield(coldRentYearly, parkingRentMonthly * 12, purchasePrice);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Prognose-Einnahmen bei Vollvermietung. Die Nettokaltmiete ist Pflicht — sie ist Basis aller Rendite-KPIs.
      </p>

      <CurrencyField label="Nettomiete/Monat" name="coldRentMonthly" register={register} required />
      <CurrencyField label="Bruttomiete/Monat" name="warmmieteMonthly" register={register} hint="Optional, vereinbarte Warmmiete inkl. NK" />
      {parkingType !== 'nicht_vorhanden' && (
        <CurrencyField label="Parkingmiete/Monat" name="parkingRentMonthly" register={register} />
      )}
      <CurrencyField label="Sonstige Einnahmen/Monat" name="otherIncomeMonthly" register={register} />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Nettomiete / Jahr</span>
          <span>{formatCurrency(coldRentYearly)}</span>
        </div>
        {warmmieteYearly !== null && (
          <div className="flex justify-between">
            <span>Bruttomiete / Jahr</span>
            <span>{formatCurrency(warmmieteYearly)}</span>
          </div>
        )}
      </div>

      {yieldValue !== null && <p className="text-sm font-semibold text-text-primary">Bruttorendite: {formatPercent(yieldValue)}</p>}
    </div>
  );
}
