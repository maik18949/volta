import { describe, it, expect } from 'vitest';
import { buildingSharePercent, clampPercent, formatPercentInput, parsePercentInput, valuesFromBuildingShare } from '@/lib/wizard/buildingShare';

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

describe('parsePercentInput', () => {
  it('parses plain numbers with dot or comma and trims whitespace', () => {
    expect(parsePercentInput('')).toBe(0);
    expect(parsePercentInput('   ')).toBe(0);
    expect(parsePercentInput('80')).toBe(80);
    expect(parsePercentInput('33,5')).toBe(33.5);
    expect(parsePercentInput('33.5')).toBe(33.5);
    expect(parsePercentInput('33.')).toBe(33);
    expect(parsePercentInput('.5')).toBe(0.5);
    expect(parsePercentInput(',5')).toBe(0.5);
    expect(parsePercentInput('12,34')).toBe(12.34);
    expect(parsePercentInput('  42 ')).toBe(42);
  });

  it('does not clamp values above 100 within three digits', () => {
    expect(parsePercentInput('150')).toBe(150);
  });

  it('rejects everything that is not a plain non-negative decimal', () => {
    for (const bad of ['-', '-5', 'e', 'abc', '1e3', '12.345', '1234', '1000', '33.3.3', '+5', ' 5 5', '1,2,3', '5%']) {
      expect(parsePercentInput(bad), bad).toBeNull();
    }
  });
});

describe('formatPercentInput', () => {
  it('uses a decimal comma and no trailing zeros', () => {
    expect(formatPercentInput(80.71)).toBe('80,71');
    expect(formatPercentInput(80)).toBe('80');
    expect(formatPercentInput(0)).toBe('0');
  });
});
