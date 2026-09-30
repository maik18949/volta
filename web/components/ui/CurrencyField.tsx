'use client';

import type { ReactNode } from 'react';
import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from './fieldStyles';

export function CurrencyField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  hint,
  className,
  onUserEdit,
}: {
  label: ReactNode;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  hint?: string;
  className?: string;
  /** Called when the user edits the field (not for programmatic setValue). */
  onUserEdit?: () => void;
}) {
  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} hint={hint} />
      <SuffixedInputBox suffix="€">
        <input
          type="number"
          step="0.01"
          className={SUFFIXED_INPUT_CLASS}
          onFocus={(e) => e.target.select()}
          {...register(name, { valueAsNumber: true, onChange: onUserEdit ? () => onUserEdit() : undefined })}
        />
      </SuffixedInputBox>
    </label>
  );
}
