import Link from 'next/link';
import { Plus, Home as HomeIcon } from 'lucide-react';
import { getPropertiesWithSummaries, computePortfolioTotals } from '@/lib/data/properties';
import { PortfolioCard } from '@/components/property/PortfolioCard';
import { PropertyGrid } from '@/components/property/PropertyGrid';

export default async function PortfolioPage() {
  const items = await getPropertiesWithSummaries();
  const totals = computePortfolioTotals(items);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f0f4fa]">
      <div className="border-b border-black/[0.07] px-8 py-5">
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.5px] text-text-primary">Mein Portfolio</h1>
            <p className="mt-px text-[13px] text-text-secondary">
              {totals.count} {totals.count === 1 ? 'Immobilie' : 'Immobilien'}
            </p>
          </div>
          <Link
            href="/properties/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:bg-blue-600"
          >
            <Plus size={16} strokeWidth={2.5} /> Immobilie hinzufügen
          </Link>
        </div>
        <PortfolioCard totals={totals} />
      </div>

      <div className="flex-1 px-8 py-7">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-black/[0.07] bg-white p-12 text-center">
            <HomeIcon size={40} className="text-text-dim" />
            <p className="text-text-secondary">
              Noch keine Immobilie.
              <br />
              Füge deine erste Immobilie hinzu.
            </p>
            <Link href="/properties/new" className="rounded-[10px] bg-accent px-4 py-2 text-[14px] font-semibold text-white hover:bg-blue-600">
              + Immobilie hinzufügen
            </Link>
          </div>
        ) : (
          <PropertyGrid items={items} />
        )}
      </div>
    </div>
  );
}
