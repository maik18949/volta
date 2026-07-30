import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { KpiChip } from '@/components/property/KpiChip';
import { KpiInfoButton } from '@/components/property/KpiInfoButton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import { benchmarkColor, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { PropertySummary } from '@/lib/data/propertySummary';

function KpiRow({
  kpi,
  label,
  rawValue,
  formattedValue,
}: {
  kpi: BenchmarkKpi;
  label: string;
  rawValue: number | null;
  formattedValue: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-text-primary">{formattedValue}</span>
        <KpiChip color={benchmarkColor(kpi, rawValue)} />
        <KpiInfoButton kpi={kpi} />
      </div>
    </div>
  );
}

export function ReturnsCard({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  return (
    <GlassCard>
      <SectionLabel>Rendite & Investment</SectionLabel>

      <KpiRow
        kpi="grossYield"
        label="Bruttorendite"
        rawValue={overview.grossYield}
        formattedValue={overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}
      />
      <KpiRow
        kpi="netYield"
        label="Nettorendite"
        rawValue={summary.netYield}
        formattedValue={summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
      />
      <KpiRow
        kpi="cashOnCash"
        label="Cash-on-Cash"
        rawValue={overview.cashOnCash}
        formattedValue={overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
      />
      <KpiRow
        kpi="eigenkapitalrendite"
        label="Eigenkapitalrendite"
        rawValue={overview.eigenkapitalrendite}
        formattedValue={overview.eigenkapitalrendite !== null ? formatPercent(overview.eigenkapitalrendite) : '–'}
      />
      <KpiRow
        kpi="kaufpreisfaktor"
        label="Kaufpreisfaktor"
        rawValue={overview.kaufpreisfaktor}
        formattedValue={overview.kaufpreisfaktor !== null ? `${formatNumber(overview.kaufpreisfaktor, 1)}×` : '–'}
      />
      <KpiRow
        kpi="dscr"
        label="DSCR (NOI)"
        rawValue={overview.dscr}
        formattedValue={overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}
      />
      <KpiRow kpi="ltv" label="LTV" rawValue={overview.ltv} formattedValue={overview.ltv !== null ? formatPercent(overview.ltv) : '–'} />
      <KpiRow
        kpi="actualVacancyRate"
        label="Tats. Leerstandsquote"
        rawValue={overview.actualVacancyRate}
        formattedValue={overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–'}
      />

      <div className="my-2 h-px bg-black/[0.06]" />

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Gesamtinvestment</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.totalInvestment)}</span>

        <span className="text-text-secondary">Eigenkapital</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.equityUsed)}</span>

        <span className="text-text-secondary">NOI / Jahr</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.netOperatingIncomeYearly)}</span>

        <span className="text-text-secondary">Break-Even-Miete</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.breakEvenRentMonthly)}</span>
      </div>

      {overview.valueGain !== null && overview.valueGainPercent !== null && (
        <>
          <div className="my-2 h-px bg-black/[0.06]" />
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">Aktueller Marktwert</span>
            <span className="text-right text-text-primary">{formatCurrency(overview.currentMarketValue ?? 0)}</span>

            <span className="text-text-secondary">Wertsteigerung</span>
            <span className={`text-right font-semibold ${overview.valueGain >= 0 ? 'text-positive' : 'text-negative'}`}>
              {overview.valueGain >= 0 ? '+' : ''}
              {formatCurrency(overview.valueGain)} ({formatPercent(overview.valueGainPercent)})
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}
