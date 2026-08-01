import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { KpiScale, kpiValueColorClass } from '@/components/property/KpiScale';
import { KpiInfoButton } from '@/components/property/KpiInfoButton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function KpiRow({
  kpi,
  label,
  rawValue,
  formattedValue,
  property,
  summary,
  overview,
}: {
  kpi: BenchmarkKpi;
  label: string;
  rawValue: number | null;
  formattedValue: string;
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${kpiValueColorClass(kpi, rawValue)}`}>{formattedValue}</span>
        <div className="w-[90px]">
          <KpiScale kpi={kpi} value={rawValue} />
        </div>
        <KpiInfoButton kpi={kpi} value={rawValue} property={property} summary={summary} overview={overview} />
      </div>
    </div>
  );
}

export function ReturnsCard({
  property,
  summary,
  overview,
}: {
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  return (
    <GlassCard variant="solid">
      <SectionLabel>Rendite & Investment</SectionLabel>

      <KpiRow
        kpi="grossYield"
        label="Bruttorendite"
        rawValue={overview.grossYield}
        formattedValue={overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="netYield"
        label="Nettorendite"
        rawValue={summary.netYield}
        formattedValue={summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="cashOnCash"
        label="Cash-on-Cash"
        rawValue={overview.cashOnCash}
        formattedValue={overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="eigenkapitalrendite"
        label="Eigenkapitalrendite"
        rawValue={overview.eigenkapitalrendite}
        formattedValue={overview.eigenkapitalrendite !== null ? formatPercent(overview.eigenkapitalrendite) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="kaufpreisfaktor"
        label="Kaufpreisfaktor"
        rawValue={overview.kaufpreisfaktor}
        formattedValue={overview.kaufpreisfaktor !== null ? `${formatNumber(overview.kaufpreisfaktor, 1)}×` : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="dscr"
        label="DSCR (NOI)"
        rawValue={overview.dscr}
        formattedValue={overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="ltv"
        label="LTV"
        rawValue={overview.ltv}
        formattedValue={overview.ltv !== null ? formatPercent(overview.ltv) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="actualVacancyRate"
        label="Tats. Leerstandsquote"
        rawValue={overview.actualVacancyRate}
        formattedValue={overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–'}
        property={property}
        summary={summary}
        overview={overview}
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
