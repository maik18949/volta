'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { ReadOnlyField } from '@/components/ui/ReadOnlyField';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from '@/components/ui/fieldStyles';
import { buildingSharePercent, clampPercent, valuesFromBuildingShare } from '@/lib/wizard/buildingShare';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

type Mode = 'eur' | 'pct';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

const SEGMENT_BASE = 'px-3 py-1 text-[12px] font-semibold';

/**
 * Gebäude-/Grundstückswert wahlweise in € (zwei Felder) oder als Gebäudeanteil in % (Grundstück = Rest).
 * Gespeichert wird immer in Euro (`buildingValue`/`landValue`); der Modus ist reiner UI-State.
 * Rendert in einem `FormGrid` (Fragment mit Switcher-Zeile + Feldern).
 */
export function BuildingShareFields({
  purchasePrice,
  buildingLabel,
  landLabel,
}: {
  purchasePrice: number;
  buildingLabel: ReactNode;
  landLabel: ReactNode;
}) {
  const { register, control, setValue, getValues } = useFormContext<WizardFormValues>();
  const buildingValue = safeNum(useWatch({ control, name: 'buildingValue' }));
  const landValue = safeNum(useWatch({ control, name: 'landValue' }));
  const [mode, setMode] = useState<Mode>('eur');
  const [percentText, setPercentText] = useState('');
  const previousPrice = useRef(purchasePrice);

  const applyPercent = useCallback(
    (text: string, price: number) => {
      const values = price > 0 ? valuesFromBuildingShare(text.trim() === '' ? 0 : Number(text), price) : { buildingValue: 0, landValue: 0 };
      setValue('buildingValue', values.buildingValue);
      setValue('landValue', values.landValue);
    },
    [setValue]
  );

  // In percent mode the share is the source of truth: a new purchase price recomputes the euro values.
  useEffect(() => {
    if (previousPrice.current === purchasePrice) return;
    previousPrice.current = purchasePrice;
    if (mode === 'pct') applyPercent(percentText, purchasePrice);
  }, [purchasePrice, mode, percentText, applyPercent]);

  function switchTo(next: Mode) {
    if (next === mode) return;
    if (next === 'pct') {
      const percent = buildingSharePercent(safeNum(getValues('buildingValue')), purchasePrice);
      setPercentText(percent === null ? '' : String(clampPercent(percent)));
    }
    setMode(next);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <span className="text-[13px] font-semibold text-text-secondary">Aufteilung Gebäude / Grundstück</span>
        <div role="group" aria-label="Eingabeart" className="inline-flex overflow-hidden rounded-[8px] border border-black/[0.12]">
          <button
            type="button"
            aria-pressed={mode === 'eur'}
            onClick={() => switchTo('eur')}
            className={`${SEGMENT_BASE} ${mode === 'eur' ? 'bg-accent text-white' : 'bg-white text-text-secondary hover:bg-black/[0.04]'}`}
          >
            €
          </button>
          <button
            type="button"
            aria-pressed={mode === 'pct'}
            onClick={() => switchTo('pct')}
            className={`${SEGMENT_BASE} ${mode === 'pct' ? 'bg-accent text-white' : 'bg-white text-text-secondary hover:bg-black/[0.04]'}`}
          >
            %
          </button>
        </div>
      </div>

      {mode === 'eur' ? (
        <>
          <CurrencyField label={buildingLabel} name="buildingValue" register={register} required />
          <CurrencyField label={landLabel} name="landValue" register={register} required />
        </>
      ) : (
        <>
          <label className="block">
            <FieldLabel label="Gebäudeanteil" required hint={`= ${formatCurrency(buildingValue)}`} />
            <SuffixedInputBox suffix="%">
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={percentText}
                onChange={(e) => {
                  setPercentText(e.target.value);
                  applyPercent(e.target.value, purchasePrice);
                }}
                onFocus={(e) => e.target.select()}
                className={SUFFIXED_INPUT_CLASS}
              />
            </SuffixedInputBox>
          </label>
          <ReadOnlyField label="Grundstückswert (Rest)" value={formatCurrency(landValue)} />
        </>
      )}
    </>
  );
}
