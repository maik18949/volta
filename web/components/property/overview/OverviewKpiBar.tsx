import { KpiChip } from '@/components/property/KpiChip';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import { benchmarkColor } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

export function OverviewKpiBar({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  const cfColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="sticky top-0 z-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-black/[0.06] shadow-sm sm:grid-cols-4">
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">CF nach Steuern</p>
        <p className={`text-[18px] font-extrabold ${cfColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
        <p className="text-[11px] text-text-dim">vor St.: {formatCurrency(summary.cashflowBeforeTaxMonthly)}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Nettorendite</p>
        <p className="text-[18px] font-extrabold text-text-primary">
          {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        </p>
        <p className="text-[11px] text-text-dim">Brutto: {overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Cash-on-Cash</p>
        <p className="text-[18px] font-extrabold text-text-primary">
          {overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        </p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">DSCR</p>
        <div className="flex items-center gap-1.5">
          <p className="text-[18px] font-extrabold text-text-primary">{overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}</p>
          <KpiChip color={benchmarkColor('dscr', overview.dscr)} />
        </div>
      </div>
    </div>
  );
}
