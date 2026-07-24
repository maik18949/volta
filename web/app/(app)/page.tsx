import Link from 'next/link';
import { Plus, Home as HomeIcon } from 'lucide-react';
import { getPropertiesWithSummaries, computePortfolioTotals } from '@/lib/data/properties';
import { PortfolioCard } from '@/components/property/PortfolioCard';
import { PropertyCard } from '@/components/property/PropertyCard';

export default async function PortfolioPage() {
  const items = await getPropertiesWithSummaries();
  const totals = computePortfolioTotals(items);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Volta</h1>
        <Link
          href="/properties/new"
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Immobilie
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 p-12 text-center">
          <HomeIcon size={40} className="text-text-dim" />
          <p className="text-text-secondary">
            Noch keine Immobilie.
            <br />
            Füge deine erste Immobilie hinzu.
          </p>
          <Link href="/properties/new" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white">
            + Immobilie hinzufügen
          </Link>
        </div>
      ) : (
        <>
          <PortfolioCard totals={totals} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(({ property, summary }) => (
              <PropertyCard key={property.id} property={property} summary={summary} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
