import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DeletePropertyButton } from '@/components/property/DeletePropertyButton';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PropertyWithSummary } from '@/lib/data/properties';

export function PropertyCard({ property, summary }: PropertyWithSummary) {
  const cashflowColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';
  const transferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const sinceLabel = `${String(transferDate.getUTCMonth() + 1).padStart(2, '0')}/${String(transferDate.getUTCFullYear()).slice(2)}`;

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="h-[160px] bg-gradient-to-br from-slate-200 to-slate-300" />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/properties/${property.id}`} className="font-bold text-text-primary hover:underline">
            {property.name}
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={summary.currentStatus} />
            <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          {property.address}, {property.city}
        </p>

        <div className="my-2 h-px bg-black/[0.06]" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-text-secondary">Cashflow/Mon</p>
            <p className={`text-[15px] font-bold ${cashflowColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Nettorendite</p>
            <p className="text-[15px] font-bold text-text-primary">
              {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Kaufpreis/m²</p>
            <p className="text-[15px] font-bold text-text-primary">{formatCurrency(summary.purchasePricePerSqm)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary">Restschuld</p>
            <p className="text-[15px] font-bold text-text-primary">
              {summary.remainingDebtNow > 0 ? formatCurrency(summary.remainingDebtNow) : '–'}
            </p>
          </div>
        </div>

        <div className="my-2 h-px bg-black/[0.06]" />

        <p className="font-mono text-xs text-text-dim">
          {property.living_area_sqm} m² · {property.rooms ?? '–'} Zi · seit {sinceLabel}
        </p>
      </div>
    </GlassCard>
  );
}
