'use client';

import type { UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';

/** Label + iOS-style switch bound to a boolean form field. */
export function Toggle<T extends FieldValues>({
  label,
  name,
  register,
  className,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  className?: string;
}) {
  return (
    <label className={twMerge('flex cursor-pointer items-center justify-between gap-3 py-2.5', className)}>
      <span className="text-[13px] font-medium text-text-primary">{label}</span>
      <input type="checkbox" className="peer sr-only" {...register(name)} />
      <span
        aria-hidden
        className="relative h-[26px] w-11 shrink-0 rounded-[13px] bg-slate-200 transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-[0_1px_4px_rgba(0,0,0,0.2)] after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-[18px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
      />
    </label>
  );
}
