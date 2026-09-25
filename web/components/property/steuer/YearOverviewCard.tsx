'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { YearPicker } from '@/components/ui/YearPicker';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { computeTaxCurrentYear, computeTaxForecastYear, type TaxCurrentYearResult } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import {
  initialYearFromParams,
  defaultForecastQuotePercent,
  effectiveForecastQuotePercent,
  MAX_FORECAST_YEARS_AHEAD,
} from '@/lib/prognoseJahrParam';
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
 * Der Zukunfts-Regler nutzt denselben nativen <input type="range"> wie die "Laufendes Jahr"-Karte
 * (QuoteSlider) und feuert damit ebenso bei JEDEM Tick eines Drags (~100x pro Geste), nicht nur
 * beim Loslassen — hier ist also, entgegen einer früheren Annahme, KEIN diskretes, niedrigfrequentes
 * Ereignis. Anzeige/Berechnung lesen deshalb den lokalen `liveForecastQuote`-State sofort, während
 * der URL-Commit (router.replace, siehe updateUrl) erst ~400ms nach der letzten Änderung nachgezogen
 * wird — sonst würde (Next.js' Router-Cache mit staleTime=0 für dynamische Routen) jeder Tick einen
 * Server-Component-Rerender inkl. Supabase-Refetch auslösen. Siehe SteuerTab.tsx für dasselbe Muster
 * beim "Laufendes Jahr"-Regler (liveCurrentYearQuote/committedCurrentYearQuoteRef/debounceTimeoutRef).
 * Der Jahreswechsel selbst (YearPicker) bleibt synchron: ein Klick ist tatsächlich ein einzelnes,
 * diskretes Ereignis und braucht kein Debouncing.
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

  const initialYear = initialYearFromParams(searchParams, currentYear);
  const [year, setYear] = useState(initialYear);
  const isFuture = year > currentYear;

  const forecastDefaultQuote = defaultForecastQuotePercent(overview.actualVacancyRate);
  const forecastQuote = effectiveForecastQuotePercent(searchParams, currentYear, year, forecastDefaultQuote);
  const [liveForecastQuote, setLiveForecastQuote] = useState(forecastQuote);
  // Zuletzt tatsächlich per updateUrl in die URL committeter Wert — Referenzpunkt für die
  // Debounce-Logik unten (analog committedCurrentYearQuoteRef in SteuerTab.tsx).
  const committedForecastQuoteRef = useRef(forecastQuote);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUrl = useCallback(
    (nextYear: number, nextQuote: number | null) => {
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
    },
    [searchParams, currentYear, forecastDefaultQuote, router]
  );

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    setLiveForecastQuote(forecastDefaultQuote);
    // Synchron committen (kein Debounce): ein Jahreswechsel ist ein einzelnes, diskretes
    // Ereignis, und der neue Wert (Standardannahme) muss den Debounce-Effekt unten nicht
    // erst noch verzögert nachziehen lassen — daher wird die Referenz direkt mitgezogen.
    committedForecastQuoteRef.current = forecastDefaultQuote;
    updateUrl(nextYear, null); // neues Jahr -> Standardannahme, kein Override übernehmen
  }

  function handleQuoteChange(nextQuote: number) {
    setLiveForecastQuote(nextQuote);
  }

  // Debounced URL-Commit für den Zukunfts-Regler — siehe Erklärung im Docstring oben und das
  // identische Muster in SteuerTab.tsx (liveCurrentYearQuote-Effekt).
  useEffect(() => {
    if (liveForecastQuote === committedForecastQuoteRef.current) {
      return undefined;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      committedForecastQuoteRef.current = liveForecastQuote;
      updateUrl(year, liveForecastQuote);
    }, 400);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [liveForecastQuote, year, updateUrl]);

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
        <YearPicker year={year} onChange={handleYearChange} minYear={minYear} maxYear={currentYear + MAX_FORECAST_YEARS_AHEAD} />
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
