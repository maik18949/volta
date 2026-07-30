'use client';

import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

export function PercentField<T extends FieldValues>({
  label,
  name,
  control,
  required = false,
  hint,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  required?: boolean;
  hint?: string;
}) {
  const { field } = useController({ name, control });
  const displayValue = typeof field.value === 'number' ? field.value * 100 : '';

  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">
        {label}
        {required && ' *'}
      </span>
      <div className="mt-1 flex items-center rounded-md border border-black/10 bg-white/90 px-3">
        <input
          type="number"
          step="0.01"
          value={displayValue}
          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
          onBlur={field.onBlur}
          onFocus={(e) => e.target.select()}
          className="w-full bg-transparent py-2 text-sm text-text-primary outline-none"
        />
        <span className="text-sm text-text-dim">%</span>
      </div>
      {hint && <span className="mt-1 block text-xs text-text-dim">{hint}</span>}
    </label>
  );
}
