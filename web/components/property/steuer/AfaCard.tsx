'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { buildAfaCardModel, type AfaCardModel } from '@/lib/data/propertyDepreciation';
import { setDegressiveSwitchYear } from '@/lib/data/propertyActions';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { SwitchState } from '@/lib/calculations/depreciationSchedule';
import type { Database } from '@/lib/supabase/types';
import { AfaSwitchPanel } from './AfaSwitchPanel';
import { AfaFactRow, AfaFacts, AfaOutlookTable } from './AfaParts';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const BANNER_TONE: Record<SwitchState, string> = {
  weit: 'border-slate-200 bg-slate-50 text-slate-600',
  faellig: 'border-amber-300 bg-amber-50 text-amber-900',
  ueberfaellig: 'border-amber-300 bg-amber-50 text-amber-900',
  vorgemerkt: 'border-blue-200 bg-blue-50 text-blue-900',
  aktiv: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

const PRIMARY_BUTTON = 'whitespace-nowrap rounded-[9px] bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white';
const LINK_BUTTON = 'text-[12px] font-semibold text-accent underline hover:no-underline';
const CAPTION = 'text-[11px] text-text-secondary';

function percentLabel(rate: number): string {
  return `${(rate * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;
}

function methodLabel(model: AfaCardModel): string {
  if (model.method === 'linear') return `Linear ${percentLabel(model.linearRate)}`;
  if (model.switch?.state === 'aktiv') return `Linear (seit ${model.switch.switchYear})`;
  return 'Degressiv 5 %';
}

export function AfaCard({ property, today }: { property: PropertyRow; today: Date }) {
  const model = buildAfaCardModel(property, today);
  const [panelYear, setPanelYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(year: number | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setDegressiveSwitchYear(property.id, year);
        setPanelYear(null);
      } catch {
        setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      }
    });
  }

  const sw = model.switch;
  const minYear = Math.max(model.year, model.acquisitionYear + 1);
  const maxYear = Math.max(sw?.optimalYear ?? minYear, minYear) + 6;
  const writtenOffShare = model.basis > 0 ? Math.min(Math.max(1 - model.bookValueEnd / model.basis, 0), 1) : 0;

  function switchBlock(): ReactNode {
    if (!sw) return null;
    const box = `mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-xl border px-4 py-3 ${BANNER_TONE[sw.state]}`;
    const title = <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.5px] opacity-70">Wechsel zu linear</p>;
    const text = 'text-[13px] leading-snug';
    switch (sw.state) {
      case 'aktiv':
        return (
          <div className={box}>
            <div>
              {title}
              <p className={text}>
                <b>Linear seit {sw.switchYear}</b> · der geplante Wechsel wurde automatisch übernommen.
              </p>
            </div>
          </div>
        );
      case 'vorgemerkt':
        return (
          <div className={box}>
            <div>
              {title}
              <p className={text}>
                <b>Vorgemerkt ab {sw.switchYear}</b> (in {sw.switchYear! - model.year} Jahren) · wird dann automatisch übernommen.
              </p>
            </div>
            <span className="flex gap-3">
              <button type="button" className={LINK_BUTTON} onClick={() => setPanelYear(sw.switchYear)}>
                Ändern
              </button>
              <button type="button" className={`${LINK_BUTTON} text-text-secondary`} disabled={pending} onClick={() => save(null)}>
                Zurücknehmen
              </button>
            </span>
          </div>
        );
      case 'ueberfaellig':
        return (
          <div className={box}>
            <div>
              {title}
              <p className={text}>
                <b>Der Wechsel wäre seit {sw.optimalYear} sinnvoll.</b> Linear hätte dieses Jahr {formatCurrency(sw.lostAmountThisYear)} mehr
                AfA gebracht (≈ {formatCurrency(sw.lostAmountThisYear * property.marginal_tax_rate)} Steuer).
              </p>
            </div>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(model.year)}>
              Ab {model.year} wechseln
            </button>
          </div>
        );
      case 'faellig':
        return (
          <div className={box}>
            <div>
              {title}
              <p className={text}>
                <b>{model.year === sw.optimalYear ? 'Dieses Jahr' : 'Nächstes Jahr'} ist der optimale Zeitpunkt.</b> Ab {sw.optimalYear} bringt die
                lineare AfA mehr als die degressive.
              </p>
            </div>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Wechsel ab {sw.optimalYear} vormerken
            </button>
          </div>
        );
      default:
        return (
          <div className={box}>
            <div>
              {title}
              <p className={text}>
                Empfohlen <b>ab {sw.optimalYear}</b> · in {sw.optimalYear - model.year} Jahren
              </p>
            </div>
            <button type="button" className={LINK_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Jetzt vormerken
            </button>
          </div>
        );
    }
  }

  const outlookRows = [
    { year: model.year + 5, label: 'in 5 Jahren', amount: model.outlook.amountIn5Years, bookValue: model.outlook.bookValueIn5Years },
    { year: model.year + 10, label: 'in 10 Jahren', amount: model.outlook.amountIn10Years, bookValue: model.outlook.bookValueIn10Years },
  ];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionLabel className="mb-0">AfA</SectionLabel>
        <span className="rounded-[5px] bg-slate-100 px-2 py-[3px] text-[11px] font-bold text-slate-700">{methodLabel(model)}</span>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <div>
          <p className={CAPTION}>AfA {model.year}</p>
          <p className="mt-0.5 text-[26px] font-extrabold leading-tight tabular-nums text-text-primary">{formatCurrency(model.amount)}</p>
          <p className="mt-1 text-[13px] font-semibold tabular-nums text-positive-strong">
            ≈ {formatCurrency(model.taxSaving)} Steuerersparnis
          </p>
        </div>

        <div>
          <p className={CAPTION}>Restwert Ende {model.year}</p>
          <p className="mt-0.5 text-[20px] font-bold leading-tight tabular-nums text-text-primary">{formatCurrency(model.bookValueEnd)}</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${writtenOffShare * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-text-dim">
            {formatPercent(writtenOffShare)} von {formatCurrency(model.basis)} abgeschrieben
          </p>
        </div>
      </div>

      {switchBlock()}

      {panelYear !== null && sw && (
        <AfaSwitchPanel
          key={panelYear}
          property={property}
          initialYear={Math.min(Math.max(panelYear, minYear), maxYear)}
          minYear={minYear}
          maxYear={maxYear}
          optimalYear={sw.optimalYear}
          pending={pending}
          onConfirm={save}
          onCancel={() => setPanelYear(null)}
        />
      )}
      {error && <p className="mt-2 text-[12px] font-medium text-negative">{error}</p>}

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-black/[0.07] pt-5 sm:grid-cols-[1.5fr_1fr]">
        <AfaOutlookTable rows={outlookRows} endYear={model.outlook.endYear} />
        <AfaFacts title="Grundlagen">
          <AfaFactRow label="Bemessungsgrundlage" value={formatCurrency(model.basis)} strong />
          <AfaFactRow label="Gebäudewert" value={formatCurrency(property.building_value)} />
          <AfaFactRow label="Grundstückswert" value={formatCurrency(property.land_value)} note="nicht abschreibbar" />
          <AfaFactRow label="Grenzsteuersatz" value={formatPercent(property.marginal_tax_rate)} />
        </AfaFacts>
      </div>
    </Card>
  );
}
