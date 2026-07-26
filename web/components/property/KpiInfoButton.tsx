'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export function KpiInfoButton({ kpi }: { kpi: BenchmarkKpi }) {
  const [open, setOpen] = useState(false);
  const info = KPI_INFO[kpi];

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
      <Modal open={open} onClose={() => setOpen(false)} title={info.name}>
        <div className="space-y-3 text-sm">
          <p className="font-mono text-xs text-text-dim">{info.formula}</p>
          <p className="text-text-primary">{info.meaning}</p>
          <table className="w-full text-left text-xs">
            <tbody>
              {info.benchmarks.map((row) => (
                <tr key={row.label} className="border-t border-black/5">
                  <td className="py-1 text-text-secondary">{row.label}</td>
                  <td className="py-1 text-right text-text-primary">{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-text-dim">{info.context}</p>
        </div>
      </Modal>
    </>
  );
}
