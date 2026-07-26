import { describe, it, expect } from 'vitest';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

const ALL_KPIS: BenchmarkKpi[] = ['grossYield', 'netYield', 'cashOnCash', 'kaufpreisfaktor', 'dscr', 'ltv', 'actualVacancyRate'];

describe('KPI_INFO', () => {
  it('has an entry for every BenchmarkKpi, each with non-empty copy', () => {
    for (const kpi of ALL_KPIS) {
      const info = KPI_INFO[kpi];
      expect(info).toBeDefined();
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.formula.length).toBeGreaterThan(0);
      expect(info.meaning.length).toBeGreaterThan(0);
      expect(info.benchmarks.length).toBe(3);
      expect(info.context.length).toBeGreaterThan(0);
    }
  });
});
