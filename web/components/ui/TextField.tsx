'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FIELD_INPUT_CLASS, FieldLabel } from './fieldStyles';

export function TextField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  type = 'text',
  hint,
  className,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  type?: 'text' | 'date' | 'number';
  hint?: string;
  className?: string;
}) {
  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} hint={hint} />
      <input
        type={type}
        className={FIELD_INPUT_CLASS}
        onFocus={type === 'number' ? (e) => e.target.select() : undefined}
        {...register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
    </label>
  );
}
