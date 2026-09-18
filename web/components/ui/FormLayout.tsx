import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { SectionLabel } from './SectionLabel';

/** Blue hint banner at the top of a form section. */
export function FormHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[9px] border border-accent/[0.18] bg-accent/[0.07] px-3.5 py-2.5 text-[13px] font-medium text-section-label">
      {children}
    </p>
  );
}

/** Amber warning banner inside a form section. */
export function FormWarning({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[9px] border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] font-medium text-amber-800">{children}</p>
  );
}

/** White form card with an uppercase section title. */
export function FormCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={twMerge('rounded-[14px] border border-black/[0.07] bg-white px-6 py-[22px]', className)}>
      <SectionLabel className="mb-5">{title}</SectionLabel>
      {children}
    </section>
  );
}

/** Two-column field grid; give a field `sm:col-span-2` to span both columns. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={twMerge('grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2', className)}>{children}</div>;
}

/** Vertical stack of hint + cards that every form section uses. */
export function FormSection({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

export interface CalcSummaryRow {
  label: string;
  value: string;
}

/** Light-blue box with computed rows and an optional emphasized total row. */
export function CalcSummary({
  rows,
  total,
  className,
}: {
  rows: CalcSummaryRow[];
  total?: CalcSummaryRow & { valueClassName?: string };
  className?: string;
}) {
  return (
    <div className={twMerge('rounded-xl border border-accent/[0.15] bg-[#f8faff] px-5 py-[18px]', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 whitespace-nowrap py-1 text-[13px] tabular-nums text-text-secondary">
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
      {total && (
        <div className="mt-1.5 flex justify-between gap-3 whitespace-nowrap border-t border-accent/[0.15] pt-2.5 text-[15px] font-extrabold tabular-nums text-text-primary">
          <span>{total.label}</span>
          <span className={total.valueClassName}>{total.value}</span>
        </div>
      )}
    </div>
  );
}
