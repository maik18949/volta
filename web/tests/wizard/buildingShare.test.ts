import { describe, it, expect } from 'vitest';
import { buildingSharePercent, clampPercent, valuesFromBuildingShare } from '@/lib/wizard/buildingShare';

describe('buildingSharePercent', () => {
  it('derives the percentage from the euro values, rounded to two decimals', () => {
    expect(buildingSharePercent(140000, 175000)).toBe(80);
    expect(buildingSharePercent(141234, 175000)).toBe(80.71);
  });

  it('returns null without a purchase price', () => {
    expect(buildingSharePercent(100, 0)).toBeNull();
  });
});

describe('clampPercent', () => {
  it('limits to 0..100 and treats NaN as 0', () => {
    expect(clampPercent(120)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(42.5)).toBe(42.5);
  });
});

describe('valuesFromBuildingShare', () => {
  it('splits the purchase price, land is the remainder', () => {
    expect(valuesFromBuildingShare(80, 175000)).toEqual({ buildingValue: 140000, landValue: 35000 });
  });

  it('rounds to cents and keeps the sum exact', () => {
    const { buildingValue, landValue } = valuesFromBuildingShare(33.33, 250001);
    expect(buildingValue).toBe(83325.33);
    expect(landValue).toBe(166675.67);
    expect(Math.round((buildingValue + landValue) * 100) / 100).toBe(250001);
  });

  it('handles the boundaries 0 % and 100 %', () => {
    expect(valuesFromBuildingShare(0, 175000)).toEqual({ buildingValue: 0, landValue: 175000 });
    expect(valuesFromBuildingShare(100, 175000)).toEqual({ buildingValue: 175000, landValue: 0 });
  });

  it('clamps out-of-range input', () => {
    expect(valuesFromBuildingShare(150, 1000)).toEqual({ buildingValue: 1000, landValue: 0 });
    expect(valuesFromBuildingShare(Number.NaN, 1000)).toEqual({ buildingValue: 0, landValue: 1000 });
  });
});
