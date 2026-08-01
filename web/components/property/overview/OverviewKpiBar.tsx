import { KpiScale, kpiValueColorClass } from '@/components/property/KpiScale';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

export function OverviewKpiBar({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  const cfColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-black/[0.06] shadow-sm sm:grid-cols-4">
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">CF nach Steuern</p>
        <p className={`text-[18px] font-extrabold ${cfColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
        <p className="text-[11px] text-text-dim">vor St.: {formatCurrency(summary.cashflowBeforeTaxMonthly)}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Nettorendite</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('netYield', summary.netYield)}`}>
          {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="netYield" value={summary.netYield} />
        </div>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Cash-on-Cash</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('cashOnCash', overview.cashOnCash)}`}>
          {overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="cashOnCash" value={overview.cashOnCash} />
        </div>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">DSCR</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('dscr', overview.dscr)}`}>
          {overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="dscr" value={overview.dscr} />
        </div>
      </div>
    </div>
  );
}
