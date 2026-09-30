'use client';

import { useId, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { FieldHint } from '@/components/ui/fieldStyles';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection } from '@/components/ui/FormLayout';
import { closingCostsTotal, totalInvestment as computeTotalInvestment } from '@/lib/calculations/kpiCalculator';
import { landTransferTaxRatePercent, suggestLandTransferTax } from '@/lib/data/landTransferTaxRates';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { totalPurchasePrice, type WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepKauf() {
  const { register, control, setValue } = useFormContext<WizardFormValues>();
  const taxHintId = useId();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePrice = totalPurchasePrice({
    purchasePriceUnit: values.purchasePriceUnit ?? 0,
    purchasePriceParking: values.purchasePriceParking ?? 0,
    parkingType,
  });

  const state = values.state ?? '';
  const landTransferTax = safeNum(values.landTransferTax);
  const suggestion = suggestLandTransferTax(state, purchasePrice);
  const ratePercent = landTransferTaxRatePercent(state);
  const rateText = ratePercent === null ? '' : formatPercent(ratePercent / 100);

  // Kept in the form state (UI-only, never persisted) so it survives step navigation. Unknown counts as manual.
  const taxMode = useWatch({ control, name: 'landTransferTaxMode' }) ?? 'manual';

  let taxHint: ReactNode;
  let showReset = false;
  if (suggestion === null) {
    taxHint = 'Bundesland wählen, dann erscheint ein Vorschlag.';
  } else if (taxMode === 'auto' || suggestion === landTransferTax) {
    // A manual value that equals the suggestion shows the plain "(Vorschlag)" hint, without a reset button.
    taxHint = `${state} ${rateText} (Vorschlag)`;
  } else {
    showReset = true;
    taxHint = (
      <>
        {state} {rateText} wären {formatCurrency(suggestion)} <span aria-hidden="true">·</span>
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
            <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} onUserEdit={() => setValue('landTransferTaxMode', 'manual')} describedBy={taxHintId} />
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <FieldHint id={taxHintId}>{taxHint}</FieldHint>
              {showReset && (
                <button
                  type="button"
                  className="mt-1.5 text-[12px] font-semibold text-accent underline hover:no-underline"
                  onClick={() => setValue('landTransferTaxMode', 'auto')}
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
          <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
          <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
          <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
          <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
        </FormGrid>
        <div className="mt-4 border-t border-black/[0.06] pt-4">
          <FormGrid>
            <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
            <CurrencyField label="davon AfA-relevant" name="renovationAfaEligible" register={register} />
          </FormGrid>
        </div>
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
