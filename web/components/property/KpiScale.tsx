import { benchmarkColor, benchmarkThreshold, scalePosition, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatPercent, formatNumber, formatMultiplier } from '@/lib/formatters';

const VALUE_COLOR_CLASSES: Record<'green' | 'orange' | 'red', string> = {
  green: 'text-emerald-600',
  orange: 'text-amber-600',
  red: 'text-red-600',
};

/** Text color for a KPI's displayed value, matching its position on the scale. */
export function kpiValueColorClass(kpi: BenchmarkKpi, value: number | null): string {
  const color = benchmarkColor(kpi, value);
  return color ? VALUE_COLOR_CLASSES[color] : 'text-text-primary';
}

const AXIS_FORMAT: Record<BenchmarkKpi, (value: number) => string> = {
  grossYield: formatPercent,
  netYield: formatPercent,
  cashOnCash: formatPercent,
  eigenkapitalrendite: formatPercent,
  kaufpreisfaktor: formatMultiplier,
  dscr: (value) => formatNumber(value, 2),
  ltv: formatPercent,
  actualVacancyRate: formatPercent,
  actualVacancyRateYear: formatPercent,
};

/** Formats a raw KPI value in the unit the KPI's scale axis uses (percent, multiplier, plain number). */
export function formatKpiAxisValue(kpi: BenchmarkKpi, value: number): string {
  return AXIS_FORMAT[kpi](value);
}

/**
 * Three-segment Rot / Orange / Grün bar with a round marker at the KPI's current position.
 * Renders nothing when value is null (no data yet).
 * showAxis adds domain/threshold tick labels below the bar (used in the KPI info popup).
 */
export function KpiScale({ kpi, value, showAxis = false }: { kpi: BenchmarkKpi; value: number | null; showAxis?: boolean }) {
  if (value === null) return null;

  const pct = scalePosition(kpi, value) * 100;
  const t = benchmarkThreshold(kpi);
  const axisValues =
    t.direction === 'higherIsBetter' ? [t.domainMin, t.orange, t.green, t.domainMax] : [t.domainMax, t.orange, t.green, t.domainMin];
  const format = AXIS_FORMAT[kpi];

  return (
    <div>
      <div className="relative flex h-[5px] w-full gap-[2px]">
        <div className="flex-1 rounded-l-full bg-[rgba(220,38,38,0.7)]" />
        <div className="flex-1 bg-[rgba(217,119,6,0.7)]" />
        <div className="flex-1 rounded-r-full bg-[rgba(5,150,105,0.7)]" />
        <div
          className="absolute -top-[3.5px] h-3 w-3 -translate-x-1/2 rounded-full border-[2.5px] border-text-primary bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
          style={{ left: `${pct}%` }}
        />
      </div>
      {showAxis && (
        <div className="mt-1.5 flex justify-between text-[11px] text-text-secondary">
          {axisValues.map((axisValue, i) => (
            <span key={i}>{format(axisValue)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
