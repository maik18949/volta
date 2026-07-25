import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';

const STATUS_LABELS: Record<PropertyStatus, string> = {
  vermietet: 'Vermietet',
  leerstand: 'Leerstand',
  mietgarantie: 'Mietgarantie',
};

const STATUS_STYLES: Record<PropertyStatus, string> = {
  vermietet: 'bg-emerald-100 text-emerald-800',
  leerstand: 'bg-amber-100 text-amber-800',
  mietgarantie: 'bg-purple-100 text-purple-800',
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
