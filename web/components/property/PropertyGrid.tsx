'use client';

import { useState } from 'react';
import { ChevronDown, ListFilter } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import type { PropertyWithSummary } from '@/lib/data/properties';

type SortKey = 'datum' | 'name' | 'cashflow';

const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['datum', 'Datum'],
  ['name', 'Name'],
  ['cashflow', 'Cashflow'],
];

function sortItems(items: PropertyWithSummary[], key: SortKey): PropertyWithSummary[] {
  const sorted = [...items];
  switch (key) {
    case 'datum':
      // Newest acquisition first.
      return sorted.sort((a, b) => b.property.economic_transfer_date.localeCompare(a.property.economic_transfer_date));
    case 'name':
      return sorted.sort((a, b) => a.property.name.localeCompare(b.property.name, 'de'));
    case 'cashflow':
      return sorted.sort((a, b) => b.summary.cashflowAfterTaxMonthly - a.summary.cashflowAfterTaxMonthly);
  }
}

/** "Meine Immobilien" header with the sort control, plus the responsive card grid. */
export function PropertyGrid({ items }: { items: PropertyWithSummary[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('datum');

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-text-primary">Meine Immobilien</h2>
        <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.07] bg-white px-3 py-[7px] text-[13px] font-semibold text-text-secondary">
          <ListFilter size={13} />
          <span className="sr-only">Sortieren nach</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3" />
        </label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {sortItems(items, sortKey).map(({ property, summary, coverPhotoUrl }) => (
          <PropertyCard key={property.id} property={property} summary={summary} coverPhotoUrl={coverPhotoUrl} />
        ))}
      </div>
    </div>
  );
}
