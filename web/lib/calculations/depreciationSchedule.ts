import { monthOf, yearOf } from './dateHelpers';

export type DepreciationMethod = 'linear' | 'degressiv_5a';
export type DepreciationPhase = 'linear' | 'degressiv' | 'linear_nach_wechsel';
export type SwitchState = 'weit' | 'faellig' | 'ueberfaellig' | 'vorgemerkt' | 'aktiv';

/** § 7 Abs. 5a Satz 4 EStG: fester Satz vom jeweiligen Restwert. */
export const DEGRESSIVE_RATE = 0.05;

/**
 * Der lineare Betrag nach einem Wechsel (Restwert ÷ Restnutzungsdauer) übersteigt den degressiven
 * (Restwert × 5 %), sobald die Restnutzungsdauer unter 1 / 5 % = 20 Jahre fällt.
 */
const BREAK_EVEN_REMAINING_YEARS = 1 / DEGRESSIVE_RATE;

const EPSILON = 0.005;
const MAX_YEARS = 100;
const MAX_SWITCH_YEARS_AFTER_ACQUISITION = 60;

export interface DepreciationPlanInput {
  /** AfA-Bemessungsgrundlage (afaBasis()). */
  basis: number;
  method: DepreciationMethod;
  /** Linearer Satz (z. B. 0.03); bei Degressiv der Satz nach dem Wechsel, liefert die Nutzungsdauer 1 / Satz. */
  linearRate: number;
  /** AfA-Beginn; der Anschaffungsmonat zählt voll (§ 7 Abs. 1 Satz 4 EStG). */
  economicTransferDate: Date;
  /** Geplantes Wechseljahr zu linear; nur bei `degressiv_5a` relevant. */
  switchYear: number | null;
}

export interface DepreciationYear {
  year: number;
  amount: number;
  bookValueEnd: number;
  phase: DepreciationPhase;
}

export function parseDepreciationMethod(value: string): DepreciationMethod {
  return value === 'degressiv_5a' ? 'degressiv_5a' : 'linear';
}

function acquisitionYearFraction(transferDate: Date): number {
  return (13 - monthOf(transferDate)) / 12;
}

/**
 * AfA und Restwert je Kalenderjahr vom Erwerbsjahr bis `untilYear`.
 *
 * Wechsel zu linear (§ 7 Abs. 5a Sätze 7–8 EStG): Der Restwert zu Beginn des Wechseljahres wird
 * eingefroren und gleichmäßig auf die Restnutzungsdauer (Nutzungsdauer − bisher vergangene Zeit)
 * verteilt. Das ist die übliche Lesart von Satz 8, nicht amtlich bestätigt (kein BMF-Schreiben gefunden).
 */
export function depreciationSchedule(input: DepreciationPlanInput, untilYear: number): DepreciationYear[] {
  const startYear = yearOf(input.economicTransferDate);
  const rows: DepreciationYear[] = [];
  if (untilYear < startYear) return rows;

  const basis = Math.max(input.basis, 0);
  const nutzungsdauer = input.linearRate > 0 ? 1 / input.linearRate : Number.POSITIVE_INFINITY;
  const effectiveSwitchYear = input.switchYear === null ? null : Math.max(input.switchYear, startYear + 1);

  let bookValue = basis;
  let elapsedYears = 0;
  let amountAfterSwitch: number | null = null;

  for (let year = startYear; year <= untilYear; year++) {
    const fraction = year === startYear ? acquisitionYearFraction(input.economicTransferDate) : 1;
    let amount: number;
    let phase: DepreciationPhase;

    if (input.method === 'linear') {
      amount = basis * input.linearRate * fraction;
      phase = 'linear';
    } else if (effectiveSwitchYear !== null && year >= effectiveSwitchYear) {
      if (amountAfterSwitch === null) {
        const remainingYears = nutzungsdauer - elapsedYears;
        amountAfterSwitch = remainingYears > 0 ? bookValue / remainingYears : bookValue;
      }
      amount = amountAfterSwitch;
      phase = 'linear_nach_wechsel';
    } else {
      amount = bookValue * DEGRESSIVE_RATE * fraction;
      phase = 'degressiv';
    }

    amount = Math.min(amount, bookValue);
    bookValue -= amount;
    if (bookValue < EPSILON) {
      amount += bookValue;
      bookValue = 0;
    }

    rows.push({ year, amount, bookValueEnd: bookValue, phase });
    elapsedYears += fraction;
  }

  return rows;
}

/** null vor dem Erwerbsjahr. */
export function depreciationForYear(input: DepreciationPlanInput, year: number): DepreciationYear | null {
  return depreciationSchedule(input, year).find((row) => row.year === year) ?? null;
}

/** Erstes Jahr, in dem der Restwert 0 erreicht; null, wenn nie (degressiv ohne Wechsel). */
export function depreciationEndYear(input: DepreciationPlanInput): number | null {
  const startYear = yearOf(input.economicTransferDate);
  return depreciationSchedule(input, startYear + MAX_YEARS).find((row) => row.bookValueEnd === 0)?.year ?? null;
}

/**
 * Erstes Jahr nach dem Erwerbsjahr, ab dem der lineare Betrag nach einem Wechsel den degressiven
 * übersteigt: vergangene Zeit > Nutzungsdauer − 20 Jahre. Unabhängig von Basis und Kaufpreis.
 */
export function optimalSwitchYear(input: { economicTransferDate: Date; linearRate: number }): number | null {
  if (!(input.linearRate > 0)) return null;
  const startYear = yearOf(input.economicTransferDate);
  const threshold = 1 / input.linearRate - BREAK_EVEN_REMAINING_YEARS;
  let elapsedYears = acquisitionYearFraction(input.economicTransferDate);
  for (let year = startYear + 1; year <= startYear + MAX_YEARS; year++) {
    if (elapsedYears > threshold) return year;
    elapsedYears += 1;
  }
  return null;
}

/** Wechseljahr: ganze Zahl nach dem Erwerbsjahr, höchstens 60 Jahre danach. */
export function isValidSwitchYear(year: number, transferDate: Date): boolean {
  const startYear = yearOf(transferDate);
  return Number.isInteger(year) && year > startYear && year <= startYear + MAX_SWITCH_YEARS_AFTER_ACQUISITION;
}

export function switchState(args: { currentYear: number; switchYear: number | null; optimalYear: number }): SwitchState {
  if (args.switchYear !== null) return args.switchYear > args.currentYear ? 'vorgemerkt' : 'aktiv';
  if (args.currentYear > args.optimalYear) return 'ueberfaellig';
  if (args.currentYear >= args.optimalYear - 1) return 'faellig';
  return 'weit';
}

const WINDOW_START = Date.UTC(2023, 9, 1);
const WINDOW_END_EXCLUSIVE = Date.UTC(2029, 9, 1);

/** Weiche Warnung (keine Sperre), wenn die Voraussetzungen von § 7 Abs. 5a EStG fraglich sind. */
export function degressiveEligibilityWarning(args: {
  yearBuilt: number | null;
  purchaseDate: Date;
  economicTransferDate: Date;
}): string | null {
  if (args.yearBuilt !== null && !Number.isNaN(args.yearBuilt)) {
    if (args.yearBuilt < 2023) {
      return 'Degressive AfA gilt nur für Gebäude, die nach 2022 fertiggestellt wurden (Baujahr ab 2023).';
    }
    if (yearOf(args.economicTransferDate) > args.yearBuilt) {
      return 'Degressive AfA setzt voraus, dass das Gebäude bis zum Ende des Fertigstellungsjahres angeschafft wurde (Neubau).';
    }
  }
  const purchase = args.purchaseDate.getTime();
  if (purchase < WINDOW_START || purchase >= WINDOW_END_EXCLUSIVE) {
    return 'Der Kaufvertrag muss zwischen dem 1.10.2023 und dem 30.9.2029 abgeschlossen worden sein.';
  }
  return null;
}
