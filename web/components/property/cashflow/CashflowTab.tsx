'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeCashflowForecastMonth, computeCashflowYearTable, type CashflowScenario } from '@/lib/data/propertyCashflow';
import { ForecastMonthCard } from './ForecastMonthCard';
import { CashflowYearTable } from './CashflowYearTable';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function CashflowTab({
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
  const [scenario, setScenario] = useState<CashflowScenario>('vollvermietung');
  const currentYear = today.getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  const forecast = computeCashflowForecastMonth(property, statusEntries, extraordinaryCosts, scenario, today);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const minYear = economicTransferDate.getUTCFullYear();
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today);
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose / Monat</h2>
          <SegmentedControl
            value={scenario}
            onChange={setScenario}
            options={[
              { value: 'vollvermietung', label: 'Vollvermietung' },
              { value: 'leerstand', label: 'Leerstand' },
            ]}
          />
        </div>
        <ForecastMonthCard result={forecast} hasParking={hasParking} />
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Jahresübersicht</h2>
          <YearPicker year={year} onChange={setYear} minYear={minYear} maxYear={currentYear + 1} />
        </div>
        <CashflowYearTable result={yearTable} hasParking={hasParking} />
      </GlassCard>
    </div>
  );
}
