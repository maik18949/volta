'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
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
  // der Wert über den ?leerstand=-Parameter mit (siehe PropertySidebar).
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
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  // A year picker lower bound of just the transfer year would hide a year where the loan
  // was already running (Kreditrate) but ownership hadn't transferred yet.
  const minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear());
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today, loanDisbursements);
  const hasParking = property.parking_type !== 'nicht_vorhanden';
  const steuerHref = `/properties/${property.id}/steuer${leerstandParam !== null ? `?leerstand=${encodeURIComponent(leerstandParam)}` : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Prognose / Monat</SectionLabel>
        <ForecastMonthCard result={forecast} hasParking={hasParking} quote={quote} steuerHref={steuerHref} />
      </Card>

      <Card>
        <div className="mb-3.5 flex items-center justify-between">
          <SectionLabel className="mb-0">Jahresübersicht</SectionLabel>
          <YearPicker year={year} onChange={setYear} minYear={minYear} maxYear={currentYear + 1} />
        </div>
        <CashflowYearTable result={yearTable} hasParking={hasParking} />
      </Card>
    </div>
  );
}
