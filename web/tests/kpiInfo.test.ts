import { describe, it, expect } from 'vitest';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

const ALL_KPIS: BenchmarkKpi[] = [
  'grossYield',
  'netYield',
  'cashOnCash',
  'eigenkapitalrendite',
  'kaufpreisfaktor',
  'dscr',
  'ltv',
  'actualVacancyRate',
];

describe('KPI_INFO', () => {
  it('has an entry for every BenchmarkKpi, each with non-empty formula/purpose/goodWhen', () => {
    for (const kpi of ALL_KPIS) {
      const info = KPI_INFO[kpi];
      expect(info).toBeDefined();
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.formula.length).toBeGreaterThan(0);
      expect(info.purpose.length).toBeGreaterThan(0);
      expect(info.goodWhen.length).toBeGreaterThan(0);
    }
  });

  it('einordnung, where present, is non-empty (never an empty string that would render an empty section)', () => {
    for (const kpi of ALL_KPIS) {
      const einordnung = KPI_INFO[kpi].einordnung;
      if (einordnung !== undefined) {
        expect(einordnung.length).toBeGreaterThan(0);
      }
    }
  });
});
