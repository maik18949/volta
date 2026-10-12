'use client';

import { useState } from 'react';
import { buildSwitchPreview } from '@/lib/data/propertyDepreciation';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function AfaSwitchPanel({
  property,
  initialYear,
  minYear,
  maxYear,
  optimalYear,
  pending,
  onConfirm,
  onCancel,
}: {
  property: PropertyRow;
  initialYear: number;
  minYear: number;
  maxYear: number;
  optimalYear: number;
  pending: boolean;
  onConfirm: (year: number) => void;
  onCancel: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  const preview = buildSwitchPreview(property, year);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  return (
    <div className="mt-3 rounded-xl border border-black/[0.12] bg-white px-4 py-3.5">
      <p className="mb-2.5 text-[13px] font-bold text-text-primary">
        Wechsel zu linear vormerken ab{' '}
        <select
          aria-label="Wechseljahr"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="rounded-lg border border-black/[0.12] bg-white px-2 py-1 text-[13px] font-semibold"
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
              {option === optimalYear ? ' (empfohlen)' : ''}
            </option>
          ))}
        </select>
      </p>

      <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-[12px] tabular-nums">
        <span />
        <span className="text-[11px] text-text-dim">ohne Wechsel</span>
        <span className="text-[11px] text-text-dim">mit Wechsel</span>
        <span className="text-[11px] text-text-dim">Wirkung</span>
        {preview.rows.map((row) => (
          <PreviewRow key={row.year} year={row.year} without={row.withoutSwitch} withSwitch={row.withSwitch} taxEffect={row.taxEffect} />
        ))}
        <span className="text-text-secondary">AfA endet</span>
        <span>{preview.endYearWithout ?? 'nicht vollständig'}</span>
        <span>{preview.endYearWith ?? '–'}</span>
        <span />
      </div>

      <p className="my-3 text-[11.5px] leading-relaxed text-text-secondary">
        Volta übernimmt den Wechsel automatisch, sobald {year} erreicht ist. Bis dahin kannst du ihn ändern oder zurücknehmen.
        Hinweis: Steuerlich ist der Wechsel nicht umkehrbar, sobald du ihn in einer Steuererklärung angewendet hast.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onConfirm(year)}
          className="rounded-[9px] bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          Wechsel vormerken
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[9px] border border-black/[0.12] bg-white px-3.5 py-2 text-[12.5px] text-text-secondary"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function PreviewRow({ year, without, withSwitch, taxEffect }: { year: number; without: number; withSwitch: number; taxEffect: number }) {
  return (
    <>
      <span className="text-text-secondary">AfA {year}</span>
      <span>{formatCurrency(without)}</span>
      <span>{formatCurrency(withSwitch)}</span>
      <span className={taxEffect >= 0 ? 'font-bold text-positive-strong' : 'font-bold text-negative'}>
        {taxEffect >= 0 ? '+' : ''}
        {formatCurrency(taxEffect)} Steuer
      </span>
    </>
  );
}
