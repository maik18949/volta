import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PortfolioTotals } from '@/lib/data/properties';

function Tile({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.07)]">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-text-secondary">{label}</p>
      <p className={`text-[24px] font-extrabold leading-none tracking-[-0.5px] tabular-nums ${valueClassName ?? 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

/** Portfolio KPI banner: five tiles in one bordered strip (Volta Hauptscreen.dc.html). */
export function PortfolioCard({ totals }: { totals: PortfolioTotals }) {
  const cashflowColor = totals.cashflowMonthly >= 0 ? 'text-positive-strong' : 'text-negative';

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-black/[0.07] bg-white sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Tile label="Cashflow / Mon (n. Steuern)" value={formatCurrency(totals.cashflowMonthly)} valueClassName={cashflowColor} />
      <Tile label="Gesamtinvestment" value={formatCurrency(totals.totalInvestment)} />
      <Tile label="Ø Nettorendite" value={totals.averageNetYield !== null ? formatPercent(totals.averageNetYield) : '–'} />
      <Tile label="Restschuld" value={totals.remainingDebt > 0 ? formatCurrency(totals.remainingDebt) : '–'} />
      <Tile
        label="Marktwert (ges.)"
        value={totals.totalMarketValue !== null ? formatCurrency(totals.totalMarketValue) : '–'}
        valueClassName={totals.totalMarketValue !== null ? 'text-positive-strong' : undefined}
      />
    </div>
  );
}
