import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PortfolioTotals } from '@/lib/data/properties';

export function PortfolioCard({ totals }: { totals: PortfolioTotals }) {
  const cashflowColor = totals.cashflowMonthly >= 0 ? 'text-positive-strong' : 'text-negative';

  return (
    <GlassCard>
      <p className="text-[13px] font-semibold text-text-secondary">{totals.count} Immobilien</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-text-secondary">Cashflow/Mon</p>
          <p className={`text-[18px] font-extrabold ${cashflowColor}`}>{formatCurrency(totals.cashflowMonthly)}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Gesamtinvestment</p>
          <p className="text-[18px] font-extrabold text-text-primary">{formatCurrency(totals.totalInvestment)}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Ø Nettorendite</p>
          <p className="text-[18px] font-extrabold text-text-primary">
            {totals.averageNetYield !== null ? formatPercent(totals.averageNetYield) : '–'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Restschuld</p>
          <p className="text-[18px] font-extrabold text-text-primary">
            {totals.remainingDebt > 0 ? formatCurrency(totals.remainingDebt) : '–'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
