'use client';

import { useState } from 'react';
import { useFormContext, useWatch, type Control } from 'react-hook-form';
import { PercentField } from '@/components/ui/PercentField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from '@/components/ui/fieldStyles';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection, type CalcSummaryRow } from '@/components/ui/FormLayout';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PropertyEditFormValues } from '@/lib/wizard/propertyEditLogic';

function safeNum(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepAnnahmen({ control }: { control: Control<PropertyEditFormValues> }) {
  const { register, setValue } = useFormContext<PropertyEditFormValues>();
  const values = useWatch({ control });
  const [marketValueMode, setMarketValueMode] = useState<'perSqm' | 'total'>('total');

  // Derived from live form state (not the initial `property` row) because all
  // Immobiliendaten sections share one form instance and the user can jump
  // between sections without saving — e.g. editing Wohnfläche in Objektdaten
  // must immediately affect the /m² <-> Gesamt conversion here.
  const livingAreaSqm = safeNum(values.livingAreaSqm);
  const coldRentMonthly = safeNum(values.coldRentMonthly);
  const marketRentPerSqm = safeNum(values.marketRentPerSqm);
  const rentDeviation =
    marketRentPerSqm > 0 && livingAreaSqm > 0 ? (coldRentMonthly / livingAreaSqm - marketRentPerSqm) / marketRentPerSqm : null;

  const currentMarketValue = values.currentMarketValue ?? null;
  const totalPurchasePrice = safeNum(values.purchasePriceUnit) + safeNum(values.purchasePriceParking);
  const valueGain = currentMarketValue !== null ? currentMarketValue - totalPurchasePrice : null;
  const valueGainPercent = valueGain !== null && totalPurchasePrice > 0 ? valueGain / totalPurchasePrice : null;
  const marketValuePerSqmDisplay =
    currentMarketValue !== null && livingAreaSqm > 0 ? Math.round((currentMarketValue / livingAreaSqm) * 100) / 100 : null;

  const rows: CalcSummaryRow[] = [];
  if (rentDeviation !== null) {
    rows.push({ label: 'Deine Miete vs. Markt', value: `${rentDeviation >= 0 ? '+' : ''}${formatPercent(rentDeviation)}` });
  }
  if (marketValuePerSqmDisplay !== null) {
    rows.push({ label: 'Marktwert / m²', value: formatCurrency(marketValuePerSqmDisplay) });
  }
  const total =
    valueGain !== null && valueGainPercent !== null
      ? {
          label: 'Wertsteigerung seit Kauf',
          value: `${valueGain >= 0 ? '+' : ''}${formatCurrency(valueGain)} (${formatPercent(valueGainPercent)})`,
          valueClassName: valueGain >= 0 ? 'text-positive' : 'text-negative',
        }
      : undefined;

  return (
    <FormSection>
      <FormHint>Werte, die keine Kaufdaten sind, aber KPI-Berechnungen und Vergleiche beeinflussen.</FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="Annahmen">
          <FormGrid>
            <PercentField label="Leerstandsquote" name="vacancyRateAssumption" control={control} hint="für NOI und Nettorendite" />
            <CurrencyField label="Marktmiete / m²" name="marketRentPerSqm" register={register} hint="informativ" />

            <div className="sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <FieldLabel label="Aktueller Marktwert" />
                <div className="mb-[5px] inline-flex rounded-md border border-black/10 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setMarketValueMode('perSqm')}
                    className={`rounded px-2 py-0.5 ${marketValueMode === 'perSqm' ? 'bg-accent text-white' : 'text-text-secondary'}`}
                  >
                    /m²
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketValueMode('total')}
                    className={`rounded px-2 py-0.5 ${marketValueMode === 'total' ? 'bg-accent text-white' : 'text-text-secondary'}`}
                  >
                    Gesamt
                  </button>
                </div>
              </div>
              {marketValueMode === 'total' ? (
                <SuffixedInputBox suffix="€">
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Aktueller Marktwert gesamt"
                    className={SUFFIXED_INPUT_CLASS}
                    onFocus={(e) => e.target.select()}
                    {...register('currentMarketValue', { valueAsNumber: true })}
                  />
                </SuffixedInputBox>
              ) : (
                <SuffixedInputBox suffix="€/m²">
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Marktwert pro m²"
                    value={marketValuePerSqmDisplay ?? ''}
                    disabled={livingAreaSqm <= 0}
                    onChange={(e) => {
                      if (livingAreaSqm <= 0) return; // can't convert per-m² to total without a living area
                      const perSqm = e.target.value === '' ? null : Number(e.target.value);
                      setValue('currentMarketValue', perSqm === null ? null : perSqm * livingAreaSqm, { shouldDirty: true });
                    }}
                    className={SUFFIXED_INPUT_CLASS}
                  />
                </SuffixedInputBox>
              )}
            </div>
          </FormGrid>
        </FormCard>

        {(rows.length > 0 || total) && <CalcSummary className="self-start" rows={rows} total={total} />}
      </div>
    </FormSection>
  );
}
