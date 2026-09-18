import { twMerge } from 'tailwind-merge';
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  vermietet: 'Vermietet',
  leerstand: 'Leerstand',
  mietgarantie: 'Mietgarantie',
};

const STATUS_STYLES: Record<PropertyStatus, string> = {
  vermietet: 'bg-[rgba(21,128,61,0.12)] text-[#15803d]',
  leerstand: 'bg-[rgba(217,119,6,0.14)] text-[#b45309]',
  mietgarantie: 'bg-[#f3e8ff] text-[#6b21a8]',
};

export function StatusBadge({ status, size = 'md' }: { status: PropertyStatus; size?: 'sm' | 'md' }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center whitespace-nowrap font-bold',
        size === 'sm' ? 'rounded px-[5px] py-px text-[11px]' : 'rounded-md px-2.5 py-1 text-[11px]',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
