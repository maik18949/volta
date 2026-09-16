'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { YearPicker } from '@/components/ui/YearPicker';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import { AfaBasisCard } from './AfaBasisCard';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export function SteuerTab({
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const [forecastYear, setForecastYear] = useState(currentYear + 1);

  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  // "Laufendes Jahr"-Regler: Default = tatsächliche Leerstandsquote dieses Jahres,
  // Wert lebt im ?leerstand=-Query-Parameter, damit der Cashflow-Tab ihn mitlesen kann.
  const currentYearDefaultQuote =
    overview.actualVacancyRateYear !== null ? Math.round(overview.actualVacancyRateYear * 100) : 0;
  const leerstandParam = searchParams.get('leerstand');
  // Defensiv parsen: ein manuell editierter/geteilter Link (?leerstand=abc oder ?leerstand=9999)
  // darf niemals NaN oder einen Wert außerhalb [0, 100] in die Steuerberechnung einspeisen —
  // ungültige Werte fallen sauber auf den berechneten Default zurück.
  const parsedLeerstandParam = leerstandParam !== null ? Number(leerstandParam) : NaN;
  const currentYearQuote = Number.isFinite(parsedLeerstandParam)
    ? Math.min(100, Math.max(0, parsedLeerstandParam))
    : currentYearDefaultQuote;

  const setCurrentYearQuote = useCallback(
    (value: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === currentYearDefaultQuote) {
        params.delete('leerstand');
      } else {
        params.set('leerstand', String(value));
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    },
    [searchParams, currentYearDefaultQuote, router]
  );

  // Live, lokaler Wert für sofortiges visuelles/rechnerisches Feedback beim Ziehen des Reglers.
  // Ein natives <input type="range"> feuert onChange bei JEDEM Tick eines Drags (nicht nur beim
  // Loslassen) — bis zu ~100x pro Geste. Würde das direkt per router.replace() in die URL
  // geschrieben, würde das (mit Next.js' Router-Cache staleTime=0 für dynamische Routen) bei
  // jedem Tick einen Server-Component-Rerender inkl. Supabase-Refetch auslösen. Deshalb: die
  // Anzeige/Berechnung liest den lokalen State sofort, die URL wird erst debounced nachgezogen.
  const [liveCurrentYearQuote, setLiveCurrentYearQuote] = useState(currentYearQuote);
  const committedCurrentYearQuoteRef = useRef(currentYearQuote);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Von außen kommende Änderungen des URL-/Default-abgeleiteten Werts (Browser Vor/Zurück, ein
  // Link vom Cashflow-Tab mit eigenem ?leerstand=, o.ä.) synchronisieren den lokalen State neu.
  // Der Vergleich mit dem zuletzt selbst committeten Wert verhindert, dass unser eigenes
  // debounced router.replace() (das denselben Effekt über searchParams erneut anstößt) einen
  // laufenden, noch nicht committeten Drag überschreibt.
  useEffect(() => {
    if (currentYearQuote !== committedCurrentYearQuoteRef.current) {
      committedCurrentYearQuoteRef.current = currentYearQuote;
      setLiveCurrentYearQuote(currentYearQuote);
    }
  }, [currentYearQuote]);

  // Die URL (und damit ein möglicher Server-Refetch) erst ~400ms nach der letzten Änderung
  // nachziehen. Wiederholte Änderungen innerhalb des Fensters setzen den Timer immer wieder
  // zurück (Cleanup-Funktion), sodass am Ende nur EIN router.replace() ausgeführt wird.
  useEffect(() => {
    if (liveCurrentYearQuote === committedCurrentYearQuoteRef.current) {
      return undefined;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      committedCurrentYearQuoteRef.current = liveCurrentYearQuote;
      setCurrentYearQuote(liveCurrentYearQuote);
    }, 400);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [liveCurrentYearQuote, setCurrentYearQuote]);

  // Prognose-Regler (Zukunftsjahre): Default = Leerstandsquote seit Kauf (Lebenszeit-Schnitt),
  // rein lokaler State — kein anderer Tab braucht diesen Wert.
  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const [forecastQuote, setForecastQuote] = useState(forecastDefaultQuote);

  // Nur überschreiben, wenn der (live, lokale) Reglerwert vom berechneten Default abweicht —
  // unverändert (Default unangetastet) liefert dies bit-identisch das bisherige
  // computeTaxCurrentYear-Ergebnis, exakt wie Card 2 im Cashflow-Tab es erwartet
  // (spec-cashflow-tab.md). Die Berechnung nutzt bewusst den lokalen Live-Wert statt des
  // (debounced) URL-Werts, damit die Anzeige bei jedem Slider-Tick sofort aktualisiert wird.
  const currentYearResult = useMemo(
    () =>
      liveCurrentYearQuote !== currentYearDefaultQuote
        ? computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, liveCurrentYearQuote / 100, loanDisbursements)
        : computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, undefined, loanDisbursements),
    [property, statusEntries, extraordinaryCosts, today, liveCurrentYearQuote, currentYearDefaultQuote, loanDisbursements]
  );
  const forecastResult = computeTaxForecastYear(property, forecastYear, forecastQuote / 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col">
          <QuoteSlider
            label="Leerstandsquote (laufendes Jahr)"
            value={liveCurrentYearQuote}
            defaultValue={currentYearDefaultQuote}
            onChange={setLiveCurrentYearQuote}
          />
          <div className="mt-3">
            <CurrentYearSection result={currentYearResult} hasParking={hasParking} economicTransferDate={economicTransferDate} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose</h2>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Prognose</span>
          </div>
          <div className="mb-3">
            <YearPicker year={forecastYear} onChange={setForecastYear} minYear={currentYear + 1} />
          </div>
          <QuoteSlider
            label="Leerstandsquote (Prognose)"
            value={forecastQuote}
            defaultValue={forecastDefaultQuote}
            onChange={setForecastQuote}
          />
          <div className="mt-3">
            <ForecastSection result={forecastResult} hasParking={hasParking} />
          </div>
        </GlassCard>
      </div>

      <AfaBasisCard property={property} />
    </div>
  );
}
