import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Label-over-value stat used in the detail cards' auto-fit grids.
 * `sm` = 13px semibold value (Objekt card), `md` = 15px bold (Finanzierung, AfA-Basis),
 * `lg` = 15px extrabold (Investment block in Rendite & Investment).
 */
export function Stat({
  label,
  value,
  size = 'md',
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  valueClassName?: string;
}) {
  const valueSize = size === 'sm' ? 'text-[13px] font-semibold' : size === 'md' ? 'text-[15px] font-bold' : 'text-[15px] font-extrabold';
  return (
    <div>
      <p className="mb-0.5 text-[11px] text-text-secondary">{label}</p>
      <p className={twMerge('tabular-nums text-text-primary', valueSize, valueClassName)}>{value}</p>
    </div>
  );
}
