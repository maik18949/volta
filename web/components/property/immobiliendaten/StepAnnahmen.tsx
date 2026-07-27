'use client';

import { useState } from 'react';
import { useFormContext, useWatch, type Control } from 'react-hook-form';
import { PercentField } from '@/components/ui/PercentField';
import { CurrencyField } from '@/components/ui/CurrencyField';
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Werte, die keine Kaufdaten sind, aber KPI-Berechnungen und Vergleiche beeinflussen.
      </p>

      <PercentField label="Leerstandsquote" name="vacancyRateAssumption" control={control} hint="z.B. 3% — für NOI, Nettorendite" />

      <CurrencyField
        label="Marktmiete/m²"
        name="marketRentPerSqm"
        register={register}
        hint="informativ — Vergleich mit eigener Kaltmiete"
      />
      {rentDeviation !== null && (
        <p className="text-xs text-text-dim">
          Deine Miete liegt {formatPercent(Math.abs(rentDeviation))} {rentDeviation >= 0 ? 'über' : 'unter'} Markt
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-medium text-text-secondary">Aktueller Marktwert</span>
          <div className="inline-flex rounded-md border border-black/10 p-0.5 text-xs">
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
          <CurrencyField label="Gesamt" name="currentMarketValue" register={register} />
        ) : (
          <label className="block">
            <span className="sr-only">Marktwert pro m²</span>
            <div className="mt-1 flex items-center rounded-md border border-black/10 bg-white/90 px-3">
              <input
                type="number"
                step="0.01"
                value={marketValuePerSqmDisplay ?? ''}
                disabled={livingAreaSqm <= 0}
                onChange={(e) => {
                  if (livingAreaSqm <= 0) return; // can't convert per-m² to total without a living area
                  const perSqm = e.target.value === '' ? null : Number(e.target.value);
                  setValue('currentMarketValue', perSqm === null ? null : perSqm * livingAreaSqm, { shouldDirty: true });
                }}
                className="w-full bg-transparent py-2 text-sm text-text-primary outline-none disabled:opacity-50"
              />
              <span className="text-sm text-text-dim">€/m²</span>
            </div>
          </label>
        )}
        {valueGain !== null && valueGainPercent !== null && (
          <p className="mt-1 text-xs text-text-dim">
            Wertsteigerung: {formatCurrency(valueGain)} ({formatPercent(valueGainPercent)}) seit Kauf
          </p>
        )}
      </div>
    </div>
  );
}
