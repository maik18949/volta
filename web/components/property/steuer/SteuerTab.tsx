'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeTaxCurrentYear, computeTaxForecastYear, type TaxScenarioChoice } from '@/lib/data/propertyTax';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import { AfaBasisCard } from './AfaBasisCard';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function SteuerTab({
  property,
  statusEntries,
  extraordinaryCosts,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  today: Date;
}) {
  const currentYear = today.getUTCFullYear();
  const [scenario, setScenario] = useState<TaxScenarioChoice>('vollvermietung');
  const [year, setYear] = useState(currentYear + 1);

  const currentYearResult = computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today);
  const forecastResult = computeTaxForecastYear(property, year, scenario);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col">
          <CurrentYearSection result={currentYearResult} hasParking={hasParking} economicTransferDate={economicTransferDate} />
        </GlassCard>

        <GlassCard className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose</h2>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Prognose</span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <YearPicker year={year} onChange={setYear} minYear={currentYear + 1} />
            <SegmentedControl
              value={scenario}
              onChange={setScenario}
              options={[
                { value: 'vollvermietung', label: 'Vollvermietung' },
                { value: 'leerstand', label: 'Leerstand' },
              ]}
            />
          </div>
          <ForecastSection result={forecastResult} hasParking={hasParking} />
        </GlassCard>
      </div>

      <AfaBasisCard property={property} />
    </div>
  );
}
