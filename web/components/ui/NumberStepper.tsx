'use client';

import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { formatNumber } from '@/lib/formatters';
import { FieldLabel } from './fieldStyles';

/** −/+ stepper for small numeric fields (Zimmer, Zinsbindung). Empty/NaN values start from `min` on the first click. */
export function NumberStepper<T extends FieldValues>({
  label,
  name,
  control,
  step = 1,
  min = 0,
  max,
  required = false,
  className,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  step?: number;
  min?: number;
  max?: number;
  required?: boolean;
  className?: string;
}) {
  const { field } = useController({ name, control });
  const current: number | null = typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : null;
  const fractionDigits = step < 1 ? 1 : 0;

  function change(direction: -1 | 1) {
    const base = current ?? min - (direction === 1 ? step : 0);
    let next = Math.round((base + direction * step) * 100) / 100;
    if (next < min) next = min;
    if (max !== undefined && next > max) next = max;
    field.onChange(next);
  }

  const buttonClass =
    'flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-accent/10 text-[22px] font-bold leading-none text-accent hover:bg-accent/20 disabled:opacity-40';

  return (
    <div className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} />
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => change(-1)} disabled={current !== null && current <= min} aria-label={`${label} verringern`} className={buttonClass}>
          −
        </button>
        <span className="min-w-10 text-center text-[15px] font-bold tabular-nums text-text-primary">
          {current === null ? '–' : formatNumber(current, fractionDigits)}
        </span>
        <button
          type="button"
          onClick={() => change(1)}
          disabled={max !== undefined && current !== null && current >= max}
          aria-label={`${label} erhöhen`}
          className={buttonClass}
        >
          +
        </button>
      </div>
    </div>
  );
}
