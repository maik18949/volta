import type { ReactNode } from 'react';
import { KpiRatingPill, kpiTargetLabel } from '@/components/property/KpiRatingPill';
import { benchmarkColor, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

function Tile({ label, value, valueClassName, children }: { label: string; value: string; valueClassName?: string; children: ReactNode }) {
  return (
    <div className="bg-white px-[18px] py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.07)]">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-text-secondary">{label}</p>
      <p className={`text-[22px] font-extrabold leading-[1.1] tracking-[-0.5px] tabular-nums ${valueClassName ?? 'text-text-primary'}`}>{value}</p>
      {children}
    </div>
  );
}

function KpiTile({ kpi, label, value, formatted }: { kpi: BenchmarkKpi; label: string; value: number | null; formatted: string }) {
  const isRed = benchmarkColor(kpi, value) === 'red';
  return (
    <Tile label={label} value={formatted} valueClassName={isRed ? 'text-negative' : undefined}>
      <div className="mt-1.5 flex items-center gap-2 text-[13px] text-text-secondary">
        {kpiTargetLabel(kpi)}
        <KpiRatingPill kpi={kpi} value={value} />
      </div>
    </Tile>
  );
}

export function OverviewKpiBar({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  const cfColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-black/[0.07] bg-white sm:grid-cols-2 xl:grid-cols-4">
      <Tile label="CF nach Steuern" value={formatCurrency(summary.cashflowAfterTaxMonthly)} valueClassName={cfColor}>
        <p className="mt-1.5 text-[13px] text-text-secondary">
          vor Steuern <span className="font-semibold text-text-primary">{formatCurrency(summary.cashflowBeforeTaxMonthly)}</span>
        </p>
      </Tile>
      <KpiTile kpi="netYield" label="Nettorendite" value={summary.netYield} formatted={summary.netYield !== null ? formatPercent(summary.netYield) : '–'} />
      <KpiTile
        kpi="cashOnCash"
        label="Cash-on-Cash"
        value={overview.cashOnCash}
        formatted={overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
      />
      <KpiTile kpi="dscr" label="DSCR" value={overview.dscr} formatted={overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'} />
    </section>
  );
}
