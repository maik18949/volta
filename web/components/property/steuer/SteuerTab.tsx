'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel className="mb-0">{`Laufendes Jahr ${currentYearResult.year}`}</SectionLabel>
            <span className="rounded-[5px] bg-slate-100 px-2 py-[3px] text-[11px] font-bold text-slate-700">Ist</span>
          </div>
          <div className="mb-3">
            <QuoteSlider
              label="Leerstandsquote"
              value={liveCurrentYearQuote}
              defaultValue={currentYearDefaultQuote}
              onChange={setLiveCurrentYearQuote}
            />
          </div>
          <CurrentYearSection result={currentYearResult} hasParking={hasParking} economicTransferDate={economicTransferDate} />
        </Card>

        <Card className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <SectionLabel className="mb-0">Prognose</SectionLabel>
              <span className="rounded-[5px] bg-accent/[0.12] px-2 py-[3px] text-[11px] font-bold text-section-label">Prognose</span>
            </div>
            <YearPicker year={forecastYear} onChange={setForecastYear} minYear={currentYear + 1} />
          </div>
          <div className="mb-3">
            <QuoteSlider label="Leerstandsquote" value={forecastQuote} defaultValue={forecastDefaultQuote} onChange={setForecastQuote} />
          </div>
          <ForecastSection result={forecastResult} hasParking={hasParking} />
        </Card>
      </div>

      <AfaBasisCard property={property} />
    </div>
  );
}
