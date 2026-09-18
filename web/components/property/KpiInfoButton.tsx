'use client';

import { useState } from 'react';
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
        title="Info"
        aria-label={`${info.name} — Info`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-text-dim text-[11px] font-bold leading-none text-text-dim hover:border-accent hover:text-accent"
      >
        i
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={info.name}>
        <div className="text-[13px] leading-[1.55] text-text-primary">
          <div className="mb-3.5 rounded-[10px] bg-[#f5f7fa] px-3.5 py-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-text-secondary">Formel</p>
            <p className="whitespace-pre-line font-mono text-[13px] leading-[1.5] text-text-secondary">{info.formula}</p>
            {calculation && (
              <div className="mt-2.5 border-t border-dashed border-black/[0.12] pt-2.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-accent">Berechnung</p>
                <p className="whitespace-pre-line font-mono text-[13px] font-semibold leading-[1.5] text-text-primary">{calculation}</p>
              </div>
            )}
          </div>

          <p className="mb-2">
            <strong>Wozu:</strong> {info.purpose}
          </p>
          <p className="mb-4">
            <strong>Wann gut:</strong> {info.goodWhen}
          </p>

          <KpiScale kpi={kpi} value={value} showAxis />

          {info.einordnung && (
            <div className="mt-4 border-t border-black/[0.07] pt-3">
              <p className="mb-1 text-[13px] font-bold text-text-primary">Einordnung</p>
              <p className="text-[13px] text-text-secondary">{info.einordnung}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
