'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export function CurrencyField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  hint,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  hint?: string;
}) {
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
          className="w-full bg-transparent py-2 text-sm text-text-primary outline-none"
          {...register(name, { valueAsNumber: true })}
        />
        <span className="text-sm text-text-dim">€</span>
      </div>
      {hint && <span className="mt-1 block text-xs text-text-dim">{hint}</span>}
    </label>
  );
}
