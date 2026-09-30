'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { FieldHint } from '@/components/ui/fieldStyles';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection } from '@/components/ui/FormLayout';
import { closingCostsTotal, totalInvestment as computeTotalInvestment } from '@/lib/calculations/kpiCalculator';
import { landTransferTaxRatePercent, suggestLandTransferTax } from '@/lib/data/landTransferTaxRates';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepKauf({ taxStartsManual = false }: { taxStartsManual?: boolean }) {
  const { register, control, setValue } = useFormContext<WizardFormValues>();
  const taxHintId = useId();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePriceUnit = safeNum(values.purchasePriceUnit);
  const purchasePriceParking = parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0;
  const purchasePrice = purchasePriceUnit + purchasePriceParking;

  const state = values.state ?? '';
  const landTransferTax = safeNum(values.landTransferTax);
  const suggestion = suggestLandTransferTax(state, purchasePrice);
  const rateText = `${String(landTransferTaxRatePercent(state) ?? '').replace('.', ',')} %`;

  // The wizard remounts this step on navigation, so derive the start mode from the values:
  // automatic only while the field is empty or still equals the suggestion. The edit form
  // always starts manual so a saved value is never overwritten.
  const [taxMode, setTaxMode] = useState<'auto' | 'manual'>(() =>
    taxStartsManual ? 'manual' : landTransferTax === 0 || landTransferTax === suggestion ? 'auto' : 'manual'
  );

  // Only writes in automatic mode; a user edit switches to manual first (onUserEdit).
  useEffect(() => {
    if (taxMode === 'auto' && suggestion !== null && suggestion !== landTransferTax) {
      setValue('landTransferTax', suggestion);
    }
  }, [taxMode, suggestion, landTransferTax, setValue]);

  let taxHint: ReactNode;
  if (suggestion === null) {
    taxHint = 'Bundesland wählen, dann erscheint ein Vorschlag.';
  } else if (taxMode === 'auto' || suggestion === landTransferTax) {
    taxHint = `${state} ${rateText} (Vorschlag)`;
  } else {
    taxHint = (
      <>
        {state} {rateText} wären {formatCurrency(suggestion)} ·{' '}
        <button type="button" className="font-semibold text-accent underline hover:no-underline" onClick={() => setTaxMode('auto')}>
          Zurücksetzen
        </button>
      </>
    );
  }
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
          <div>
            <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} onUserEdit={() => setTaxMode('manual')} />
            <FieldHint id={taxHintId}>{taxHint}</FieldHint>
          </div>
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
