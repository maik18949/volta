'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { YearPicker } from '@/components/ui/YearPicker';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { computeTaxCurrentYear, computeTaxForecastYear, type TaxCurrentYearResult } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

/**
 * Steuer-Tab "Jahresübersicht" — ersetzt die alte, zukunftsonly "Prognose"-Karte.
 * Vergangenheit + aktuelles Jahr: echte Ist-Werte über computeTaxCurrentYear(yearOverride).
 * Aktuelles Jahr speziell: identisches Ergebnis wie die "Laufendes Jahr"-Karte (übergeben via
 * `currentYearResult`, kein eigener Aufruf/Regler hier) — vermeidet zwei Regler für dieselbe Zahl.
 * Zukunft: computeTaxForecastYear mit einem eigenen, hier lokal + per URL geteilten Regler.
 */
export function YearOverviewCard({
  property,
  statusEntries,
  extraordinaryCosts,
  loanDisbursements,
  today,
  overview,
  currentYearResult,
  economicTransferDate,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  loanDisbursements: LoanDisbursementRow[];
  today: Date;
  overview: OverviewMetrics;
  currentYearResult: TaxCurrentYearResult;
  economicTransferDate: Date;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear());

  const prognoseJahrParam = searchParams.get('prognoseJahr');
  const initialYear =
    prognoseJahrParam !== null && Number(prognoseJahrParam) > currentYear && Number(prognoseJahrParam) <= currentYear + 1
      ? Number(prognoseJahrParam)
      : currentYear;
  const [year, setYear] = useState(initialYear);
  const isFuture = year > currentYear;

  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const prognoseQuoteParam = searchParams.get('prognoseQuote');
  const sharedQuote =
    isFuture && prognoseJahrParam !== null && Number(prognoseJahrParam) === year && prognoseQuoteParam !== null
      ? Number(prognoseQuoteParam)
      : NaN;
  const forecastQuote = Number.isFinite(sharedQuote) ? Math.min(100, Math.max(0, sharedQuote)) : forecastDefaultQuote;
  const [liveForecastQuote, setLiveForecastQuote] = useState(forecastQuote);

  function updateUrl(nextYear: number, nextQuote: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextYear > currentYear) {
      params.set('prognoseJahr', String(nextYear));
      if (nextQuote !== null && nextQuote !== forecastDefaultQuote) {
        params.set('prognoseQuote', String(nextQuote));
      } else {
        params.delete('prognoseQuote');
      }
    } else {
      params.delete('prognoseJahr');
      params.delete('prognoseQuote');
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    const nextDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
    setLiveForecastQuote(nextDefaultQuote);
    updateUrl(nextYear, null); // neues Jahr -> Standardannahme, kein Override übernehmen
  }

  function handleQuoteChange(nextQuote: number) {
    setLiveForecastQuote(nextQuote);
    updateUrl(year, nextQuote);
  }

  const pastOrCurrentResult = isFuture
    ? null
    : year === currentYear
      ? currentYearResult
      : computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, undefined, loanDisbursements, year);
  const forecastResult = isFuture ? computeTaxForecastYear(property, year, liveForecastQuote / 100) : null;

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <SectionLabel className="mb-0">Jahresübersicht</SectionLabel>
          {isFuture ? (
            <span className="rounded-[5px] bg-accent/[0.12] px-2 py-[3px] text-[11px] font-bold text-section-label">Prognose</span>
          ) : (
            <span className="rounded-[5px] bg-slate-100 px-2 py-[3px] text-[11px] font-bold text-slate-700">Ist</span>
          )}
        </div>
        <YearPicker year={year} onChange={handleYearChange} minYear={minYear} maxYear={currentYear + 1} />
      </div>
      {isFuture && (
        <div className="mb-3">
          <QuoteSlider label="Leerstandsquote" value={liveForecastQuote} defaultValue={forecastDefaultQuote} onChange={handleQuoteChange} />
        </div>
      )}
      {isFuture ? (
        <ForecastSection result={forecastResult!} hasParking={hasParking} />
      ) : (
        <CurrentYearSection result={pastOrCurrentResult!} hasParking={hasParking} economicTransferDate={economicTransferDate} />
      )}
    </div>
  );
}
