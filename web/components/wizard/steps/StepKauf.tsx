'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection } from '@/components/ui/FormLayout';
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
    <FormSection>
      <FormHint>Der wirtschaftliche Übergang bestimmt den AfA-Beginn — in der Regel das Datum des Besitzübergangs laut Kaufvertrag.</FormHint>

      <FormCard title="Kaufdaten">
        <FormGrid>
          <TextField label="Kaufdatum" name="purchaseDate" register={register} type="date" />
          <TextField label="Wirtschaftlicher Übergang" name="economicTransferDate" register={register} type="date" required />
          <CurrencyField label="Kaufpreis Wohnung" name="purchasePriceUnit" register={register} required />
          {parkingType !== 'nicht_vorhanden' && <CurrencyField label="Kaufpreis Stellplatz" name="purchasePriceParking" register={register} />}
        </FormGrid>
      </FormCard>

      <FormCard title="Kaufnebenkosten">
        <FormGrid>
          <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
          <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
          <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
          <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
          <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
          <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
          <CurrencyField label="davon aktivierungspflichtig" name="renovationAfaEligible" register={register} />
        </FormGrid>
      </FormCard>

      <CalcSummary
        rows={[
          { label: 'Kaufpreis', value: formatCurrency(purchasePrice) },
          { label: '+ Kaufnebenkosten', value: formatCurrency(closingCosts) },
          { label: '+ Renovierung', value: formatCurrency(renovation) },
        ]}
        total={{ label: '= Gesamtinvestment', value: formatCurrency(total) }}
      />
    </FormSection>
  );
}
