import type { ReactNode } from 'react';

/** Shared input look for text/number/select/textarea fields (Volta Setup / Immobiliendaten design). */
export const FIELD_INPUT_CLASS =
  'w-full rounded-[9px] border border-black/[0.12] bg-white px-[13px] py-2.5 text-[13px] font-medium text-text-primary outline-none focus:border-accent disabled:opacity-50';

/** Field label: 13px semibold, red asterisk when required, optional dim inline hint. */
export function FieldLabel({ label, required, hint }: { label: ReactNode; required?: boolean; hint?: string }) {
  return (
    <span className="mb-[5px] block text-[13px] font-semibold text-text-secondary [overflow-wrap:anywhere]">
      {label}
      {required && <span className="text-negative"> *</span>}
      {hint && <span className="ml-1.5 text-[11px] font-normal text-text-dim">{hint}</span>}
    </span>
  );
}

/** Wraps an input with a suffix unit (€, %, €/m²) inside the same bordered box. */
export function SuffixedInputBox({ children, suffix }: { children: ReactNode; suffix: string }) {
  return (
    <div className="flex items-center rounded-[9px] border border-black/[0.12] bg-white pr-[13px] focus-within:border-accent">
      {children}
      <span className="text-[13px] text-text-dim">{suffix}</span>
    </div>
  );
}

export const SUFFIXED_INPUT_CLASS =
  'w-full bg-transparent px-[13px] py-2.5 text-[13px] font-medium text-text-primary outline-none disabled:opacity-50';
