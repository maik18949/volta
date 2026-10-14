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

function amountSubline(model: AfaCardModel): string {
  switch (model.phase) {
    case 'degressiv':
      return '5 % vom Restwert';
    case 'linear_nach_wechsel':
      return 'Restwert ÷ Restnutzungsdauer';
    case 'linear':
      return `${percentLabel(model.linearRate)} der Bemessungsgrundlage`;
    default:
      return 'vor dem Erwerb';
  }
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

  const outlook: Array<{ label: string; value: string }> = [];
  if (Math.abs(model.outlook.amountIn5Years - model.amount) >= 0.5) {
    outlook.push({ label: `AfA ${model.year + 5}`, value: formatCurrency(model.outlook.amountIn5Years) });
  }
  if (Math.abs(model.outlook.amountIn10Years - model.amount) >= 0.5) {
    outlook.push({ label: `AfA ${model.year + 10}`, value: formatCurrency(model.outlook.amountIn10Years) });
  }
  outlook.push({ label: 'AfA endet', value: model.outlook.endYear !== null ? String(model.outlook.endYear) : 'offen' });

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
            ≈ {formatCurrency(model.taxSaving)} weniger Steuer
          </p>
          <p className="mt-0.5 text-[11px] text-text-dim">
            {amountSubline(model)} · bei {formatPercent(property.marginal_tax_rate)} Grenzsteuersatz
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

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-black/[0.07] pt-4">
        {outlook.map((item) => (
          <div key={item.label}>
            <p className={CAPTION}>{item.label}</p>
            <p className="text-[14px] font-bold tabular-nums text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-dim">
        Bemessungsgrundlage {formatCurrency(model.basis)} · Gebäudewert {formatCurrency(property.building_value)} · Grundstückswert{' '}
        {formatCurrency(property.land_value)}
      </p>
    </Card>
  );
}
