import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  afaBasis,
  depreciationYearly,
  depreciationMonthly,
  depreciationProratedInAcquisitionYear,
} from '@/lib/calculations/depreciationCalculator';

describe('depreciationCalculator', () => {
  it('afaBasis: building + closing-cost share + eligible renovation', () => {
    const result = afaBasis(f.buildingValue, f.closingCostsTotal, f.purchasePrice, f.renovationAfaEligible);
    expect(result).toBeCloseTo(f.afaBasis, 0);
  });

  it('afaBasis: zero building value (Grundstück ohne Gebäude) is zero', () => {
    expect(afaBasis(0, 20_000, 100_000, 0)).toBeCloseTo(0, 2);
  });

  it('afaBasis: with renovation share', () => {
    // buildingShare = 200000/250000 = 0.8; afaBasis = 200000 + (10000*0.8) + 15000 = 223000
    expect(afaBasis(200_000, 10_000, 250_000, 15_000)).toBeCloseTo(223_000, 1);
  });

  it('depreciationYearly', () => {
    expect(depreciationYearly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationMonthly', () => {
    expect(depreciationMonthly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationMonthly, 0);
  });

  it('depreciationProratedInAcquisitionYear: February transfer (11 months remaining)', () => {
    // 9387.95 / 12 * 11 = 8605.62
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, f.economicTransferDate);
    expect(result).toBeCloseTo(8_605.62, 0);
  });

  it('depreciationProratedInAcquisitionYear: January transfer equals full year', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 1, 1));
    expect(result).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationProratedInAcquisitionYear: December transfer equals one month', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 12, 1));
    expect(result).toBeCloseTo(f.depreciationMonthly, 0);
  });
});
