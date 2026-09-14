'use client';

import { formatPercent } from '@/lib/formatters';

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
  const isAtDefault = value === defaultValue;

  return (
    <div className="rounded-xl bg-blue-50/50 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-bold text-text-primary">{label}</label>
        <span className="font-mono text-lg font-extrabold text-accent">{formatPercent(value / 100)}</span>
      </div>
      <input
        type="range"
        role="slider"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
        aria-label={label}
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-text-dim">
        <span>0 % · Vollvermietung</span>
        {!isAtDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="font-semibold text-accent underline underline-offset-2"
          >
            ↺ Zurücksetzen ({formatPercent(defaultValue / 100)})
          </button>
        )}
        <span>100 % · Leerstand</span>
      </div>
    </div>
  );
}
