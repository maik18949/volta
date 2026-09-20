import Link from 'next/link';
import { DeletePropertyButton } from '@/components/property/DeletePropertyButton';
import { PropertyThumbnail } from '@/components/property/PropertyThumbnail';
import { STATUS_LABELS } from '@/components/ui/StatusBadge';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import type { PropertyWithSummary } from '@/lib/data/properties';

/** Solid badge variant used over the card photo (design: green / amber / purple on white text). */
const PHOTO_BADGE_STYLES: Record<PropertyStatus, string> = {
  vermietet: 'bg-positive-strong',
  leerstand: 'bg-warning',
  mietgarantie: 'bg-purple-600',
};

export function PropertyCard({ property, summary, coverPhotoUrl }: PropertyWithSummary) {
  const cashflowColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive-strong' : 'text-negative';
  const transferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const sinceLabel = `${String(transferDate.getUTCMonth() + 1).padStart(2, '0')}/${transferDate.getUTCFullYear()}`;
  const href = `/properties/${property.id}`;

  return (
    <article className="group relative overflow-hidden rounded-[14px] border border-black/[0.07] bg-white transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)]">
      {/* Stretched link: the whole card navigates, while the delete button below sits above it. */}
      <Link href={href} aria-label={property.name} className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" />

      <div className="relative">
        <PropertyThumbnail coverPhotoUrl={coverPhotoUrl} propertyType={property.property_type} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/45" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-4 py-3">
          <span className="truncate text-xs font-medium text-white/90">
            {property.address} · {property.city}
          </span>
          <span className={`shrink-0 rounded-[5px] px-2 py-[3px] text-[10px] font-bold text-white ${PHOTO_BADGE_STYLES[summary.currentStatus]}`}>
            {STATUS_LABELS[summary.currentStatus]}
          </span>
        </div>
        <div className="absolute right-2.5 top-2.5 z-[2] rounded-full bg-black/45 p-1.5 text-white opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [&_button]:text-white [&_button:hover]:text-red-300">
          <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
        </div>
      </div>

      <div className="px-[18px] pb-[18px] pt-4">
        <p className="mb-0.5 text-[16px] font-bold text-text-primary">{property.name}</p>
        <p className="mb-3.5 text-xs text-text-secondary">
          {property.living_area_sqm.toLocaleString('de-DE')} m² · {property.rooms ?? '–'} Zi · seit {sinceLabel}
        </p>
        <div className="mb-3 h-px bg-black/[0.07]" />
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
          <div>
            <p className="mb-0.5 text-[11px] text-text-secondary">Cashflow / Mon (n. St.)</p>
            <p className={`text-[15px] font-bold tabular-nums ${cashflowColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[11px] text-text-secondary">Nettorendite</p>
            <p className="text-[15px] font-bold tabular-nums text-text-primary">{summary.netYield !== null ? formatPercent(summary.netYield) : '–'}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[11px] text-text-secondary">Kaufpreis / m²</p>
            <p className="text-[13px] font-semibold tabular-nums text-text-primary">{formatCurrency(summary.purchasePricePerSqm)}/m²</p>
          </div>
          <div>
            <p className="mb-0.5 text-[11px] text-text-secondary">Restschuld</p>
            <p className="text-[13px] font-semibold tabular-nums text-text-primary">
              {summary.remainingDebtNow > 0 ? formatCurrency(summary.remainingDebtNow) : '–'}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
