import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent, formatMultiplier, formatNumber } from '@/lib/formatters';
import type { InvestmentKPIs } from '@/lib/data/investmentCalculation';

function valueColor(value: number): string {
  return value >= 0 ? 'text-positive' : 'text-negative';
}

function Kpi({ label, value, unlocked, valueClassName = 'text-text-primary' }: { label: string; value: string; unlocked: boolean; valueClassName?: string }) {
  return (
    <div className="relative px-4 py-3">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p className={`text-[15px] font-bold ${unlocked ? valueClassName : 'text-text-dim/50'}`}>{unlocked ? value : '–'}</p>
      {!unlocked && <span className="absolute right-2 top-2 text-[9px] text-text-dim/50">🔒</span>}
    </div>
  );
}

export function InvestmentKPIPanel({ kpis }: { kpis: InvestmentKPIs }) {
  return (
    <GlassCard className="p-0 divide-y divide-black/[0.06]">
      <div className="grid grid-cols-4 divide-x divide-black/[0.06]">
        <Kpi label="Kaufpreisfaktor" value={kpis.mietmultiplikator !== null ? formatMultiplier(kpis.mietmultiplikator) : '–'} unlocked={kpis.hasBaseData} />
        <Kpi label="Bruttorendite" value={kpis.grossYield !== null ? formatPercent(kpis.grossYield) : '–'} unlocked={kpis.hasBaseData} />
        <Kpi
          label="Cashflow/Mon"
          value={formatCurrency(kpis.cashflowAfterDebtMonthly)}
          unlocked={kpis.hasFinancingData}
          valueClassName={valueColor(kpis.cashflowAfterDebtMonthly)}
        />
        <Kpi label="Nettorendite" value={kpis.netYield !== null ? formatPercent(kpis.netYield) : '–'} unlocked={kpis.hasCostData} />
      </div>
      <div className="grid grid-cols-4 divide-x divide-black/[0.06]">
        <Kpi label="Cash-on-Cash" value={kpis.cashOnCashReturn !== null ? formatPercent(kpis.cashOnCashReturn) : '–'} unlocked={kpis.hasCostData} />
        <Kpi
          label="Break-Even-Miete"
          value={kpis.breakEvenRentMonthly !== null ? formatCurrency(kpis.breakEvenRentMonthly) : '–'}
          unlocked={kpis.hasFinancingData}
        />
        <Kpi label="DSCR" value={kpis.dscrNOI !== null ? formatNumber(kpis.dscrNOI, 2) : '–'} unlocked={kpis.hasFinancingData} />
        <Kpi label="LTV" value={kpis.ltvRatio !== null ? formatPercent(kpis.ltvRatio) : '–'} unlocked={kpis.hasFinancingData} />
      </div>
      {kpis.hasTaxData && (
        <div className="px-4 py-2 text-sm">
          <span className="text-text-secondary">Nach Steuer: </span>
          <span className={`font-semibold ${valueColor(kpis.cashflowAfterTaxMonthly)}`}>{formatCurrency(kpis.cashflowAfterTaxMonthly)}/Mon</span>
        </div>
      )}
    </GlassCard>
  );
}
