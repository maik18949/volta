'use client';

import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from './fieldStyles';

export function PercentField<T extends FieldValues>({
  label,
  name,
  control,
  required = false,
  hint,
  className,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  const { field } = useController({ name, control });
  const displayValue = typeof field.value === 'number' ? field.value * 100 : '';

  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} hint={hint} />
      <SuffixedInputBox suffix="%">
        <input
          type="number"
          step="0.01"
          value={displayValue}
          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
          onBlur={field.onBlur}
          onFocus={(e) => e.target.select()}
          className={SUFFIXED_INPUT_CLASS}
        />
      </SuffixedInputBox>
    </label>
  );
}
