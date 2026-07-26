import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  ownerBorneRecoverableWEForMonth,
  ownerBorneRecoverableWEBreakdown,
  cashflowBeforeTax,
  cashflowAfterTax,
  annualCashflowBeforeTax,
  cashflowLineItemsForScenario,
  type CashflowScenarioInput,
} from '@/lib/calculations/cashflowCalculator';

function statusEntry(status: StatusEntry['status'], y: number, m: number, d = 1): StatusEntry {
  return { date: makeDate(y, m, d), status, incomeActualMonthly: null };
}

describe('cashflowCalculator', () => {
  const today = makeDate(2026, 12, 1);

  it('ownerBorneRecoverableWEForMonth: vermietet all month is zero', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(0, 2);
  });

  it('ownerBorneRecoverableWEForMonth: leerstand all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('ownerBorneRecoverableWEForMonth: mietgarantie all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'mietgarantie', incomeActualMonthly: 999 }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('ownerBorneRecoverableWEBreakdown: splits into hoaRecoverable + propertyTax, summing to the combined function', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const breakdown = ownerBorneRecoverableWEBreakdown(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    const combined = ownerBorneRecoverableWEForMonth(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    expect(breakdown.hoaRecoverable + breakdown.propertyTax).toBeCloseTo(combined, 6);
    expect(breakdown.hoaRecoverable).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
    expect(breakdown.propertyTax).toBeCloseTo(f.propertyTaxAnnual / 12, 4);
  });

  it('ownerBorneRecoverableWEBreakdown: vermietet all month is zero for both fields', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const breakdown = ownerBorneRecoverableWEBreakdown(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    expect(breakdown.hoaRecoverable).toBeCloseTo(0, 4);
    expect(breakdown.propertyTax).toBeCloseTo(0, 4);
  });

  it('cashflowBeforeTax: vermietet, no parking', () => {
    // 950 - 1242.85 - 192.76 = -485.61
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-485.61, 1);
  });

  it('cashflowBeforeTax: leerstand, no parking', () => {
    // 0 - 1242.85 - 192.76 - 309.08 = -1744.69
    const result = cashflowBeforeTax({
      incomeActualMonthly: 0,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: f.operatingCostsRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-1744.69, 1);
  });

  it('cashflowBeforeTax: with an extraordinary cost', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 500,
    });
    expect(result).toBeCloseTo(-985.61, 1);
  });

  it('cashflowBeforeTax: parking costs are always owner-borne (vermietet unit, occupied parking)', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950 + 48,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 20,
      hoaFeeParkingMaintenanceReserveMonthly: 5,
      hoaFeeParkingRecoverableMonthly: 10,
      propertyTaxParkingMonthly: 3,
      extraordinaryCostsThisMonth: 0,
    });
    // -485.61 (base, now with parking rent 48 added to income) - 20 - 5 - 10 - 3
    expect(result).toBeCloseTo(950 + 48 - f.monthlyMortgage - f.operatingCostsNonRecoverableMonthly - 38, 1);
  });

  it('cashflowAfterTax adds the monthly tax effect', () => {
    const result = cashflowAfterTax(-485.61, f.taxEffectMonthly);
    expect(result).toBeCloseTo(-136.51, 1);
  });
});

describe('annualCashflowBeforeTax', () => {
  it('sums cashflowBeforeTax across every ownership month of the year, including a mid-year extraordinary cost', () => {
    // Owned since 2025-01-01 -> fully owned all of 2026. Vermietet the whole time, no status
    // changes. Rent 1000/month, mortgage 600/month, running costs 150/month -> 250/month
    // before extraordinary costs. A single 500 repair lands in June.
    const extraordinaryCostsByMonth = new Map<string, number>([['2026-06', 500]]);

    const result = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [statusEntry('vermietet', 2025, 1, 1)],
      economicTransferDate: makeDate(2025, 1, 1),
      today: makeDate(2026, 12, 31),
      coldRentMonthly: 1000,
      parkingRentMonthly: 0,
      monthlyMortgage: 600,
      operatingCostsNonRecoverableMonthly: 150,
      hoaFeeRecoverableMonthly: 0,
      propertyTaxAnnual: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth,
    });

    // 11 normal months at 250 + 1 month (June) at 250 - 500 = -250 -> 2750 - 250 = 2500
    expect(result).toBeCloseTo(2500, 1);
  });

  it('a mid-year acquisition only counts months from the transfer date onward', () => {
    const result = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [statusEntry('vermietet', 2026, 7, 1)],
      economicTransferDate: makeDate(2026, 7, 1),
      today: makeDate(2026, 12, 31),
      coldRentMonthly: 1000,
      parkingRentMonthly: 0,
      monthlyMortgage: 600,
      operatingCostsNonRecoverableMonthly: 150,
      hoaFeeRecoverableMonthly: 0,
      propertyTaxAnnual: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth: new Map(),
    });
    // Jul-Dec = 6 months at 250 = 1500. Jan-Jun contribute 0 (ownerFraction 0).
    expect(result).toBeCloseTo(1500, 1);
  });
});

describe('cashflowLineItemsForScenario', () => {
  const baseInput: CashflowScenarioInput = {
    scenario: 'vollvermietung',
    coldRentMonthly: f.coldRentMonthly,
    parkingRentMonthly: f.parkingRentMonthly,
    otherIncomeMonthly: 0,
    monthlyMortgage: f.monthlyMortgage,
    hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
    hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
    propertyTaxAnnual: f.propertyTaxAnnual,
    propertyInsuranceAnnual: 0,
    propertyManagementAnnual: f.propertyManagementAnnual,
    otherCostsMonthly: 0,
    hoaFeeParkingNonRecoverableMonthly: 0,
    hoaFeeParkingMaintenanceReserveMonthly: 0,
    hoaFeeParkingRecoverableMonthly: 0,
    propertyTaxParkingAnnual: 0,
    extraordinaryCostsThisMonth: 0,
  };

  it('vollvermietung: full income, no owner-borne recoverable WE costs', () => {
    const result = cashflowLineItemsForScenario(baseInput);
    expect(result.income).toBeCloseTo(998, 2); // coldRent 950 + parkingRent 48
    expect(result.mortgage).toBe(f.monthlyMortgage);
    expect(result.hoaNonRecoverableWE).toBe(f.hoaFeeNonRecoverableMonthly);
    expect(result.maintenanceReserveWE).toBe(f.maintenanceReserveMonthly);
    expect(result.insuranceWE).toBe(0); // propertyInsuranceAnnual is 0 in baseInput
    expect(result.managementWE).toBeCloseTo(f.propertyManagementAnnual / 12, 2);
    expect(result.otherCostsWE).toBe(0); // otherCostsMonthly is 0 in baseInput
    expect(result.hoaRecoverableWE).toBe(0);
    expect(result.propertyTaxWE).toBe(0);
    expect(result.cashflowBeforeTax).toBeCloseTo(-437.61, 1);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = cashflowLineItemsForScenario({ ...baseInput, scenario: 'leerstand' });
    expect(result.income).toBe(0);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
    expect(result.propertyTaxWE).toBeCloseTo(f.propertyTaxMonthly, 4);
    expect(result.cashflowBeforeTax).toBeCloseTo(-1744.69, 1);
  });

  it('parking (TE) costs are always owner-borne regardless of scenario', () => {
    const withParking: CashflowScenarioInput = {
      ...baseInput,
      hoaFeeParkingNonRecoverableMonthly: 20,
      hoaFeeParkingMaintenanceReserveMonthly: 5,
      hoaFeeParkingRecoverableMonthly: 10,
      propertyTaxParkingAnnual: 36, // /12 = 3
    };
    const vollvermietung = cashflowLineItemsForScenario(withParking);
    const leerstand = cashflowLineItemsForScenario({ ...withParking, scenario: 'leerstand' });
    expect(vollvermietung.hoaNonRecoverableTE).toBe(20);
    expect(vollvermietung.hoaRecoverableTE).toBe(10);
    expect(vollvermietung.propertyTaxTE).toBeCloseTo(3, 2);
    expect(leerstand.hoaNonRecoverableTE).toBe(20);
    expect(leerstand.hoaRecoverableTE).toBe(10);
    expect(leerstand.propertyTaxTE).toBeCloseTo(3, 2);
  });

  it('an extraordinary cost reduces cashflowBeforeTax by exactly its amount', () => {
    const without = cashflowLineItemsForScenario(baseInput);
    const withCost = cashflowLineItemsForScenario({ ...baseInput, extraordinaryCostsThisMonth: 500 });
    expect(without.cashflowBeforeTax - withCost.cashflowBeforeTax).toBeCloseTo(500, 2);
  });
});
