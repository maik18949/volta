import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  acquisitionCostsTotal,
  afaBasis,
  depreciationYearly,
  depreciationMonthly,
  depreciationProratedInAcquisitionYear,
  valuationDeviation,
} from '@/lib/calculations/depreciationCalculator';

describe('depreciationCalculator', () => {
  it('afaBasis: Gebäudewert ist bereits auf die Gesamtanschaffungskosten bezogen (BMF-Rechner)', () => {
    // BMF-Split auf 298_734 EUR: Gebäude 228_024, Boden 70_710. Nebenkosten werden NICHT nochmals aufgeschlagen.
    expect(afaBasis(228_024, 0)).toBeCloseTo(228_024, 2);
    expect(afaBasis(f.buildingValue, f.renovationAfaEligible)).toBeCloseTo(f.afaBasis, 2);
  });

  it('afaBasis: zero building value (Grundstück ohne Gebäude) is zero', () => {
    expect(afaBasis(0, 0)).toBeCloseTo(0, 2);
  });

  it('afaBasis: with renovation share', () => {
    expect(afaBasis(200_000, 15_000)).toBeCloseTo(215_000, 1);
  });

  it('acquisitionCostsTotal: Kaufpreis plus Nebenkosten', () => {
    expect(acquisitionCostsTotal(f.purchasePrice, f.closingCostsTotal)).toBeCloseTo(f.totalInvestment, 2);
  });

  it('depreciationYearly', () => {
    expect(depreciationYearly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationMonthly', () => {
    expect(depreciationMonthly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationMonthly, 0);
  });

  it('depreciationProratedInAcquisitionYear: February transfer (11 months remaining)', () => {
    // 8756.12 / 12 * 11 = 8026.44
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, f.economicTransferDate);
    expect(result).toBeCloseTo(8_026.44, 0);
  });

  it('depreciationProratedInAcquisitionYear: January transfer equals full year', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 1, 1));
    expect(result).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationProratedInAcquisitionYear: December transfer equals one month', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 12, 1));
    expect(result).toBeCloseTo(f.depreciationMonthly, 0);
  });

  describe('valuationDeviation', () => {
    it('purchasePrice = 0 → 0 (avoids division by zero)', () => {
      expect(valuationDeviation(200_000, 60_000, 0)).toBe(0);
    });

    it('both values = 0 → 0 (pristine, untouched step should not warn)', () => {
      expect(valuationDeviation(0, 0, 300_000)).toBe(0);
    });

    it('just under 5% deviation → no-warning boundary', () => {
      // 4.9% of 300000 = 14700; sum = 285300+0 -> deviation ~4.9%
      const result = valuationDeviation(285_300, 0, 300_000);
      expect(result).toBeLessThan(0.05);
    });

    it('just over 5% deviation → warning boundary', () => {
      // 5.1% of 300000 = 15300; sum = 284700+0 -> deviation ~5.1%
      const result = valuationDeviation(284_700, 0, 300_000);
      expect(result).toBeGreaterThan(0.05);
    });

    it('BMF-Split summiert sich zu Kaufpreis + Nebenkosten → keine Abweichung', () => {
      expect(valuationDeviation(f.buildingValue, f.landValue, f.totalInvestment)).toBeLessThan(0.0001);
    });

    it('exact match → 0% deviation', () => {
      expect(valuationDeviation(240_000, 60_000, 300_000)).toBeCloseTo(0, 5);
    });
  });
});
