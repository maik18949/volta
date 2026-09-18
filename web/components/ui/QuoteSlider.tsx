'use client';

import { useId } from 'react';
import { formatPercent } from '@/lib/formatters';

/** Compact inline Leerstandsquote slider: label · range · mono value · reset (only when moved off the default). */
export function QuoteSlider({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const isAtDefault = value === defaultValue;

  return (
    <div className="rounded-lg bg-[#f5f7fa] px-3 py-2">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="whitespace-nowrap text-[13px] text-text-secondary">
          {label}
        </label>
        <input
          id={id}
          type="range"
          role="slider"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-accent"
          aria-label={label}
        />
        <span className="min-w-11 text-right font-mono text-[13px] font-semibold text-accent">{formatPercent(value / 100)}</span>
        {!isAtDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            title="Zurücksetzen"
            aria-label={`Zurücksetzen (${formatPercent(defaultValue / 100)})`}
            className="text-[13px] text-text-dim hover:text-accent"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
