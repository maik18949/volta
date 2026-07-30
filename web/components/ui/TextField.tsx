'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';

export function TextField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  type = 'text',
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  type?: 'text' | 'date' | 'number';
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-secondary">
        {label}
        {required && ' *'}
      </span>
      <input
        type={type}
        className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary outline-none"
        onFocus={type === 'number' ? (e) => e.target.select() : undefined}
        {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
    </label>
  );
}
