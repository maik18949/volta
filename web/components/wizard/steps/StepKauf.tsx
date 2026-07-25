'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { closingCostsTotal, totalInvestment as computeTotalInvestment } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepKauf() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePriceUnit = safeNum(values.purchasePriceUnit);
  const purchasePriceParking = parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0;
  const purchasePrice = purchasePriceUnit + purchasePriceParking;
  const closingCosts = closingCostsTotal(
    safeNum(values.landTransferTax),
    safeNum(values.notaryCosts),
    safeNum(values.landRegistryCosts),
    safeNum(values.agentFee),
    safeNum(values.appraisalCosts)
  );
  const renovation = safeNum(values.renovationModernizationCosts);
  const total = computeTotalInvestment(purchasePrice, closingCosts, renovation);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Der wirtschaftliche Übergang bestimmt den AfA-Beginn — in der Regel das Datum des Besitzübergangs laut Kaufvertrag.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Kaufdatum" name="purchaseDate" register={register} type="date" />
        <TextField label="Wirtschaftlicher Übergang" name="economicTransferDate" register={register} type="date" required />
      </div>

      <CurrencyField label="Kaufpreis Wohnung" name="purchasePriceUnit" register={register} required />
      {parkingType !== 'nicht_vorhanden' && (
        <CurrencyField label="Kaufpreis Stellplatz" name="purchasePriceParking" register={register} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
        <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
        <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
        <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
        <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
        <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
      </div>
      <CurrencyField label="davon aktivierungspflichtig" name="renovationAfaEligible" register={register} />

      <div className="space-y-1 rounded-md bg-black/[0.03] p-3 text-sm">
        <div className="flex justify-between">
          <span>Kaufpreis</span>
          <span>{formatCurrency(purchasePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Kaufnebenkosten</span>
          <span>{formatCurrency(closingCosts)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Renovierung</span>
          <span>{formatCurrency(renovation)}</span>
        </div>
        <div className="flex justify-between border-t border-black/[0.08] pt-1 font-bold">
          <span>= Gesamtinvestment</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
