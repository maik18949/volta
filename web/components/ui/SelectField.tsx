'use client';

import type { UseFormRegister, FieldValues, Path, RegisterOptions } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FIELD_INPUT_CLASS, FieldLabel } from './fieldStyles';

export function SelectField<T extends FieldValues>({
  label,
  name,
  register,
  options,
  emptyOption,
  registerOptions,
  required = false,
  className,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  options: ReadonlyArray<readonly [string, string]>;
  /** Label for an empty "" option (registers as null via registerOptions.setValueAs, if given). */
  emptyOption?: string;
  registerOptions?: RegisterOptions<T, Path<T>>;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} />
      <select {...register(name, registerOptions)} className={FIELD_INPUT_CLASS}>
        {emptyOption !== undefined && <option value="">{emptyOption}</option>}
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
