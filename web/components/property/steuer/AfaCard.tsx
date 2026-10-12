'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
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
      return `${percentLabel(model.linearRate)} der Basis`;
    default:
      return 'vor dem Erwerb';
  }
}

function KeyFigure({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] text-text-secondary">{label}</p>
      <p className="tabular-nums text-[15px] font-bold text-text-primary">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-dim">{sub}</p>
    </div>
  );
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

  function banner(): ReactNode {
    if (!sw) return null;
    const tone = `mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug ${BANNER_TONE[sw.state]}`;
    switch (sw.state) {
      case 'aktiv':
        return (
          <div className={tone}>
            <span>
              ✓ <b>Linear seit {sw.switchYear}</b> · der geplante Wechsel wurde automatisch übernommen.
            </span>
          </div>
        );
      case 'vorgemerkt':
        return (
          <div className={tone}>
            <span>
              <b>Wechsel vorgemerkt: ab {sw.switchYear}</b> (in {sw.switchYear! - model.year} Jahren) · wird dann automatisch übernommen.
            </span>
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
          <div className={tone}>
            <span>
              <b>Der Wechsel wäre seit {sw.optimalYear} sinnvoll.</b> Linear hätte dieses Jahr {formatCurrency(sw.lostAmountThisYear)} mehr
              AfA gebracht (≈ {formatCurrency(sw.lostAmountThisYear * property.marginal_tax_rate)} Steuer).
            </span>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(model.year)}>
              Ab {model.year} wechseln
            </button>
          </div>
        );
      case 'faellig':
        return (
          <div className={tone}>
            <span>
              <b>{model.year === sw.optimalYear ? 'Dieses Jahr' : 'Nächstes Jahr'} ist der optimale Wechselzeitpunkt.</b> Ab{' '}
              {sw.optimalYear} bringt die lineare AfA mehr als die degressive.
            </span>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Wechsel ab {sw.optimalYear} vormerken
            </button>
          </div>
        );
      default:
        return (
          <div className={tone}>
            <span>
              Wechsel zu linear empfohlen <b>ab {sw.optimalYear}</b> · in {sw.optimalYear - model.year} Jahren
            </span>
            <button type="button" className={LINK_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Jetzt vormerken
            </button>
          </div>
        );
    }
  }

  return (
    <Card className="py-[18px]">
      <SectionLabel>AfA</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3">
        <KeyFigure label={`AfA ${model.year}`} value={formatCurrency(model.amount)} sub={amountSubline(model)} />
        <KeyFigure
          label={`Steuerersparnis ${model.year}`}
          value={formatCurrency(model.taxSaving)}
          sub={`bei ${formatPercent(property.marginal_tax_rate)} Grenzsteuersatz`}
        />
        <KeyFigure label={`Restwert Ende ${model.year}`} value={formatCurrency(model.bookValueEnd)} sub={`von ${formatCurrency(model.basis)} Basis`} />
        <KeyFigure label="Methode" value={methodLabel(model)} sub={model.method === 'linear' ? '§ 7 Abs. 4 EStG' : '§ 7 Abs. 5a EStG'} />
      </div>

      {banner()}

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

      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-text-secondary">
        <span>
          AfA in 5 Jahren <b className="tabular-nums text-text-primary">{formatCurrency(model.outlook.amountIn5Years)}</b>
        </span>
        <span>
          in 10 Jahren <b className="tabular-nums text-text-primary">{formatCurrency(model.outlook.amountIn10Years)}</b>
        </span>
        <span>
          AfA endet <b className="tabular-nums text-text-primary">{model.outlook.endYear ?? '–'}</b>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3 border-t border-black/[0.07] pt-3.5">
        <Stat label="Grundstückswert" value={formatCurrency(property.land_value)} size="sm" />
        <Stat label="Gebäudewert" value={formatCurrency(property.building_value)} size="sm" />
        <Stat label="AfA-Bemessungsgrundlage" value={formatCurrency(model.basis)} size="sm" />
        <Stat label="Grenzsteuersatz" value={formatPercent(property.marginal_tax_rate)} size="sm" />
      </div>
    </Card>
  );
}
