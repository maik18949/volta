import type { Database } from '@/lib/supabase/types';
import { toUnitStatusHistories } from '@/lib/data/propertySummary';
import { makeDate, firstDayOfMonth } from '@/lib/calculations/dateHelpers';
import { statusesForMonth, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import type { StatusEntry, PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import {
  cashflowLineItemsForScenario,
  cashflowLineItemsForActualMonth,
  blendCashflowLineItems,
  type CashflowLineItems,
} from '@/lib/calculations/cashflowCalculator';
import { hoaNonRecoverableMonthly } from '@/lib/calculations/kpiCalculator';
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
import type { LoanDisbursementRow } from '@/lib/data/loanDisbursements';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export interface CashflowForecastMonthResult {
  lineItems: CashflowLineItems;
  taxEffectMonthly: number;
  cashflowAfterTax: number;
}

/**
 * A single month's line items for a hypothetical Vollvermietung/Leerstand blend at `quote`
 * (0 = vollvermietung, 1 = leerstand) — shared by Card 1 (always blended) and Card 2's
 * not-yet-passed months (blended only when a Leerstandsquote override applies). See
 * docs/superpowers/specs/2026-09-24-cashflow-leerstand-szenario-design.md.
 */
function scenarioBlendLineItems(
  property: PropertyRow,
  quote: number,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
  const scenarioInputBase = {
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    monthlyMortgage: property.monthly_mortgage,
    hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    propertyManagementAnnual: property.property_management_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,
    extraordinaryCostsThisMonth,
  };
  const vollvermietungLineItems = cashflowLineItemsForScenario({ scenario: 'vollvermietung', ...scenarioInputBase });
  const leerstandLineItems = cashflowLineItemsForScenario({ scenario: 'leerstand', ...scenarioInputBase });
  return blendCashflowLineItems(vollvermietungLineItems, leerstandLineItems, quote);
}

/**
 * Cashflow tab Card 1 ("Laufendes Jahr / Monatlich") — a settings-only typical month
 * blended between a full vollvermietung and a full leerstand scenario by
 * `leerstandQuote` (0 = vollvermietung, 1 = leerstand), per
 * blendCashflowLineItems. That blend always applies to the line items above,
 * regardless of where the slider sits, since it is meant to show "what a
 * typical month looks like at this quote."
 *
 * taxEffectMonthly is different: it must agree EXACTLY with Card 2 and the
 * Steuer tab's "Laufendes Jahr" card (both of which call computeTaxCurrentYear
 * with no override) whenever the slider sits at its computed default — three
 * cards on one screen must not disagree about "this year's tax effect" on an
 * untouched page load. So the override is applied conditionally: at the
 * default (`leerstandQuote === defaultLeerstandQuote`), this calls
 * computeTaxCurrentYear with no override, bit-identical to Card 2/Steuer tab.
 * Only once the user actually moves the slider away from the default does it
 * switch to computeTaxCurrentYear's `leerstandQuoteOverride` mechanism (Task
 * 6): elapsed months of the current year stay real Ist data, and the
 * remaining months are recomputed as if they had this exact vacancy quote —
 * a genuine "what if" scenario. That is deliberately different from both
 * (a) always using the real Ist-based number regardless of the chosen quote
 * — which would keep showing the real (usually vollvermietung-based) tax
 * refund even while the line items above simulate a vacancy — and
 * (b) computeTaxForecastYear, which represents a fully hypothetical year
 * with no Ist data at all and would be a mismatch for a "current year,
 * right now" forecast card.
 */
export function computeCashflowForecastMonth(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  leerstandQuote: number,
  defaultLeerstandQuote: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): CashflowForecastMonthResult {
  const hoaFeeNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_total_monthly,
    property.hoa_fee_recoverable_monthly,
    property.hoa_fee_maintenance_reserve_monthly
  );
  const hoaFeeParkingNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_parking_total_monthly,
    property.hoa_fee_parking_recoverable_monthly,
    property.hoa_fee_parking_maintenance_reserve_monthly
  );

  const lineItems = scenarioBlendLineItems(property, leerstandQuote, 0, hoaFeeNonRecoverableMonthly, hoaFeeParkingNonRecoverableMonthly);

  const { taxEffectMonthly } =
    leerstandQuote === defaultLeerstandQuote
      ? computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today, undefined, disbursementRows)
      : computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today, leerstandQuote, disbursementRows);

  return {
    lineItems,
    taxEffectMonthly,
    cashflowAfterTax: lineItems.cashflowBeforeTax + taxEffectMonthly,
  };
}

const ZERO_LINE_ITEMS: CashflowLineItems = {
  incomeWE: 0,
  incomeTE: 0,
  mortgage: 0,
  hoaNonRecoverableWE: 0,
  maintenanceReserveWE: 0,
  insuranceWE: 0,
  managementWE: 0,
  otherCostsWE: 0,
  hoaRecoverableWE: 0,
  propertyTaxWE: 0,
  hoaNonRecoverableTE: 0,
  maintenanceReserveTE: 0,
  hoaRecoverableTE: 0,
  propertyTaxTE: 0,
  extraordinaryCosts: 0,
  cashflowBeforeTax: 0,
};

function addLineItems(a: CashflowLineItems, b: CashflowLineItems): CashflowLineItems {
  return {
    incomeWE: a.incomeWE + b.incomeWE,
    incomeTE: a.incomeTE + b.incomeTE,
    mortgage: a.mortgage + b.mortgage,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE + b.hoaNonRecoverableWE,
    maintenanceReserveWE: a.maintenanceReserveWE + b.maintenanceReserveWE,
    insuranceWE: a.insuranceWE + b.insuranceWE,
    managementWE: a.managementWE + b.managementWE,
    otherCostsWE: a.otherCostsWE + b.otherCostsWE,
    hoaRecoverableWE: a.hoaRecoverableWE + b.hoaRecoverableWE,
    propertyTaxWE: a.propertyTaxWE + b.propertyTaxWE,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE + b.hoaNonRecoverableTE,
    maintenanceReserveTE: a.maintenanceReserveTE + b.maintenanceReserveTE,
    hoaRecoverableTE: a.hoaRecoverableTE + b.hoaRecoverableTE,
    propertyTaxTE: a.propertyTaxTE + b.propertyTaxTE,
    extraordinaryCosts: a.extraordinaryCosts + b.extraordinaryCosts,
    cashflowBeforeTax: a.cashflowBeforeTax + b.cashflowBeforeTax,
  };
}

function divideLineItems(a: CashflowLineItems, n: number): CashflowLineItems {
  return {
    incomeWE: a.incomeWE / n,
    incomeTE: a.incomeTE / n,
    mortgage: a.mortgage / n,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE / n,
    maintenanceReserveWE: a.maintenanceReserveWE / n,
    insuranceWE: a.insuranceWE / n,
    managementWE: a.managementWE / n,
    otherCostsWE: a.otherCostsWE / n,
    hoaRecoverableWE: a.hoaRecoverableWE / n,
    propertyTaxWE: a.propertyTaxWE / n,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE / n,
    maintenanceReserveTE: a.maintenanceReserveTE / n,
    hoaRecoverableTE: a.hoaRecoverableTE / n,
    propertyTaxTE: a.propertyTaxTE / n,
    extraordinaryCosts: a.extraordinaryCosts / n,
    cashflowBeforeTax: a.cashflowBeforeTax / n,
  };
}

function scaleLineItems(a: CashflowLineItems, factor: number): CashflowLineItems {
  return {
    incomeWE: a.incomeWE * factor,
    incomeTE: a.incomeTE * factor,
    mortgage: a.mortgage * factor,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE * factor,
    maintenanceReserveWE: a.maintenanceReserveWE * factor,
    insuranceWE: a.insuranceWE * factor,
    managementWE: a.managementWE * factor,
    otherCostsWE: a.otherCostsWE * factor,
    hoaRecoverableWE: a.hoaRecoverableWE * factor,
    propertyTaxWE: a.propertyTaxWE * factor,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE * factor,
    maintenanceReserveTE: a.maintenanceReserveTE * factor,
    hoaRecoverableTE: a.hoaRecoverableTE * factor,
    propertyTaxTE: a.propertyTaxTE * factor,
    extraordinaryCosts: a.extraordinaryCosts * factor,
    cashflowBeforeTax: a.cashflowBeforeTax * factor,
  };
}

/**
 * A single month's line items — falls back to the vollvermietung scenario
 * (ignoring statusHistory entirely) when there is no status history at all,
 * per spec-cashflow-tab.md ("Kein StatusEntry vorhanden"): "no data yet"
 * must not be read as "vacant" (which cashflowLineItemsForActualMonth would
 * otherwise do, since an empty history defaults every day to leerstand).
 */
function lineItemsForMonth(
  property: PropertyRow,
  statusHistory: StatusEntry[],
  stellplatzStatusHistory: StatusEntry[],
  monthDate: Date,
  today: Date,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
  if (statusHistory.length === 0) {
    return cashflowLineItemsForScenario({
      scenario: 'vollvermietung',
      coldRentMonthly: property.cold_rent_monthly,
      parkingRentMonthly: property.parking_rent_monthly,
      otherIncomeMonthly: property.other_income_monthly,
      monthlyMortgage: property.monthly_mortgage,
      hoaFeeNonRecoverableMonthly,
      hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
      hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
      propertyTaxAnnual: property.property_tax_annual,
      propertyInsuranceAnnual: property.property_insurance_annual,
      propertyManagementAnnual: property.property_management_annual,
      otherCostsMonthly: property.other_costs_monthly,
      hoaFeeParkingNonRecoverableMonthly,
      hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
      hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
      propertyTaxParkingAnnual: property.property_tax_parking_annual,
      extraordinaryCostsThisMonth,
    });
  }
  return cashflowLineItemsForActualMonth({
    month: monthDate,
    statusHistory,
    stellplatzStatusHistory,
    today,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    monthlyMortgage: property.monthly_mortgage,
    hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    propertyManagementAnnual: property.property_management_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,
    extraordinaryCostsThisMonth,
  });
}

export interface CashflowMonthColumn {
  month: number;
  isProjection: boolean;
  isOwned: boolean;
  hasMortgagePayment: boolean;
  statusLabelsWE: PropertyStatus[];
  statusLabelsTE: PropertyStatus[];
  lineItems: CashflowLineItems;
  extraordinaryCostRows: ExtraordinaryCostRow[];
  cashflowAfterTax: number | null;
}

export interface CashflowYearTableResult {
  year: number;
  isFutureYear: boolean;
  months: CashflowMonthColumn[];
  ownershipMonthCount: number;
  mortgageMonthCount: number;
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  extraordinaryCostsTotalForYear: number;
  extraordinaryCostsAvgForYear: number | null;
  extraordinaryCostsEntryCountForYear: number;
  taxEffectMonthly: number | null;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}

/** Cashflow tab Card 2 — the 12-month year table. */
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = [],
  forecastLeerstandQuote: number = 0, // 0 = Vollvermietung (Cashflow-Tab hat keinen eigenen Regler für Zukunftsjahre)
  leerstandQuoteOverride?: number
): CashflowYearTableResult {
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  // Kreditrate starts as soon as the loan does, even before the wirtschaftlicher Übergang —
  // every other line item stays gated by economicTransferDate. See
  // docs/superpowers/specs/2026-09-21-cashflow-kreditrate-vor-uebergang-design.md.
  const mortgageStartDate = loanStartDate.getTime() < economicTransferDate.getTime() ? loanStartDate : economicTransferDate;
  const currentYear = today.getUTCFullYear();
  const isFutureYear = year > currentYear;

  // Identisch zu annualTaxableIncomeBreakdown's leerstandQuoteOverride.fromMonth-Formel
  // (siehe lib/data/propertyTax.ts) — und wie dort schließt das den laufenden Monat (den, in
  // dem "today" liegt) MIT ein, sobald ein Override gesetzt ist; er wird nicht ausgespart.
  // Das ist auf der Steuer-Seite bewusstes, getestetes Verhalten (siehe
  // tests/calculations/taxCalculator.test.ts, 'leerstandQuoteOverride blends only months from
  // the given month onward, leaves earlier months as real Ist', wo fromMonth gleich dem
  // aktuellen Monat von "today" ist und dieser Monat im Override enthalten ist). Card 2 spiegelt
  // diesen Cutoff exakt, damit Cashflow und Steuer-Tab hier nicht auseinanderlaufen. makeDate
  // erwartet einen 1-indizierten Monat; getUTCMonth() ist 0-indiziert, daher +1.
  const overrideFromMonth = makeDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);

  const hoaFeeNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_total_monthly,
    property.hoa_fee_recoverable_monthly,
    property.hoa_fee_maintenance_reserve_monthly
  );
  const hoaFeeParkingNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_parking_total_monthly,
    property.hoa_fee_parking_recoverable_monthly,
    property.hoa_fee_parking_maintenance_reserve_monthly
  );

  const extraordinaryCostsByMonth = new Map<string, ExtraordinaryCostRow[]>();
  for (const row of extraordinaryCostRows) {
    const key = row.cost_month.slice(0, 7);
    const existing = extraordinaryCostsByMonth.get(key) ?? [];
    existing.push(row);
    extraordinaryCostsByMonth.set(key, existing);
  }

  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today,
    leerstandQuoteOverride,
    disbursementRows
  );

  // Zukunftsjahre bekommen einen echten (statt fehlenden) Steuereffekt über dieselbe
  // Funktion, die auch die Steuer-Tab-Jahresübersicht für Zukunftsjahre nutzt — mit der
  // vom Aufrufer übergebenen Standard-Leerstandsquote, nicht mit einem eigenen Regler
  // (der Cashflow-Tab hat keinen). Siehe docs/superpowers/specs/2026-09-24-steuer-jahresuebersicht-design.md.
  const effectiveTaxEffectMonthly = isFutureYear
    ? computeTaxForecastYear(property, year, forecastLeerstandQuote).taxEffectMonthly
    : currentYearTaxEffectMonthly;

  const months: CashflowMonthColumn[] = [];
  let ownershipMonthCount = 0;
  let mortgageMonthCount = 0;
  let preOwnershipMortgageTotal = 0;
  let sumLineItems = ZERO_LINE_ITEMS;

  for (let m = 1; m <= 12; m++) {
    const monthDate = makeDate(year, m, 1);
    const ownerFraction = ownershipDayFraction(monthDate, economicTransferDate);
    // Only used on the pre-ownership branch below — once a month is owned, its mortgage
    // stays tied to ownerFraction exactly as before (a deliberate simplification for the
    // rare case a mid-month transfer falls after mortgageStartDate; see the design doc).
    const mortgageFraction = ownershipDayFraction(monthDate, mortgageStartDate);
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const monthCostRows = extraordinaryCostsByMonth.get(key) ?? [];
    const extraordinaryCostsThisMonth = monthCostRows.reduce((sum, row) => sum + row.amount, 0);

    if (ownerFraction <= 0) {
      const hasMortgagePayment = mortgageFraction > 0;
      const mortgageAmount = property.monthly_mortgage * mortgageFraction;
      mortgageMonthCount += mortgageFraction;
      if (hasMortgagePayment) preOwnershipMortgageTotal += mortgageAmount;

      months.push({
        month: m,
        isProjection: monthDate.getTime() > firstDayOfMonth(today).getTime(),
        isOwned: false,
        hasMortgagePayment,
        statusLabelsWE: [],
        statusLabelsTE: [],
        lineItems: hasMortgagePayment
          ? { ...ZERO_LINE_ITEMS, mortgage: mortgageAmount, cashflowBeforeTax: -mortgageAmount }
          : ZERO_LINE_ITEMS,
        extraordinaryCostRows: monthCostRows,
        // A pre-ownership month that's ALSO in a future year stays null — deliberately out of
        // scope (an already-obscure combination: property not yet transferred, viewed for a
        // future year). See docs/superpowers/specs/2026-09-24-steuer-jahresuebersicht-design.md.
        cashflowAfterTax: hasMortgagePayment && !isFutureYear ? -mortgageAmount : null,
      });
      continue;
    }

    // Single source of truth for "is this month blended, and at what quote" — see PR feedback
    // on Task 1: this used to be a separately-computed useScenarioBlend boolean plus a ternary
    // picking the quote at the call site, held together only by an unenforced invariant between
    // the two (a leerstandQuoteOverride! that was safe only as long as both stayed in sync).
    const scenarioQuoteForMonth: number | undefined = isFutureYear
      ? forecastLeerstandQuote
      : leerstandQuoteOverride !== undefined && monthDate.getTime() >= overrideFromMonth.getTime()
        ? leerstandQuoteOverride
        : undefined;
    const useScenarioBlend = scenarioQuoteForMonth !== undefined;
    const rawLineItems = scenarioQuoteForMonth !== undefined
      ? scenarioBlendLineItems(
          property,
          scenarioQuoteForMonth,
          extraordinaryCostsThisMonth,
          hoaFeeNonRecoverableMonthly,
          hoaFeeParkingNonRecoverableMonthly
        )
      : lineItemsForMonth(
          property,
          statusHistory,
          stellplatzStatusHistory,
          monthDate,
          today,
          extraordinaryCostsThisMonth,
          hoaFeeNonRecoverableMonthly,
          hoaFeeParkingNonRecoverableMonthly
        );
    const lineItems = scaleLineItems(rawLineItems, ownerFraction);

    ownershipMonthCount += ownerFraction;
    mortgageMonthCount += ownerFraction;
    sumLineItems = addLineItems(sumLineItems, lineItems);

    months.push({
      month: m,
      isProjection: useScenarioBlend || statusHistory.length === 0 || monthDate.getTime() > firstDayOfMonth(today).getTime(),
      isOwned: true,
      hasMortgagePayment: true,
      statusLabelsWE: useScenarioBlend || statusHistory.length === 0 ? [] : statusesForMonth(monthDate, statusHistory, today),
      statusLabelsTE:
        useScenarioBlend || stellplatzStatusHistory.length === 0 ? [] : statusesForMonth(monthDate, stellplatzStatusHistory, today),
      lineItems,
      extraordinaryCostRows: monthCostRows,
      cashflowAfterTax: lineItems.cashflowBeforeTax + effectiveTaxEffectMonthly,
    });
  }

  const yearCostRows = extraordinaryCostRows.filter((row) => row.cost_month.slice(0, 4) === String(year));
  const extraordinaryCostsTotalForYear = yearCostRows.reduce((sum, row) => sum + row.amount, 0);
  const extraordinaryCostsEntryCountForYear = yearCostRows.length;

  const hasAnyColumn = ownershipMonthCount > 0 || mortgageMonthCount > 0;
  const totalColumn: CashflowLineItems | null = hasAnyColumn
    ? {
        ...sumLineItems,
        mortgage: sumLineItems.mortgage + preOwnershipMortgageTotal,
        cashflowBeforeTax: sumLineItems.cashflowBeforeTax - preOwnershipMortgageTotal,
      }
    : null;
  const avgColumn: CashflowLineItems | null = hasAnyColumn
    ? {
        ...(ownershipMonthCount > 0 ? divideLineItems(sumLineItems, ownershipMonthCount) : ZERO_LINE_ITEMS),
        mortgage: mortgageMonthCount > 0 ? totalColumn!.mortgage / mortgageMonthCount : 0,
        cashflowBeforeTax: mortgageMonthCount > 0 ? totalColumn!.cashflowBeforeTax / mortgageMonthCount : 0,
      }
    : null;

  return {
    year,
    isFutureYear,
    months,
    ownershipMonthCount,
    mortgageMonthCount,
    avgColumn,
    totalColumn,
    extraordinaryCostsTotalForYear,
    extraordinaryCostsAvgForYear:
      extraordinaryCostsEntryCountForYear >= 2 ? extraordinaryCostsTotalForYear / extraordinaryCostsEntryCountForYear : null,
    extraordinaryCostsEntryCountForYear,
    taxEffectMonthly: effectiveTaxEffectMonthly,
    hoaUnitSplitWarning: !property.is_hoa_unit_split,
    hoaParkingSplitWarning: property.parking_type !== 'nicht_vorhanden' && !property.is_hoa_parking_split,
  };
}
