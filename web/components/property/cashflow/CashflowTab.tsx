'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeCashflowForecastMonth, computeCashflowYearTable } from '@/lib/data/propertyCashflow';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { ForecastMonthCard } from './ForecastMonthCard';
import { CashflowYearTable } from './CashflowYearTable';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export function CashflowTab({
  property,
  statusEntries,
  extraordinaryCosts,
  overview,
  today,
  loanDisbursements,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  overview: OverviewMetrics;
  today: Date;
  loanDisbursements: LoanDisbursementRow[];
}) {
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  // Gleicher Default wie der "Laufendes Jahr"-Regler im Steuer-Tab — kein eigener
  // Regler mehr hier, nur Anzeige. Bewegt der Nutzer den Regler im Steuer-Tab, kommt
  // der Wert über den ?leerstand=-Parameter mit (siehe PropertyTabNav).
  const defaultQuote = overview.actualVacancyRateYear !== null ? Math.round(overview.actualVacancyRateYear * 100) : 0;
  const leerstandParam = searchParams.get('leerstand');
  // Defensiv parsen: ein manuell editierter/geteilter Link (?leerstand=abc oder ?leerstand=9999)
  // darf niemals NaN oder einen Wert außerhalb [0, 100] in die Cashflow-Berechnung einspeisen —
  // ungültige Werte fallen sauber auf den berechneten Default zurück. Gleiches Muster wie in
  // SteuerTab.tsx.
  const parsedLeerstandParam = leerstandParam !== null ? Number(leerstandParam) : NaN;
  const quote = Number.isFinite(parsedLeerstandParam) ? Math.min(100, Math.max(0, parsedLeerstandParam)) : defaultQuote;

  const forecast = computeCashflowForecastMonth(
    property,
    statusEntries,
    extraordinaryCosts,
    quote / 100,
    defaultQuote / 100,
    today,
    loanDisbursements
  );
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const minYear = economicTransferDate.getUTCFullYear();
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today, loanDisbursements);
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose / Monat</h2>
        </div>
        <ForecastMonthCard result={forecast} hasParking={hasParking} quote={quote} propertyId={property.id} />
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
