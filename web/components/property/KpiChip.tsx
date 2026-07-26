import type { BenchmarkColor } from '@/lib/calculations/kpiCalculator';

const COLOR_CLASSES: Record<BenchmarkColor, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
};

export function KpiChip({ color }: { color: BenchmarkColor | null }) {
  if (!color) return null;
  return <span className={`inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[color]}`} aria-hidden />;
}
