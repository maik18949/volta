'use client';

import type { ReactNode } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from './fieldStyles';

export function PercentField<T extends FieldValues>({
  label,
  name,
  control,
  required = false,
  hint,
  info,
  className,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  required?: boolean;
  hint?: string;
  /** Info popover ("i") next to the label, for longer explanations than an inline hint. */
  info?: ReactNode;
  className?: string;
}) {
  const { field } = useController({ name, control });
  const displayValue = typeof field.value === 'number' ? Number((field.value * 100).toFixed(6)) : '';

  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} hint={hint} info={info} />
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
