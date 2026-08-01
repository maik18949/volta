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
};

/**
 * Rot→Orange→Grün gradient bar with a marker at the KPI's current position.
 * Renders nothing when value is null (no data yet) — same as the old KpiChip dot.
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
      <div className="relative h-[6px] w-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500">
        <div className="absolute -top-[7px]" style={{ left: `${pct}%` }}>
          <div className="h-0 w-0 -translate-x-1/2 border-x-[3.5px] border-t-[5px] border-x-transparent border-t-[#1f2937]" />
        </div>
      </div>
      {showAxis && (
        <div className="mt-1.5 flex justify-between text-[10.5px] text-text-dim">
          {axisValues.map((axisValue, i) => (
            <span key={i}>{format(axisValue)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
