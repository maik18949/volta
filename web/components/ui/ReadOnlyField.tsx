import { twMerge } from 'tailwind-merge';
import { FieldLabel } from './fieldStyles';

/** Computed, non-editable value styled like an input (e.g. "davon nicht umlagefähig"). */
export function ReadOnlyField({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={twMerge('block', className)}>
      <FieldLabel label={label} hint={hint} />
      <input
        readOnly
        value={value}
        aria-label={label}
        className="w-full cursor-default rounded-[9px] border border-black/[0.12] bg-[#f8faff] px-[13px] py-2.5 text-[13px] font-medium text-text-secondary outline-none"
      />
    </div>
  );
}
