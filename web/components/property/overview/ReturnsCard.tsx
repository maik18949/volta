import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
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
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] py-[7px]">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
        {label}
        <KpiInfoButton kpi={kpi} value={rawValue} property={property} summary={summary} overview={overview} />
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        <span className={`whitespace-nowrap text-[13px] font-bold tabular-nums ${kpiValueColorClass(kpi, rawValue)}`}>{formattedValue}</span>
        <div className="w-[90px]">
          <KpiScale kpi={kpi} value={rawValue} />
        </div>
      </span>
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
  const kpiRows: Array<{ kpi: BenchmarkKpi; label: string; rawValue: number | null; formattedValue: string }> = [
    {
      kpi: 'grossYield',
      label: 'Bruttorendite',
      rawValue: overview.grossYield,
      formattedValue: overview.grossYield !== null ? formatPercent(overview.grossYield) : '–',
    },
    {
      kpi: 'netYield',
      label: 'Nettorendite',
      rawValue: summary.netYield,
      formattedValue: summary.netYield !== null ? formatPercent(summary.netYield) : '–',
    },
    {
      kpi: 'cashOnCash',
      label: 'Cash-on-Cash',
      rawValue: overview.cashOnCash,
      formattedValue: overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–',
    },
    {
      kpi: 'eigenkapitalrendite',
      label: 'Eigenkapitalrendite',
      rawValue: overview.eigenkapitalrendite,
      formattedValue: overview.eigenkapitalrendite !== null ? formatPercent(overview.eigenkapitalrendite) : '–',
    },
    {
      kpi: 'kaufpreisfaktor',
      label: 'Kaufpreisfaktor',
      rawValue: overview.kaufpreisfaktor,
      formattedValue: overview.kaufpreisfaktor !== null ? `${formatNumber(overview.kaufpreisfaktor, 1)}×` : '–',
    },
    {
      kpi: 'dscr',
      label: 'DSCR (NOI)',
      rawValue: overview.dscr,
      formattedValue: overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–',
    },
    {
      kpi: 'ltv',
      label: 'LTV',
      rawValue: overview.ltv,
      formattedValue: overview.ltv !== null ? formatPercent(overview.ltv) : '–',
    },
    {
      kpi: 'actualVacancyRate',
      label: 'Tats. Leerstandsquote',
      rawValue: overview.actualVacancyRate,
      formattedValue: overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–',
    },
    {
      kpi: 'actualVacancyRateYear',
      label: 'Tats. Leerstandsquote (Jahr)',
      rawValue: overview.actualVacancyRateYear,
      formattedValue: overview.actualVacancyRateYear !== null ? formatPercent(overview.actualVacancyRateYear) : '–',
    },
  ];

  const valueGainClass = overview.valueGain !== null && overview.valueGain >= 0 ? 'text-positive' : 'text-negative';

  return (
    <Card className="flex flex-col">
      <SectionLabel className="mb-2">Rendite & Investment</SectionLabel>

      <div className="flex flex-col">
        {kpiRows.map((row) => (
          <KpiRow key={row.kpi} {...row} property={property} summary={summary} overview={overview} />
        ))}
      </div>

      <div className="mt-auto">
        <p className="mb-2 mt-3.5 text-[11px] font-bold uppercase tracking-[0.4px] text-text-dim">Investment</p>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
          <Stat label="Gesamtinvestment" value={formatCurrency(summary.totalInvestment)} size="lg" />
          <Stat label="Eigenkapital" value={formatCurrency(overview.equityUsed)} size="lg" />
          <Stat label="NOI / Jahr" value={formatCurrency(summary.netOperatingIncomeYearly)} size="lg" />
          <Stat label="Break-Even-Miete" value={formatCurrency(overview.breakEvenRentMonthly)} size="lg" />
        </div>

        {overview.valueGain !== null && overview.valueGainPercent !== null && (
          <>
            <div className="my-3.5 h-px bg-black/[0.07]" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
              <Stat label="Aktueller Marktwert" value={formatCurrency(overview.currentMarketValue ?? 0)} size="lg" />
              <Stat
                label="Wertsteigerung"
                size="lg"
                valueClassName={valueGainClass}
                value={
                  <>
                    {overview.valueGain >= 0 ? '+' : ''}
                    {formatCurrency(overview.valueGain)}{' '}
                    <span className="text-[13px] font-semibold">({formatPercent(overview.valueGainPercent)})</span>
                  </>
                }
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
