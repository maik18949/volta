'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FIELD_INPUT_CLASS, FieldLabel } from './fieldStyles';

export function TextAreaField<T extends FieldValues>({
  label,
  name,
  register,
  rows = 3,
  className,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} />
      <textarea {...register(name)} rows={rows} className={twMerge(FIELD_INPUT_CLASS, 'min-h-20 resize-y')} />
    </label>
  );
}
