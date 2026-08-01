'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KpiScale } from '@/components/property/KpiScale';
import { KPI_INFO } from '@/lib/kpiInfo';
import { kpiCalculationText } from '@/lib/kpiCalculationText';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function KpiInfoButton({
  kpi,
  value,
  property,
  summary,
  overview,
}: {
  kpi: BenchmarkKpi;
  value: number | null;
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  const [open, setOpen] = useState(false);
  const info = KPI_INFO[kpi];
  const calculation = kpiCalculationText(kpi, property, summary, overview);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${info.name} — Info`}
        className="text-text-dim hover:text-accent"
      >
        <Info size={13} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={info.name} overlay={false}>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-black/[0.03] p-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-dim">Formel</p>
            <p className="whitespace-pre-line font-mono text-[13px] text-text-secondary">{info.formula}</p>
            {calculation && (
              <div className="mt-2.5 border-t border-dashed border-black/10 pt-2.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-accent">Berechnung</p>
                <p className="whitespace-pre-line font-mono text-[13px] font-semibold text-text-primary">{calculation}</p>
              </div>
            )}
          </div>

          <p className="text-text-primary">
            <span className="font-semibold">Wozu:</span> {info.purpose}
          </p>
          <p className="text-text-primary">
            <span className="font-semibold">Wann gut:</span> {info.goodWhen}
          </p>

          <KpiScale kpi={kpi} value={value} showAxis />

          {info.einordnung && (
            <div className="border-t border-black/[0.06] pt-3">
              <p className="mb-1 text-sm font-bold text-text-primary">Einordnung</p>
              <p className="text-xs text-text-dim">{info.einordnung}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
