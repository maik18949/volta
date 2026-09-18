import { twMerge } from 'tailwind-merge';
import { benchmarkColor, benchmarkThreshold, type BenchmarkColor, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatKpiAxisValue } from '@/components/property/KpiScale';

const PILL_STYLES: Record<BenchmarkColor, string> = {
  green: 'bg-[rgba(21,128,61,0.12)] text-[#15803d]',
  orange: 'bg-[rgba(217,119,6,0.12)] text-[#d97706]',
  red: 'bg-[rgba(220,38,38,0.1)] text-[#dc2626]',
};

const PILL_LABELS: Record<BenchmarkColor, string> = {
  green: 'Gut',
  orange: 'Ok',
  red: 'Schlecht',
};

/** "Gut / Ok / Schlecht" pill for a benchmarked KPI. Renders nothing when there is no value yet. */
export function KpiRatingPill({ kpi, value, className }: { kpi: BenchmarkKpi; value: number | null; className?: string }) {
  const color = benchmarkColor(kpi, value);
  if (!color) return null;
  return (
    <span
      className={twMerge('inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold', PILL_STYLES[color], className)}
    >
      {PILL_LABELS[color]}
    </span>
  );
}

/** "Ziel ≥ 4,0 %" / "Ziel ≤ 70,0 %" — the green threshold of a KPI, for the KPI bar's subtitle. */
export function kpiTargetLabel(kpi: BenchmarkKpi): string {
  const t = benchmarkThreshold(kpi);
  return `Ziel ${t.direction === 'higherIsBetter' ? '≥' : '≤'} ${formatKpiAxisValue(kpi, t.green)}`;
}
