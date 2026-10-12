# Degressive AfA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro Objekt wählbare AfA-Methode (Linear | Degressiv 5 % nach § 7 Abs. 5a EStG) mit planbarem Wechsel zu linear, einer AfA-Karte im Steuer-Tab (Kennzahlen, Wechsel-Zeile, Vormerken per Klick) und korrekter AfA in allen Steuerberechnungen.

**Architecture:** Ein reiner Rechenkern (`depreciationSchedule.ts`) liefert AfA und Restwert je Kalenderjahr; der Wechsel ist ein Plan-Jahr, das ab `Jahr ≥ Wechseljahr` automatisch wirkt. Die Steuerberechnung bekommt das Feld `depreciationAmountYear` additiv und optional, damit lineare Objekte byte-identisch bleiben. UI: `StepAfaSteuer` (Wizard und Edit teilen die Komponente) und eine neue `AfaCard` im Steuer-Tab, beide über kleine reine Hilfsfunktionen testbar.

**Tech Stack:** Next.js 16 / React 19, TypeScript, react-hook-form, Supabase (Postgres), Tailwind 4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-12-degressive-afa-design.md`

**Arbeitsverzeichnis:** alle Befehle aus `/Users/maikschlarmann/volta/web` (Branch `feature/degressive-afa`). Baseline vor Beginn: `pnpm vitest run` → 603 Tests grün; `pnpm tsc --noEmit` und `pnpm lint` ohne Fehler (3 bestehende Lint-Warnungen).

---

## Dateiübersicht

| Datei | Verantwortung |
|---|---|
| `supabase/migrations/20261012120000_degressive_afa.sql` (neu) | Spalten `depreciation_method`, `degressive_switch_year` |
| `lib/supabase/types.ts` (ändern) | Typen der neuen Spalten (`properties`) |
| `lib/calculations/depreciationSchedule.ts` (neu) | AfA-Plan, Restwert, optimales Wechseljahr, Wechsel-Zustand, Eignungshinweis |
| `lib/calculations/taxCalculator.ts` (ändern) | optionales `depreciationAmountYear` |
| `lib/data/propertyDepreciation.ts` (neu) | Plan aus `PropertyRow`, Override für die Steuerberechnung, Modelle für die AfA-Karte |
| `lib/data/propertyTax.ts`, `lib/data/propertySummary.ts` (ändern) | `depreciationAmountYear` übergeben |
| `lib/wizard/wizardLogic.ts`, `lib/wizard/propertyEditLogic.ts` (ändern) | neue Formularfelder und DB-Mapping |
| `components/wizard/steps/StepAfaSteuer.tsx` (ändern) | Methode, Wechseljahr, Warnung, Zusammenfassung |
| `lib/data/propertyActions.ts` (ändern) | Server Action `setDegressiveSwitchYear` |
| `components/property/steuer/AfaCard.tsx`, `AfaSwitchPanel.tsx` (neu) | AfA-Karte mit Wechsel-Zeile und Vorschau-Feld |
| `components/property/steuer/AfaBasisCard.tsx` (löschen), `SteuerTab.tsx` (ändern) | Austausch der Karte |
| `README.md` (ändern) | Roadmap-Punkt aktualisieren |

---

### Task 1: Migration, Typen und Test-Fixtures

**Files:**
- Create: `supabase/migrations/20261012120000_degressive_afa.sql`
- Modify: `lib/supabase/types.ts` (Zeilen 222, 302, 382 im Block `properties`)
- Modify: `tests/kpiCalculationText.test.ts`, `tests/wizard/propertyEditLogic.test.ts`, `tests/components/ReturnsCard.test.tsx`, `tests/components/ObjectCard.test.tsx`, `tests/data/propertySummary.test.ts`, `tests/data/propertyTax.test.ts`, `tests/data/propertyFinancing.test.ts`, `tests/data/propertyOverview.test.ts`, `tests/data/propertyCashflow.test.ts`

- [ ] **Step 1: Migration anlegen**

```sql
-- Degressive AfA (§ 7 Abs. 5a EStG): Methode je Objekt und geplantes Wechseljahr zu linear.
-- depreciation_rate bleibt erhalten: bei degressiver AfA ist es der lineare Satz nach dem Wechsel.
alter table properties
  add column depreciation_method text not null default 'linear'
    check (depreciation_method in ('linear', 'degressiv_5a')),
  add column degressive_switch_year int
    check (degressive_switch_year is null or degressive_switch_year between 2000 and 2200);
```

- [ ] **Step 2: Typen und Test-Fixtures per Skript patchen**

```bash
python3 - <<'PY'
import pathlib, re

# 1) types.ts: neue Spalten vor depreciation_rate im Block "properties" (Row, Insert, Update).
path = pathlib.Path('lib/supabase/types.ts')
lines = path.read_text().split('\n')
inserts = {
    222: ['          degressive_switch_year: number | null', '          depreciation_method: string'],
    302: ['          degressive_switch_year?: number | null', '          depreciation_method?: string'],
    382: ['          degressive_switch_year?: number | null', '          depreciation_method?: string'],
}
for line_no in sorted(inserts, reverse=True):
    idx = line_no - 1
    assert 'depreciation_rate' in lines[idx], (line_no, lines[idx])
    lines[idx:idx] = inserts[line_no]
path.write_text('\n'.join(lines))

# 2) Test-Fixtures: PropertyRow-Objekte bekommen die neuen Pflichtfelder.
files = [
    'tests/kpiCalculationText.test.ts', 'tests/wizard/propertyEditLogic.test.ts',
    'tests/components/ReturnsCard.test.tsx', 'tests/components/ObjectCard.test.tsx',
    'tests/data/propertySummary.test.ts', 'tests/data/propertyTax.test.ts',
    'tests/data/propertyFinancing.test.ts', 'tests/data/propertyOverview.test.ts',
    'tests/data/propertyCashflow.test.ts',
]
pattern = re.compile(r'^(\s*)depreciation_rate: (.+),$', re.M)
for name in files:
    p = pathlib.Path(name)
    text = p.read_text()
    new, count = pattern.subn(lambda m: f"{m.group(0)}\n{m.group(1)}depreciation_method: 'linear',\n{m.group(1)}degressive_switch_year: null,", text)
    assert count == 1, (name, count)
    p.write_text(new)
print('ok')
PY
```

Expected: `ok`.

- [ ] **Step 3: Typen und Tests prüfen**

Run: `pnpm tsc --noEmit && pnpm vitest run`
Expected: keine TS-Fehler; `Tests  603 passed (603)`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261012120000_degressive_afa.sql lib/supabase/types.ts tests
git commit -m "feat(db): Spalten für AfA-Methode und Wechseljahr

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rechenkern `depreciationSchedule`

**Files:**
- Create: `lib/calculations/depreciationSchedule.ts`
- Test: `tests/calculations/depreciationSchedule.test.ts`

- [ ] **Step 1: Failing Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  depreciationYearly,
  depreciationProratedInAcquisitionYear,
} from '@/lib/calculations/depreciationCalculator';
import {
  degressiveEligibilityWarning,
  depreciationEndYear,
  depreciationForYear,
  depreciationSchedule,
  isValidSwitchYear,
  optimalSwitchYear,
  parseDepreciationMethod,
  switchState,
  type DepreciationPlanInput,
} from '@/lib/calculations/depreciationSchedule';

function plan(overrides: Partial<DepreciationPlanInput> = {}): DepreciationPlanInput {
  return {
    basis: 300_000,
    method: 'degressiv_5a',
    linearRate: 0.03,
    economicTransferDate: makeDate(2026, 1, 1),
    switchYear: null,
    ...overrides,
  };
}

describe('depreciationSchedule: linear', () => {
  it('Basis × Satz pro Jahr, letztes Jahr nur der Rest, danach 0', () => {
    const input = plan({ method: 'linear' });
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 9_000, bookValueEnd: 291_000, phase: 'linear' });
    expect(depreciationForYear(input, 2058)!.amount).toBeCloseTo(9_000, 6);
    expect(depreciationForYear(input, 2059)).toMatchObject({ amount: expect.closeTo(3_000, 6), bookValueEnd: 0 });
    expect(depreciationForYear(input, 2060)!.amount).toBe(0);
  });

  it('entspricht der bisherigen Berechnung (Erwerbsjahr anteilig, danach voller Jahresbetrag)', () => {
    const input = plan({
      method: 'linear',
      basis: f.afaBasis,
      linearRate: f.depreciationRate,
      economicTransferDate: f.economicTransferDate,
    });
    expect(depreciationForYear(input, 2026)!.amount).toBeCloseTo(
      depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, f.economicTransferDate),
      6
    );
    expect(depreciationForYear(input, 2030)!.amount).toBeCloseTo(depreciationYearly(f.afaBasis, f.depreciationRate), 6);
  });
});

describe('depreciationSchedule: degressiv', () => {
  it('5 % vom Restwert, Erwerb im Januar', () => {
    const input = plan();
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 15_000, bookValueEnd: 285_000, phase: 'degressiv' });
    expect(depreciationForYear(input, 2027)).toMatchObject({ amount: 14_250, bookValueEnd: 270_750 });
    expect(depreciationForYear(input, 2028)).toMatchObject({ amount: 13_537.5, bookValueEnd: 257_212.5 });
  });

  it('Erwerb im März: Erwerbsjahr 10/12, danach 5 % vom Rest', () => {
    const input = plan({ economicTransferDate: makeDate(2026, 3, 1) });
    expect(depreciationForYear(input, 2026)!.amount).toBeCloseTo(12_500, 6);
    expect(depreciationForYear(input, 2026)!.bookValueEnd).toBeCloseTo(287_500, 6);
    expect(depreciationForYear(input, 2027)!.amount).toBeCloseTo(14_375, 6);
  });

  it('ohne Wechsel wird der Restwert nie vollständig abgeschrieben', () => {
    expect(depreciationEndYear(plan())).toBeNull();
    expect(depreciationForYear(plan(), 2060)!.bookValueEnd).toBeGreaterThan(0);
  });

  it('vor dem Erwerbsjahr gibt es keine AfA', () => {
    expect(depreciationForYear(plan(), 2025)).toBeNull();
  });

  it('Basis 0 ergibt überall 0', () => {
    const input = plan({ basis: 0 });
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 0, bookValueEnd: 0 });
    expect(depreciationForYear(input, 2040)!.amount).toBe(0);
  });
});

describe('depreciationSchedule: Wechsel zu linear', () => {
  const input = plan({ switchYear: 2040 });

  it('bis zum Vorjahr degressiv, ab dem Wechseljahr konstanter Betrag Restwert ÷ Restnutzungsdauer', () => {
    expect(depreciationForYear(input, 2039)!.phase).toBe('degressiv');
    const restwert = 300_000 * 0.95 ** 14;
    const expected = restwert / (100 / 3 - 14);
    const first = depreciationForYear(input, 2040)!;
    expect(first.phase).toBe('linear_nach_wechsel');
    expect(first.amount).toBeCloseTo(expected, 6);
    expect(first.amount).toBeCloseTo(7_567, 0);
    expect(depreciationForYear(input, 2050)!.amount).toBeCloseTo(expected, 6);
  });

  it('Restwert ist 2059 vollständig abgeschrieben, danach 0', () => {
    expect(depreciationEndYear(input)).toBe(2059);
    expect(depreciationForYear(input, 2059)!.bookValueEnd).toBe(0);
    expect(depreciationForYear(input, 2060)!.amount).toBe(0);
  });

  it('ein Wechseljahr im Erwerbsjahr wirkt wie das Folgejahr', () => {
    const a = depreciationSchedule(plan({ switchYear: 2026 }), 2035);
    const b = depreciationSchedule(plan({ switchYear: 2027 }), 2035);
    expect(a).toEqual(b);
  });
});

describe('optimalSwitchYear', () => {
  it('3 %: 2040 bei Erwerb im Januar und im März 2026', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.03 })).toBe(2040);
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 3, 1), linearRate: 0.03 })).toBe(2040);
  });

  it('Erwerb im Dezember: ein Jahr später (kaum Zeit im Erwerbsjahr vergangen)', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 12, 1), linearRate: 0.03 })).toBe(2041);
  });

  it('2 % und 2,5 %: längere Nutzungsdauer verschiebt den Wechsel', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.02 })).toBe(2057);
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.025 })).toBe(2047);
  });

  it('Satz 0 oder negativ: keine Empfehlung', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0 })).toBeNull();
  });

  it('der lineare Betrag ist im optimalen Jahr tatsächlich höher als der degressive, ein Jahr früher nicht', () => {
    const optimal = optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.03 })!;
    const linearAmount = (year: number) => depreciationForYear(plan({ switchYear: year }), year)!.amount;
    const degressiveAmount = (year: number) => depreciationForYear(plan(), year)!.amount;
    expect(linearAmount(optimal)).toBeGreaterThan(degressiveAmount(optimal));
    expect(linearAmount(optimal - 1)).toBeLessThan(degressiveAmount(optimal - 1));
  });
});

describe('isValidSwitchYear', () => {
  const transfer = makeDate(2026, 3, 1);
  it('muss eine ganze Zahl nach dem Erwerbsjahr sein, höchstens 60 Jahre danach', () => {
    expect(isValidSwitchYear(2027, transfer)).toBe(true);
    expect(isValidSwitchYear(2086, transfer)).toBe(true);
    expect(isValidSwitchYear(2026, transfer)).toBe(false);
    expect(isValidSwitchYear(2087, transfer)).toBe(false);
    expect(isValidSwitchYear(2040.5, transfer)).toBe(false);
    expect(isValidSwitchYear(Number.NaN, transfer)).toBe(false);
  });
});

describe('switchState', () => {
  it('ohne Plan: weit → fällig (Jahr −1 und Jahr) → überfällig', () => {
    expect(switchState({ currentYear: 2026, switchYear: null, optimalYear: 2040 })).toBe('weit');
    expect(switchState({ currentYear: 2038, switchYear: null, optimalYear: 2040 })).toBe('weit');
    expect(switchState({ currentYear: 2039, switchYear: null, optimalYear: 2040 })).toBe('faellig');
    expect(switchState({ currentYear: 2040, switchYear: null, optimalYear: 2040 })).toBe('faellig');
    expect(switchState({ currentYear: 2041, switchYear: null, optimalYear: 2040 })).toBe('ueberfaellig');
  });

  it('mit Plan: vorgemerkt bis zum Vorjahr, ab dem Wechseljahr aktiv', () => {
    expect(switchState({ currentYear: 2039, switchYear: 2040, optimalYear: 2040 })).toBe('vorgemerkt');
    expect(switchState({ currentYear: 2040, switchYear: 2040, optimalYear: 2040 })).toBe('aktiv');
    expect(switchState({ currentYear: 2045, switchYear: 2040, optimalYear: 2040 })).toBe('aktiv');
  });
});

describe('degressiveEligibilityWarning', () => {
  const ok = { yearBuilt: 2026, purchaseDate: makeDate(2026, 2, 10), economicTransferDate: makeDate(2026, 3, 1) };

  it('keine Warnung bei Neubau im Fertigstellungsjahr und Kaufvertrag im Zeitfenster', () => {
    expect(degressiveEligibilityWarning(ok)).toBeNull();
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: null })).toBeNull();
  });

  it('Baujahr vor 2023', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2015 })).toMatch(/nach 2022 fertiggestellt/);
  });

  it('Anschaffung nach dem Fertigstellungsjahr', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2024 })).toMatch(/Ende des Fertigstellungsjahres/);
  });

  it('Kaufvertrag außerhalb des Zeitfensters 1.10.2023 bis 30.9.2029', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2023, purchaseDate: makeDate(2023, 9, 30), economicTransferDate: makeDate(2023, 10, 1) })).toMatch(/Kaufvertrag/);
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2029, purchaseDate: makeDate(2029, 10, 1), economicTransferDate: makeDate(2029, 11, 1) })).toMatch(/Kaufvertrag/);
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2029, purchaseDate: makeDate(2029, 9, 30), economicTransferDate: makeDate(2029, 11, 1) })).toBeNull();
  });
});

describe('parseDepreciationMethod', () => {
  it('unbekannte oder fehlende Werte gelten als linear', () => {
    expect(parseDepreciationMethod('degressiv_5a')).toBe('degressiv_5a');
    expect(parseDepreciationMethod('linear')).toBe('linear');
    expect(parseDepreciationMethod('')).toBe('linear');
    expect(parseDepreciationMethod(undefined as unknown as string)).toBe('linear');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `pnpm vitest run tests/calculations/depreciationSchedule.test.ts`
Expected: FAIL (`Failed to resolve import "@/lib/calculations/depreciationSchedule"`).

- [ ] **Step 3: Implementierung**

```ts
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
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm vitest run tests/calculations/depreciationSchedule.test.ts`
Expected: alle Tests PASS. Falls `optimalSwitchYear` bei 2,5 % abweicht (Gleitkomma), den Erwartungswert anhand der Rechnung `1/0.025 − 20` und der Schleife prüfen und die Implementierung nicht verbiegen, sondern den Fehler melden.

- [ ] **Step 5: Commit**

```bash
git add lib/calculations/depreciationSchedule.ts tests/calculations/depreciationSchedule.test.ts
git commit -m "feat(afa): Rechenkern für degressive AfA mit Wechsel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `depreciationAmountYear` im Steuerrechner

**Files:**
- Modify: `lib/calculations/taxCalculator.ts` (Interfaces `AnnualTaxableIncomeInput`, `TaxScenarioInput`; `annualTaxableIncomeBreakdown`; `taxLineItemsForScenario`)
- Test: `tests/calculations/taxCalculator.test.ts` (am Dateiende anfügen)

- [ ] **Step 1: Failing Tests ans Dateiende von `tests/calculations/taxCalculator.test.ts` anfügen**

```ts
describe('taxCalculator depreciationAmountYear', () => {
  const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
  const breakdownInput = {
    ...baseInput,
    year: 2026,
    statusHistory: history,
    today: makeDate(2026, 12, 31),
    extraordinaryCostsDeductibleYearly: 0,
  };

  it('ohne das Feld bleibt die bisherige AfA unverändert (Erwerbsjahr anteilig)', () => {
    const result = annualTaxableIncomeBreakdown(breakdownInput);
    expect(result.depreciation).toBeCloseTo((f.afaBasis * f.depreciationRate / 12) * 11, 6);
  });

  it('mit dem Feld ersetzt der Wert die AfA, auch im Erwerbsjahr', () => {
    const legacy = annualTaxableIncomeBreakdown(breakdownInput);
    const overridden = annualTaxableIncomeBreakdown({ ...breakdownInput, depreciationAmountYear: 5_000 });
    expect(overridden.depreciation).toBe(5_000);
    expect(overridden.taxableIncome - legacy.taxableIncome).toBeCloseTo(legacy.depreciation - 5_000, 6);
  });

  it('ein Jahr ohne Eigentumsmonate bleibt komplett 0, das Feld wird ignoriert', () => {
    const result = annualTaxableIncomeBreakdown({ ...breakdownInput, year: 2025, depreciationAmountYear: 5_000 });
    expect(result.depreciation).toBe(0);
  });

  it('Prognose-Szenario: Feld ersetzt afaBasis × Satz', () => {
    const scenario: Omit<TaxScenarioInput, 'scenario' | 'year'> = {
      coldRentMonthly: f.coldRentMonthly,
      parkingRentMonthly: f.parkingRentMonthly,
      loanStartDate: f.loanStartDate,
      loanAmount: f.loanAmount,
      interestRate: f.interestRate,
      monthlyMortgage: f.monthlyMortgage,
      afaBasis: f.afaBasis,
      depreciationRate: f.depreciationRate,
      hoaUnitNonRecoverableMonthly: 125.0,
      hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
      hoaParkingNonRecoverableMonthly: 0,
      hoaParkingRecoverableMonthly: 0,
      propertyTaxUnitMonthly: f.propertyTaxMonthly,
      propertyTaxParkingMonthly: 0,
      propertyManagementMonthly: f.propertyManagementMonthly,
      propertyInsuranceMonthly: 0,
      otherCostsMonthly: 0,
    };
    const legacy = taxLineItemsForScenario({ ...scenario, scenario: 'vollvermietung', year: 2030 });
    const overridden = taxLineItemsForScenario({ ...scenario, scenario: 'vollvermietung', year: 2030, depreciationAmountYear: 4_000 });
    expect(overridden.depreciation).toBe(4_000);
    expect(overridden.taxableIncome - legacy.taxableIncome).toBeCloseTo(legacy.depreciation - 4_000, 6);
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `pnpm vitest run tests/calculations/taxCalculator.test.ts`
Expected: FAIL in den neuen Tests (`overridden.depreciation` ist nicht 5000 bzw. TS ignoriert das unbekannte Feld).

- [ ] **Step 3: Implementierung**

In `lib/calculations/taxCalculator.ts` beide Interfaces (`AnnualTaxableIncomeInput` und `TaxScenarioInput`) um das Feld erweitern. Das Paar `afaBasis: number;` + `depreciationRate: number;` kommt in beiden Interfaces vor; ersetze beide Vorkommen (Edit mit `replace_all`):

```ts
  afaBasis: number;
  depreciationRate: number;
  /**
   * Optional and additive: wenn gesetzt, ist dies die AfA für `year` (bereits für das Erwerbsjahr
   * anteilig, z. B. aus depreciationSchedule) und ersetzt die Formel `afaBasis × depreciationRate`.
   * Fehlt das Feld, ist das Verhalten byte-identisch zu vorher (lineare AfA).
   */
  depreciationAmountYear?: number;
```

In `annualTaxableIncomeBreakdown` die Zeilen

```ts
  const afaYear = isAcquisitionYear
    ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
    : input.afaBasis * input.depreciationRate;
```

ersetzen durch:

```ts
  const afaYear =
    input.depreciationAmountYear !== undefined
      ? input.depreciationAmountYear
      : isAcquisitionYear
        ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
        : input.afaBasis * input.depreciationRate;
```

In `taxLineItemsForScenario` die Zeile

```ts
  const depreciation = depreciationYearly(input.afaBasis, input.depreciationRate);
```

ersetzen durch:

```ts
  const depreciation = input.depreciationAmountYear ?? depreciationYearly(input.afaBasis, input.depreciationRate);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm vitest run tests/calculations/taxCalculator.test.ts && pnpm tsc --noEmit`
Expected: alle PASS, keine TS-Fehler.

- [ ] **Step 5: Commit**

```bash
git add lib/calculations/taxCalculator.ts tests/calculations/taxCalculator.test.ts
git commit -m "feat(tax): optionales depreciationAmountYear im Steuerrechner

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `propertyDepreciation` und Anbindung an Steuer und Summary

**Files:**
- Create: `lib/data/propertyDepreciation.ts`
- Modify: `lib/data/propertyTax.ts` (in `computeTaxCurrentYear` und `computeTaxForecastYear`), `lib/data/propertySummary.ts` (Aufruf `annualTaxableIncome`)
- Test: `tests/data/propertyDepreciation.test.ts` (neu), `tests/data/propertyTax.test.ts` (Tests anfügen)

- [ ] **Step 1: Failing Test `tests/data/propertyDepreciation.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import {
  buildAfaCardModel,
  buildSwitchPreview,
  depreciationAmountOverride,
  propertyAfaBasis,
} from '@/lib/data/propertyDepreciation';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    purchase_price_unit: 300_000,
    purchase_price_parking: 0,
    land_transfer_tax: 0,
    notary_costs: 0,
    land_registry_costs: 0,
    agent_fee: 0,
    appraisal_costs: 0,
    building_value: 300_000,
    renovation_afa_eligible: 0,
    depreciation_rate: 0.03,
    depreciation_method: 'degressiv_5a',
    degressive_switch_year: null,
    economic_transfer_date: '2026-01-01',
    marginal_tax_rate: 0.42,
    ...overrides,
  } as unknown as PropertyRow;
}

describe('propertyAfaBasis', () => {
  it('ist Gebäudewert + anteilige Nebenkosten + Renovierung', () => {
    expect(propertyAfaBasis(makeProperty())).toBe(300_000);
    expect(propertyAfaBasis(makeProperty({ building_value: 240_000, notary_costs: 5_000 }))).toBeCloseTo(240_000 + 5_000 * 0.8, 6);
  });
});

describe('depreciationAmountOverride', () => {
  it('lineare Objekte liefern undefined (bisheriger Rechenweg bleibt aktiv)', () => {
    expect(depreciationAmountOverride(makeProperty({ depreciation_method: 'linear' }), 300_000, 2027)).toBeUndefined();
  });

  it('degressive Objekte liefern den Plan-Betrag, vor dem Erwerbsjahr 0', () => {
    const property = makeProperty();
    expect(depreciationAmountOverride(property, 300_000, 2027)).toBeCloseTo(14_250, 6);
    expect(depreciationAmountOverride(property, 300_000, 2025)).toBe(0);
  });
});

describe('buildAfaCardModel', () => {
  it('degressiv, Wechsel noch weit weg (heute 2026)', () => {
    const model = buildAfaCardModel(makeProperty(), makeDate(2026, 6, 15));
    expect(model).toMatchObject({ method: 'degressiv_5a', year: 2026, amount: 15_000, bookValueEnd: 285_000, phase: 'degressiv' });
    expect(model.taxSaving).toBeCloseTo(6_300, 6);
    expect(model.switch).toMatchObject({ state: 'weit', optimalYear: 2040, switchYear: null });
    expect(model.outlook.endYear).toBeNull();
    expect(model.outlook.amountIn5Years).toBeCloseTo(300_000 * 0.95 ** 5 * 0.05, 6);
  });

  it('Zustände fällig, überfällig, vorgemerkt, aktiv', () => {
    expect(buildAfaCardModel(makeProperty(), makeDate(2039, 3, 1)).switch?.state).toBe('faellig');
    const overdue = buildAfaCardModel(makeProperty(), makeDate(2045, 3, 1));
    expect(overdue.switch?.state).toBe('ueberfaellig');
    expect(overdue.switch!.lostAmountThisYear).toBeGreaterThan(0);
    const planned = makeProperty({ degressive_switch_year: 2040 });
    expect(buildAfaCardModel(planned, makeDate(2030, 3, 1)).switch).toMatchObject({ state: 'vorgemerkt', switchYear: 2040 });
    const active = buildAfaCardModel(planned, makeDate(2041, 3, 1));
    expect(active.switch?.state).toBe('aktiv');
    expect(active.phase).toBe('linear_nach_wechsel');
    expect(active.outlook.endYear).toBe(2059);
  });

  it('linear: Restwert vorhanden, kein Wechsel-Thema', () => {
    const model = buildAfaCardModel(makeProperty({ depreciation_method: 'linear' }), makeDate(2026, 6, 15));
    expect(model).toMatchObject({ method: 'linear', amount: 9_000, bookValueEnd: 291_000, switch: null });
    expect(model.outlook.endYear).toBe(2059);
  });

  it('vor dem Erwerbsjahr: keine AfA, voller Restwert, keine Phase', () => {
    const model = buildAfaCardModel(makeProperty(), makeDate(2025, 6, 15));
    expect(model).toMatchObject({ amount: 0, bookValueEnd: 300_000, phase: null });
  });
});

describe('buildSwitchPreview', () => {
  it('vergleicht Wechseljahr, +5 und +10 Jahre mit und ohne Wechsel', () => {
    const preview = buildSwitchPreview(makeProperty(), 2040);
    expect(preview.rows.map((row) => row.year)).toEqual([2040, 2045, 2050]);
    expect(preview.rows[0].withoutSwitch).toBeCloseTo(7_315, 0);
    expect(preview.rows[0].withSwitch).toBeCloseTo(7_567, 0);
    expect(preview.rows[0].taxEffect).toBeCloseTo(106, 0);
    expect(preview.endYearWithout).toBeNull();
    expect(preview.endYearWith).toBe(2059);
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `pnpm vitest run tests/data/propertyDepreciation.test.ts`
Expected: FAIL (Import nicht auflösbar).

- [ ] **Step 3: `lib/data/propertyDepreciation.ts` anlegen**

```ts
import type { Database } from '@/lib/supabase/types';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import {
  depreciationEndYear,
  depreciationForYear,
  optimalSwitchYear,
  parseDepreciationMethod,
  switchState,
  type DepreciationMethod,
  type DepreciationPhase,
  type DepreciationPlanInput,
  type SwitchState,
} from '@/lib/calculations/depreciationSchedule';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function propertyAfaBasis(property: PropertyRow): number {
  const purchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = closingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  return afaBasis(property.building_value, closingCosts, purchasePrice, property.renovation_afa_eligible);
}

/** `switchYearOverride`: undefined = gespeicherter Plan des Objekts, null = ohne Wechsel, Zahl = hypothetisches Wechseljahr. */
export function depreciationPlanFor(property: PropertyRow, basis: number, switchYearOverride?: number | null): DepreciationPlanInput {
  return {
    basis,
    method: parseDepreciationMethod(property.depreciation_method),
    linearRate: property.depreciation_rate,
    economicTransferDate: new Date(property.economic_transfer_date + 'T00:00:00Z'),
    switchYear: switchYearOverride !== undefined ? switchYearOverride : property.degressive_switch_year,
  };
}

/**
 * AfA-Betrag für die Steuerberechnung. undefined bei linearen Objekten, damit der bisherige
 * Rechenweg (`afaBasis × depreciationRate`) unverändert bleibt.
 */
export function depreciationAmountOverride(property: PropertyRow, basis: number, year: number): number | undefined {
  if (parseDepreciationMethod(property.depreciation_method) === 'linear') return undefined;
  return depreciationForYear(depreciationPlanFor(property, basis), year)?.amount ?? 0;
}

export interface AfaCardModel {
  method: DepreciationMethod;
  year: number;
  acquisitionYear: number;
  basis: number;
  linearRate: number;
  amount: number;
  taxSaving: number;
  bookValueEnd: number;
  phase: DepreciationPhase | null;
  outlook: { amountIn5Years: number; amountIn10Years: number; endYear: number | null };
  /** null bei Linear oder wenn keine Empfehlung berechenbar ist. */
  switch: null | { state: SwitchState; optimalYear: number; switchYear: number | null; lostAmountThisYear: number };
}

export function buildAfaCardModel(property: PropertyRow, today: Date): AfaCardModel {
  const basis = propertyAfaBasis(property);
  const plan = depreciationPlanFor(property, basis);
  const year = today.getUTCFullYear();
  const current = depreciationForYear(plan, year);
  const amount = current?.amount ?? 0;

  const optimalYear = plan.method === 'degressiv_5a' ? optimalSwitchYear(plan) : null;
  let switchInfo: AfaCardModel['switch'] = null;
  if (optimalYear !== null) {
    const withoutSwitch = depreciationForYear({ ...plan, switchYear: null }, year)?.amount ?? 0;
    const switchedNow = depreciationForYear({ ...plan, switchYear: year }, year)?.amount ?? 0;
    switchInfo = {
      state: switchState({ currentYear: year, switchYear: plan.switchYear, optimalYear }),
      optimalYear,
      switchYear: plan.switchYear,
      lostAmountThisYear: Math.max(switchedNow - withoutSwitch, 0),
    };
  }

  return {
    method: plan.method,
    year,
    acquisitionYear: plan.economicTransferDate.getUTCFullYear(),
    basis,
    linearRate: plan.linearRate,
    amount,
    taxSaving: amount * property.marginal_tax_rate,
    bookValueEnd: current?.bookValueEnd ?? basis,
    phase: current?.phase ?? null,
    outlook: {
      amountIn5Years: depreciationForYear(plan, year + 5)?.amount ?? 0,
      amountIn10Years: depreciationForYear(plan, year + 10)?.amount ?? 0,
      endYear: depreciationEndYear(plan),
    },
    switch: switchInfo,
  };
}

export interface SwitchPreviewRow {
  year: number;
  withoutSwitch: number;
  withSwitch: number;
  /** (mit − ohne) × Grenzsteuersatz */
  taxEffect: number;
}

export interface SwitchPreview {
  rows: SwitchPreviewRow[];
  endYearWithout: number | null;
  endYearWith: number | null;
}

export function buildSwitchPreview(property: PropertyRow, proposedYear: number): SwitchPreview {
  const basis = propertyAfaBasis(property);
  const without = depreciationPlanFor(property, basis, null);
  const withSwitch = depreciationPlanFor(property, basis, proposedYear);
  const rows = [0, 5, 10].map((offset) => {
    const year = proposedYear + offset;
    const a = depreciationForYear(without, year)?.amount ?? 0;
    const b = depreciationForYear(withSwitch, year)?.amount ?? 0;
    return { year, withoutSwitch: a, withSwitch: b, taxEffect: (b - a) * property.marginal_tax_rate };
  });
  return { rows, endYearWithout: depreciationEndYear(without), endYearWith: depreciationEndYear(withSwitch) };
}
```

- [ ] **Step 4: `lib/data/propertyTax.ts` anbinden**

Import ergänzen (nach der `computeAfaBasis`-Zeile):

```ts
import { depreciationAmountOverride } from '@/lib/data/propertyDepreciation';
```

In `computeTaxCurrentYear`, im Objekt für `annualTaxableIncomeBreakdown`, direkt nach `depreciationRate: property.depreciation_rate,` einfügen:

```ts
    depreciationAmountYear: depreciationAmountOverride(property, basis, year),
```

In `computeTaxForecastYear`, im Objekt `sharedInput`, direkt nach `depreciationRate: property.depreciation_rate,` einfügen:

```ts
    depreciationAmountYear: depreciationAmountOverride(property, basis, year),
```

(`depreciationRate: property.depreciation_rate,` kommt in dieser Datei zweimal vor, einmal je Funktion; beide Stellen einzeln mit Kontext editieren.)

- [ ] **Step 5: `lib/data/propertySummary.ts` anbinden**

Import ergänzen:

```ts
import { depreciationAmountOverride } from '@/lib/data/propertyDepreciation';
```

Im Aufruf `annualTaxableIncome({ ... })` direkt nach `depreciationRate: property.depreciation_rate,` einfügen:

```ts
    depreciationAmountYear: depreciationAmountOverride(property, basis, currentYear),
```

- [ ] **Step 6: Integrations-Tests an `tests/data/propertyTax.test.ts` anfügen**

```ts
describe('degressive AfA in computeTaxCurrentYear / computeTaxForecastYear', () => {
  const statusEntries = [makeStatusEntry()];
  const degressive = makeProperty({ depreciation_method: 'degressiv_5a', depreciation_rate: 0.03 });

  it('Erwerbsjahr 2026 (Übergang Februar): 5 % × 11/12 der Basis', () => {
    const result = computeTaxCurrentYear(degressive, statusEntries, [], makeDate(2026, 6, 15));
    expect(result.lineItems.depreciation).toBeCloseTo((f.afaBasis * 0.05 * 11) / 12, 0);
  });

  it('Folgejahr 2027: 5 % vom Restwert nach dem Erwerbsjahr', () => {
    const result = computeTaxCurrentYear(degressive, statusEntries, [], makeDate(2027, 6, 15));
    expect(result.lineItems.depreciation).toBeCloseTo(f.afaBasis * (1 - (0.05 * 11) / 12) * 0.05, 0);
  });

  it('Jahresübersicht (yearOverride) und Prognose nutzen denselben Plan', () => {
    const today = makeDate(2026, 6, 15);
    const pastOrCurrent = computeTaxCurrentYear(degressive, statusEntries, [], today, undefined, [], 2027);
    const forecast = computeTaxForecastYear(degressive, 2027, 0);
    expect(forecast.lineItems.depreciation).toBeCloseTo(pastOrCurrent.lineItems.depreciation, 6);
  });

  it('lineare Objekte rechnen unverändert (Basis × Satz)', () => {
    const linear = makeProperty({ depreciation_method: 'linear' });
    const result = computeTaxCurrentYear(linear, statusEntries, [], makeDate(2027, 6, 15));
    expect(result.lineItems.depreciation).toBeCloseTo(f.afaBasis * linear.depreciation_rate, 0);
  });

  it('nach dem geplanten Wechsel wird linear vom eingefrorenen Restwert abgeschrieben', () => {
    const switched = makeProperty({ depreciation_method: 'degressiv_5a', depreciation_rate: 0.03, degressive_switch_year: 2040 });
    const at2039 = computeTaxForecastYear(switched, 2039, 0).lineItems.depreciation;
    const at2040 = computeTaxForecastYear(switched, 2040, 0).lineItems.depreciation;
    const at2041 = computeTaxForecastYear(switched, 2041, 0).lineItems.depreciation;
    expect(at2040).toBeGreaterThan(at2039);
    expect(at2041).toBeCloseTo(at2040, 6);
  });
});
```

- [ ] **Step 7: Tests und Typen prüfen**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: alle Tests PASS (bisherige 603 + neue), keine TS-Fehler.

- [ ] **Step 8: Commit**

```bash
git add lib/data/propertyDepreciation.ts lib/data/propertyTax.ts lib/data/propertySummary.ts tests/data
git commit -m "feat(afa): AfA-Plan in Steuerberechnung und Summary einbinden

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Wizard-Logik und Edit-Mapping

**Files:**
- Modify: `lib/wizard/wizardLogic.ts` (Interface `WizardFormValues`, `makeWizardDefaultValues`, `mapToPropertyInsert`)
- Modify: `lib/wizard/propertyEditLogic.ts` (Mapping der Row in die Formularwerte, um Zeile 91)
- Test: `tests/wizard/wizardLogic.test.ts`

- [ ] **Step 1: Failing Tests an `tests/wizard/wizardLogic.test.ts` anfügen**

```ts
describe('degressive AfA fields', () => {
  it('defaults to linear without a switch year', () => {
    const values = makeWizardDefaultValues(today);
    expect(values.depreciationMethod).toBe('linear');
    expect(values.degressiveSwitchYear).toBeNull();
  });

  it('maps method and switch year to the property insert for degressiv_5a', () => {
    const insert = mapToPropertyInsert(makeValues({ depreciationMethod: 'degressiv_5a', degressiveSwitchYear: 2040 }));
    expect(insert.depreciation_method).toBe('degressiv_5a');
    expect(insert.degressive_switch_year).toBe(2040);
  });

  it('drops the switch year for linear properties', () => {
    const insert = mapToPropertyInsert(makeValues({ depreciationMethod: 'linear', degressiveSwitchYear: 2040 }));
    expect(insert.depreciation_method).toBe('linear');
    expect(insert.degressive_switch_year).toBeNull();
  });

  it('turns an empty or NaN switch year into null', () => {
    expect(mapToPropertyInsert(makeValues({ depreciationMethod: 'degressiv_5a', degressiveSwitchYear: Number.NaN })).degressive_switch_year).toBeNull();
    expect(mapToPropertyInsert(makeValues({ depreciationMethod: 'degressiv_5a', degressiveSwitchYear: null })).degressive_switch_year).toBeNull();
  });
});
```

Und in `tests/wizard/propertyEditLogic.test.ts` im Block `describe('mapPropertyToEditFormValues', ...)` diesen Test ergänzen:

```ts
  it('maps the AfA method and switch year from the row', () => {
    const values = mapPropertyToEditFormValues(makeProperty({ depreciation_method: 'degressiv_5a', degressive_switch_year: 2040 }));
    expect(values.depreciationMethod).toBe('degressiv_5a');
    expect(values.degressiveSwitchYear).toBe(2040);
  });
```

- [ ] **Step 2: Test laufen lassen**

Run: `pnpm vitest run tests/wizard`
Expected: FAIL (Felder fehlen).

- [ ] **Step 3: `lib/wizard/wizardLogic.ts` erweitern**

Import oben (bei den anderen `@/lib/...`-Imports) ergänzen:

```ts
import type { DepreciationMethod } from '@/lib/calculations/depreciationSchedule';
```

In `WizardFormValues` unter `// Step 7: AfA & Steuer` nach `depreciationRate: number;` einfügen:

```ts
  depreciationMethod: DepreciationMethod;
  degressiveSwitchYear: number | null;
```

In `makeWizardDefaultValues` nach `depreciationRate: 0.02,` einfügen:

```ts
    depreciationMethod: 'linear',
    degressiveSwitchYear: null,
```

In `mapToPropertyInsert` nach `depreciation_rate: n(values.depreciationRate),` einfügen:

```ts
    depreciation_method: values.depreciationMethod,
    degressive_switch_year: values.depreciationMethod === 'degressiv_5a' ? nOrNull(values.degressiveSwitchYear) : null,
```

- [ ] **Step 4: `lib/wizard/propertyEditLogic.ts` erweitern**

Import ergänzen:

```ts
import { parseDepreciationMethod } from '@/lib/calculations/depreciationSchedule';
```

Nach `depreciationRate: property.depreciation_rate,` einfügen:

```ts
    depreciationMethod: parseDepreciationMethod(property.depreciation_method),
    degressiveSwitchYear: property.degressive_switch_year,
```

- [ ] **Step 5: Tests und Typen**

Run: `pnpm vitest run && pnpm tsc --noEmit`
Expected: alle PASS (auch der erschöpfende Round-Trip-Test in `propertyEditLogic.test.ts`), keine TS-Fehler.

- [ ] **Step 6: Commit**

```bash
git add lib/wizard tests/wizard
git commit -m "feat(wizard): AfA-Methode und Wechseljahr in Formularlogik

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `StepAfaSteuer` (Wizard und Edit)

**Files:**
- Modify: `components/wizard/steps/StepAfaSteuer.tsx`
- Test: `tests/components/StepAfaSteuer.test.tsx` (neu)

- [ ] **Step 1: Failing Test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepAfaSteuer } from '@/components/wizard/steps/StepAfaSteuer';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {} }: { overrides?: Partial<WizardFormValues> }) {
  const form = useForm<WizardFormValues>({
    defaultValues: {
      ...makeWizardDefaultValues(makeDate(2026, 7, 25)),
      purchasePriceUnit: 300_000,
      buildingValue: 240_000,
      landValue: 60_000,
      ...overrides,
    },
  });
  return (
    <FormProvider {...form}>
      <StepAfaSteuer />
    </FormProvider>
  );
}

describe('StepAfaSteuer degressive AfA', () => {
  it('zeigt bei Linear weder Wechseljahr noch Warnung und nennt den Restwert in der Zusammenfassung', () => {
    render(<Harness />);
    expect(screen.queryByLabelText(/Wechsel zu linear ab Jahr/)).not.toBeInTheDocument();
    expect(screen.getByText('Restwert Ende 2027')).toBeInTheDocument();
    expect(screen.getByLabelText(/AfA-Satz/)).toBeInTheDocument();
  });

  it('Umschalten auf Degressiv setzt den Satz auf 3 %, benennt ihn um und zeigt das Wechseljahr-Feld', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('AfA-Methode'), { target: { value: 'degressiv_5a' } });
    expect(screen.getByLabelText(/Linearer Satz \(nach Wechsel\)/)).toHaveValue(3);
    expect(screen.getByLabelText(/Wechsel zu linear ab Jahr/)).toBeInTheDocument();
    expect(screen.getByText(/Empfohlen: ab 2040/)).toBeInTheDocument();
  });

  it('„übernehmen" trägt das empfohlene Wechseljahr ein', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', depreciationRate: 0.03 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'übernehmen' }));
    expect(screen.getByLabelText(/Wechsel zu linear ab Jahr/)).toHaveValue(2040);
  });

  it('warnt weich, wenn das Baujahr vor 2023 liegt', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', yearBuilt: 2015 }} />);
    expect(screen.getByText(/nach 2022 fertiggestellt/)).toBeInTheDocument();
  });

  it('warnt, wenn das Wechseljahr nicht nach dem Erwerbsjahr liegt', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', degressiveSwitchYear: 2026 }} />);
    expect(screen.getByText(/Wechseljahr muss nach dem Erwerbsjahr/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `pnpm vitest run tests/components/StepAfaSteuer.test.tsx`
Expected: FAIL (Feld „AfA-Methode" existiert nicht).

- [ ] **Step 3: `StepAfaSteuer.tsx` anpassen**

Imports ersetzen/ergänzen (oben, anstelle der bisherigen depreciationCalculator-Zeile):

```tsx
import { PercentField } from '@/components/ui/PercentField';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection, FormWarning } from '@/components/ui/FormLayout';
import { afaBasis, valuationDeviation } from '@/lib/calculations/depreciationCalculator';
import {
  degressiveEligibilityWarning,
  depreciationForYear,
  isValidSwitchYear,
  optimalSwitchYear,
  parseDepreciationMethod,
  type DepreciationPlanInput,
} from '@/lib/calculations/depreciationSchedule';
```

Unter `safeNum` zwei Hilfen und Konstanten ergänzen:

```tsx
const DEFAULT_LINEAR_RATE_NEUBAU = 0.03;

const METHOD_OPTIONS = [
  ['linear', 'Linear'],
  ['degressiv_5a', 'Degressiv 5 % (§ 7 Abs. 5a EStG)'],
] as const;

function toUtcDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? null : date;
}
```

Den Komponentenkörper ersetzen (der Teil ab `export function StepAfaSteuer()` bis zur schließenden Klammer):

```tsx
export function StepAfaSteuer() {
  const { control, register, setValue } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const closingCosts = closingCostsTotal(
    safeNum(values.landTransferTax),
    safeNum(values.notaryCosts),
    safeNum(values.landRegistryCosts),
    safeNum(values.agentFee),
    safeNum(values.appraisalCosts)
  );
  const buildingValue = safeNum(values.buildingValue);
  const landValue = safeNum(values.landValue);
  const depreciationRate = safeNum(values.depreciationRate);

  const basis = afaBasis(buildingValue, closingCosts, purchasePrice, safeNum(values.renovationAfaEligible));
  const sumDeviation = valuationDeviation(buildingValue, landValue, purchasePrice);

  const method = parseDepreciationMethod(values.depreciationMethod ?? 'linear');
  const isDegressive = method === 'degressiv_5a';
  const transferDate = toUtcDate(values.economicTransferDate);
  const purchaseDate = toUtcDate(values.purchaseDate);
  const switchYear =
    typeof values.degressiveSwitchYear === 'number' && !Number.isNaN(values.degressiveSwitchYear) ? values.degressiveSwitchYear : null;
  const yearBuilt = typeof values.yearBuilt === 'number' && !Number.isNaN(values.yearBuilt) ? values.yearBuilt : null;

  const plan: DepreciationPlanInput | null = transferDate
    ? { basis, method, linearRate: depreciationRate, economicTransferDate: transferDate, switchYear }
    : null;
  const startYear = transferDate ? transferDate.getUTCFullYear() : null;
  const firstYear = plan && startYear !== null ? depreciationForYear(plan, startYear) : null;
  const secondYear = plan && startYear !== null ? depreciationForYear(plan, startYear + 1) : null;
  const optimalYear = plan && isDegressive ? optimalSwitchYear(plan) : null;

  const eligibilityWarning =
    isDegressive && transferDate && purchaseDate ? degressiveEligibilityWarning({ yearBuilt, purchaseDate, economicTransferDate: transferDate }) : null;
  const switchYearInvalid = isDegressive && switchYear !== null && transferDate !== null && !isValidSwitchYear(switchYear, transferDate);

  const months = transferDate ? 13 - (transferDate.getUTCMonth() + 1) : 0;
  const summaryRows =
    startYear !== null && firstYear && secondYear
      ? [
          { label: 'AfA-Bemessungsgrundlage', value: formatCurrency(basis) },
          { label: `AfA ${startYear} (${months} Monate)`, value: formatCurrency(firstYear.amount) },
          { label: `AfA ${startYear + 1}`, value: formatCurrency(secondYear.amount) },
          { label: `Restwert Ende ${startYear + 1}`, value: formatCurrency(secondYear.bookValueEnd) },
        ]
      : [{ label: 'AfA-Bemessungsgrundlage', value: formatCurrency(basis) }];

  return (
    <FormSection>
      <FormHint>
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (<BerechnungshilfeLink />) und sollten sich zum Kaufpreis
        addieren (Toleranz ±5 %).
      </FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="AfA & Steuer">
          <FormGrid>
            <BuildingShareFields
              purchasePrice={purchasePrice}
              buildingLabel={<>Gebäudewert (<BerechnungshilfeLink />)</>}
              landLabel={<>Grundstückswert (<BerechnungshilfeLink />)</>}
            />
            <SelectField
              label="AfA-Methode"
              name="depreciationMethod"
              register={register}
              options={METHOD_OPTIONS}
              registerOptions={{
                onChange: (event) => {
                  if (event.target.value === 'degressiv_5a') setValue('depreciationRate', DEFAULT_LINEAR_RATE_NEUBAU);
                },
              }}
            />
            <PercentField
              label={isDegressive ? 'Linearer Satz (nach Wechsel)' : 'AfA-Satz'}
              name="depreciationRate"
              control={control}
              required
              hint={isDegressive ? '3 % bei Neubau ab 2023' : '2 % ab 1925 · 2,5 % vor 1925 · 3 % Neubau ab 2023'}
            />
            {isDegressive && (
              <div className="sm:col-span-2">
                <TextField label="Wechsel zu linear ab Jahr (optional)" name="degressiveSwitchYear" register={register} type="number" />
                {optimalYear !== null && (
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    Empfohlen: ab {optimalYear}{' '}
                    <button
                      type="button"
                      onClick={() => setValue('degressiveSwitchYear', optimalYear, { shouldDirty: true })}
                      className="font-semibold text-accent underline hover:no-underline"
                    >
                      übernehmen
                    </button>
                  </p>
                )}
              </div>
            )}
            <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />
            {isDegressive && eligibilityWarning && (
              <div className="sm:col-span-2">
                <FormWarning>⚠ {eligibilityWarning}</FormWarning>
              </div>
            )}
            {switchYearInvalid && (
              <div className="sm:col-span-2">
                <FormWarning>⚠ Das Wechseljahr muss nach dem Erwerbsjahr liegen (höchstens 60 Jahre danach).</FormWarning>
              </div>
            )}
            {sumDeviation > 0.05 && (
              <div className="sm:col-span-2">
                <FormWarning>
                  ⚠ Gebäude + Grundstück ({formatCurrency(buildingValue + landValue)}) weicht {(sumDeviation * 100).toFixed(1)} % vom
                  Kaufpreis ab — Werte aus der Berechnungshilfe prüfen.
                </FormWarning>
              </div>
            )}
          </FormGrid>
        </FormCard>

        <CalcSummary
          className="self-start"
          rows={summaryRows}
          total={secondYear && startYear !== null ? { label: `AfA / Monat (${startYear + 1})`, value: formatCurrency(secondYear.amount / 12) } : undefined}
        />
      </div>
    </FormSection>
  );
}
```

Hinweis: `depreciationYearly` und `depreciationMonthly` werden im Step nicht mehr importiert (Import in Schritt 3 oben bereits ersetzt).

- [ ] **Step 4: Tests, Typen, Lint**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm lint`
Expected: alle Tests PASS, keine TS-Fehler, Lint ohne neue Fehler.

- [ ] **Step 5: Commit**

```bash
git add components/wizard/steps/StepAfaSteuer.tsx tests/components/StepAfaSteuer.test.tsx
git commit -m "feat(wizard): AfA-Methode, Wechseljahr und Restwert im Step AfA & Steuer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Server Action und AfA-Karte im Steuer-Tab

**Files:**
- Modify: `lib/data/propertyActions.ts`
- Create: `components/property/steuer/AfaCard.tsx`, `components/property/steuer/AfaSwitchPanel.tsx`
- Delete: `components/property/steuer/AfaBasisCard.tsx`
- Modify: `components/property/steuer/SteuerTab.tsx`
- Test: `tests/components/AfaCard.test.tsx` (neu)

- [ ] **Step 1: Server Action in `lib/data/propertyActions.ts` anfügen**

Import oben ergänzen:

```ts
import { isValidSwitchYear } from '@/lib/calculations/depreciationSchedule';
```

Ans Dateiende:

```ts
/**
 * Merkt das Wechseljahr zu linear vor (oder nimmt es mit `null` zurück). Nur für degressive Objekte;
 * das Jahr muss nach dem Erwerbsjahr liegen. Der Wechsel wirkt automatisch ab diesem Jahr (siehe depreciationSchedule).
 */
export async function setDegressiveSwitchYear(propertyId: string, year: number | null): Promise<void> {
  const supabase = await createClient();
  const { data: property, error: readError } = await supabase
    .from('properties')
    .select('economic_transfer_date, depreciation_method')
    .eq('id', propertyId)
    .maybeSingle();
  if (readError) throw readError;
  if (!property) throw new Error('Objekt nicht gefunden.');
  if (property.depreciation_method !== 'degressiv_5a') throw new Error('Ein Wechsel ist nur bei degressiver AfA möglich.');
  if (year !== null && !isValidSwitchYear(year, new Date(property.economic_transfer_date + 'T00:00:00Z'))) {
    throw new Error('Ungültiges Wechseljahr.');
  }

  const { error } = await supabase.from('properties').update({ degressive_switch_year: year }).eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath(`/properties/${propertyId}`, 'layout');
}
```

- [ ] **Step 2: Failing Komponenten-Test `tests/components/AfaCard.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';

const setDegressiveSwitchYear = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/data/propertyActions', () => ({
  setDegressiveSwitchYear: (...args: unknown[]) => setDegressiveSwitchYear(...args),
}));

import { AfaCard } from '@/components/property/steuer/AfaCard';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    purchase_price_unit: 300_000,
    purchase_price_parking: 0,
    land_transfer_tax: 0,
    notary_costs: 0,
    land_registry_costs: 0,
    agent_fee: 0,
    appraisal_costs: 0,
    building_value: 300_000,
    land_value: 60_000,
    renovation_afa_eligible: 0,
    depreciation_rate: 0.03,
    depreciation_method: 'degressiv_5a',
    degressive_switch_year: null,
    economic_transfer_date: '2026-01-01',
    marginal_tax_rate: 0.42,
    ...overrides,
  } as unknown as PropertyRow;
}

beforeEach(() => setDegressiveSwitchYear.mockClear());
afterEach(cleanup);

describe('AfaCard', () => {
  it('zeigt die vier Kennzahlen inklusive Restwert und Steuerersparnis', () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText('AfA 2026')).toBeInTheDocument();
    expect(screen.getByText('Steuerersparnis 2026')).toBeInTheDocument();
    expect(screen.getByText('Restwert Ende 2026')).toBeInTheDocument();
    expect(screen.getByText('Degressiv 5 %')).toBeInTheDocument();
  });

  it('weit: nur ein ruhiger Hinweis mit Link zum Vormerken, kein Button', () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText(/Wechsel zu linear empfohlen/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jetzt vormerken' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wechsel ab 2040 vormerken/ })).not.toBeInTheDocument();
  });

  it('fällig: Button öffnet das Vorschau-Feld, Bestätigen speichert das Wechseljahr', async () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2039, 3, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel ab 2040 vormerken' }));
    expect(screen.getByText(/ohne Wechsel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', 2040));
  });

  it('überfällig: Button wechselt ab dem laufenden Jahr', async () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2045, 3, 1)} />);
    expect(screen.getByText(/seit 2040 sinnvoll/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ab 2045 wechseln' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', 2045));
  });

  it('vorgemerkt: zeigt den Plan und lässt ihn zurücknehmen', async () => {
    render(<AfaCard property={makeProperty({ degressive_switch_year: 2040 })} today={makeDate(2030, 3, 1)} />);
    expect(screen.getByText(/Wechsel vorgemerkt: ab 2040/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', null));
  });

  it('aktiv: „Linear seit …" ohne Rückgängig', () => {
    render(<AfaCard property={makeProperty({ degressive_switch_year: 2040 })} today={makeDate(2041, 3, 1)} />);
    expect(screen.getAllByText(/Linear seit 2040/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Zurücknehmen' })).not.toBeInTheDocument();
  });

  it('linear: kein Wechsel-Thema, Restwert trotzdem sichtbar', () => {
    render(<AfaCard property={makeProperty({ depreciation_method: 'linear' })} today={makeDate(2026, 6, 15)} />);
    expect(screen.queryByText(/Wechsel/)).not.toBeInTheDocument();
    expect(screen.getByText('Restwert Ende 2026')).toBeInTheDocument();
    expect(screen.getByText(/Linear 3 %/)).toBeInTheDocument();
  });

  it('zeigt eine Fehlermeldung, wenn das Speichern fehlschlägt', async () => {
    setDegressiveSwitchYear.mockRejectedValueOnce(new Error('boom'));
    render(<AfaCard property={makeProperty()} today={makeDate(2039, 3, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel ab 2040 vormerken' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    expect(await screen.findByText(/Speichern fehlgeschlagen/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Test laufen lassen**

Run: `pnpm vitest run tests/components/AfaCard.test.tsx`
Expected: FAIL (`AfaCard` existiert nicht).

- [ ] **Step 4: `components/property/steuer/AfaSwitchPanel.tsx` anlegen**

```tsx
'use client';

import { useState } from 'react';
import { buildSwitchPreview } from '@/lib/data/propertyDepreciation';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function AfaSwitchPanel({
  property,
  initialYear,
  minYear,
  maxYear,
  optimalYear,
  pending,
  onConfirm,
  onCancel,
}: {
  property: PropertyRow;
  initialYear: number;
  minYear: number;
  maxYear: number;
  optimalYear: number;
  pending: boolean;
  onConfirm: (year: number) => void;
  onCancel: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  const preview = buildSwitchPreview(property, year);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  return (
    <div className="mt-3 rounded-xl border border-black/[0.12] bg-white px-4 py-3.5">
      <p className="mb-2.5 text-[13px] font-bold text-text-primary">
        Wechsel zu linear vormerken ab{' '}
        <select
          aria-label="Wechseljahr"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="rounded-lg border border-black/[0.12] bg-white px-2 py-1 text-[13px] font-semibold"
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
              {option === optimalYear ? ' (empfohlen)' : ''}
            </option>
          ))}
        </select>
      </p>

      <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-[12px] tabular-nums">
        <span />
        <span className="text-[11px] text-text-dim">ohne Wechsel</span>
        <span className="text-[11px] text-text-dim">mit Wechsel</span>
        <span className="text-[11px] text-text-dim">Wirkung</span>
        {preview.rows.map((row) => (
          <Row key={row.year} year={row.year} without={row.withoutSwitch} withSwitch={row.withSwitch} taxEffect={row.taxEffect} />
        ))}
        <span className="text-text-secondary">AfA endet</span>
        <span>{preview.endYearWithout ?? 'nicht vollständig'}</span>
        <span>{preview.endYearWith ?? '–'}</span>
        <span />
      </div>

      <p className="my-3 text-[11.5px] leading-relaxed text-text-secondary">
        Volta übernimmt den Wechsel automatisch, sobald {year} erreicht ist. Bis dahin kannst du ihn ändern oder zurücknehmen.
        Hinweis: Steuerlich ist der Wechsel nicht umkehrbar, sobald du ihn in einer Steuererklärung angewendet hast.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onConfirm(year)}
          className="rounded-[9px] bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          Wechsel vormerken
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[9px] border border-black/[0.12] bg-white px-3.5 py-2 text-[12.5px] text-text-secondary"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function Row({ year, without, withSwitch, taxEffect }: { year: number; without: number; withSwitch: number; taxEffect: number }) {
  return (
    <>
      <span className="text-text-secondary">AfA {year}</span>
      <span>{formatCurrency(without)}</span>
      <span>{formatCurrency(withSwitch)}</span>
      <span className={taxEffect >= 0 ? 'font-bold text-positive-strong' : 'font-bold text-negative'}>
        {taxEffect >= 0 ? '+' : ''}
        {formatCurrency(taxEffect)} Steuer
      </span>
    </>
  );
}
```

- [ ] **Step 5: `components/property/steuer/AfaCard.tsx` anlegen**

```tsx
'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { buildAfaCardModel, type AfaCardModel } from '@/lib/data/propertyDepreciation';
import { setDegressiveSwitchYear } from '@/lib/data/propertyActions';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { SwitchState } from '@/lib/calculations/depreciationSchedule';
import type { Database } from '@/lib/supabase/types';
import { AfaSwitchPanel } from './AfaSwitchPanel';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const BANNER_TONE: Record<SwitchState, string> = {
  weit: 'border-slate-200 bg-slate-50 text-slate-600',
  faellig: 'border-amber-300 bg-amber-50 text-amber-900',
  ueberfaellig: 'border-amber-300 bg-amber-50 text-amber-900',
  vorgemerkt: 'border-blue-200 bg-blue-50 text-blue-900',
  aktiv: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

const PRIMARY_BUTTON = 'whitespace-nowrap rounded-[9px] bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white';
const LINK_BUTTON = 'text-[12px] font-semibold text-accent underline hover:no-underline';

function percentLabel(rate: number): string {
  return `${(rate * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;
}

function methodLabel(model: AfaCardModel): string {
  if (model.method === 'linear') return `Linear ${percentLabel(model.linearRate)}`;
  if (model.switch?.state === 'aktiv') return `Linear (seit ${model.switch.switchYear})`;
  return 'Degressiv 5 %';
}

function amountSubline(model: AfaCardModel): string {
  switch (model.phase) {
    case 'degressiv':
      return '5 % vom Restwert';
    case 'linear_nach_wechsel':
      return 'Restwert ÷ Restnutzungsdauer';
    case 'linear':
      return `${percentLabel(model.linearRate)} der Basis`;
    default:
      return 'vor dem Erwerb';
  }
}

function KeyFigure({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] text-text-secondary">{label}</p>
      <p className="tabular-nums text-[15px] font-bold text-text-primary">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-dim">{sub}</p>
    </div>
  );
}

export function AfaCard({ property, today }: { property: PropertyRow; today: Date }) {
  const model = buildAfaCardModel(property, today);
  const [panelYear, setPanelYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(year: number | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setDegressiveSwitchYear(property.id, year);
        setPanelYear(null);
      } catch {
        setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      }
    });
  }

  const sw = model.switch;
  const minYear = Math.max(model.year, model.acquisitionYear + 1);
  const maxYear = Math.max(sw?.optimalYear ?? minYear, minYear) + 6;
  const yearsUntilOptimal = sw ? sw.optimalYear - model.year : 0;

  function banner(): ReactNode {
    if (!sw) return null;
    const tone = `mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug ${BANNER_TONE[sw.state]}`;
    switch (sw.state) {
      case 'aktiv':
        return (
          <div className={tone}>
            <span>
              ✓ <b>Linear seit {sw.switchYear}</b> · der geplante Wechsel wurde automatisch übernommen.
            </span>
          </div>
        );
      case 'vorgemerkt':
        return (
          <div className={tone}>
            <span>
              <b>Wechsel vorgemerkt: ab {sw.switchYear}</b> (in {sw.switchYear! - model.year} Jahren) · wird dann automatisch übernommen.
            </span>
            <span className="flex gap-3">
              <button type="button" className={LINK_BUTTON} onClick={() => setPanelYear(sw.switchYear)}>
                Ändern
              </button>
              <button type="button" className={`${LINK_BUTTON} text-text-secondary`} disabled={pending} onClick={() => save(null)}>
                Zurücknehmen
              </button>
            </span>
          </div>
        );
      case 'ueberfaellig':
        return (
          <div className={tone}>
            <span>
              <b>Der Wechsel wäre seit {sw.optimalYear} sinnvoll.</b> Linear hätte dieses Jahr {formatCurrency(sw.lostAmountThisYear)} mehr
              AfA gebracht (≈ {formatCurrency(sw.lostAmountThisYear * property.marginal_tax_rate)} Steuer).
            </span>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(model.year)}>
              Ab {model.year} wechseln
            </button>
          </div>
        );
      case 'faellig':
        return (
          <div className={tone}>
            <span>
              <b>{model.year === sw.optimalYear ? 'Dieses Jahr' : 'Nächstes Jahr'} ist der optimale Wechselzeitpunkt.</b> Ab {sw.optimalYear}{' '}
              bringt die lineare AfA mehr als die degressive.
            </span>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Wechsel ab {sw.optimalYear} vormerken
            </button>
          </div>
        );
      default:
        return (
          <div className={tone}>
            <span>
              Wechsel zu linear empfohlen <b>ab {sw.optimalYear}</b> · in {yearsUntilOptimal} Jahren
            </span>
            <button type="button" className={LINK_BUTTON} onClick={() => setPanelYear(sw.optimalYear)}>
              Jetzt vormerken
            </button>
          </div>
        );
    }
  }

  return (
    <Card className="py-[18px]">
      <SectionLabel>AfA</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3">
        <KeyFigure label={`AfA ${model.year}`} value={formatCurrency(model.amount)} sub={amountSubline(model)} />
        <KeyFigure
          label={`Steuerersparnis ${model.year}`}
          value={formatCurrency(model.taxSaving)}
          sub={`bei ${formatPercent(property.marginal_tax_rate)} Grenzsteuersatz`}
        />
        <KeyFigure label={`Restwert Ende ${model.year}`} value={formatCurrency(model.bookValueEnd)} sub={`von ${formatCurrency(model.basis)} Basis`} />
        <KeyFigure
          label="Methode"
          value={methodLabel(model)}
          sub={model.method === 'linear' ? '§ 7 Abs. 4 EStG' : '§ 7 Abs. 5a EStG'}
        />
      </div>

      {banner()}

      {panelYear !== null && sw && (
        <AfaSwitchPanel
          key={panelYear}
          property={property}
          initialYear={Math.max(panelYear, minYear)}
          minYear={minYear}
          maxYear={maxYear}
          optimalYear={sw.optimalYear}
          pending={pending}
          onConfirm={save}
          onCancel={() => setPanelYear(null)}
        />
      )}
      {error && <p className="mt-2 text-[12px] font-medium text-negative">{error}</p>}

      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-text-secondary">
        <span>
          AfA in 5 Jahren <b className="tabular-nums text-text-primary">{formatCurrency(model.outlook.amountIn5Years)}</b>
        </span>
        <span>
          in 10 Jahren <b className="tabular-nums text-text-primary">{formatCurrency(model.outlook.amountIn10Years)}</b>
        </span>
        <span>
          AfA endet <b className="tabular-nums text-text-primary">{model.outlook.endYear ?? '–'}</b>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3 border-t border-black/[0.07] pt-3.5">
        <Stat label="Grundstückswert" value={formatCurrency(property.land_value)} size="sm" />
        <Stat label="Gebäudewert" value={formatCurrency(property.building_value)} size="sm" />
        <Stat label="AfA-Bemessungsgrundlage" value={formatCurrency(model.basis)} size="sm" />
        <Stat label="Grenzsteuersatz" value={formatPercent(property.marginal_tax_rate)} size="sm" />
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Karte austauschen**

`components/property/steuer/SteuerTab.tsx`: Import `import { AfaBasisCard } from './AfaBasisCard';` ersetzen durch `import { AfaCard } from './AfaCard';` und `<AfaBasisCard property={property} />` durch `<AfaCard property={property} today={today} />`.

```bash
git rm components/property/steuer/AfaBasisCard.tsx
```

- [ ] **Step 7: Tests, Typen, Lint**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm lint`
Expected: alle Tests PASS, keine TS-Fehler, keine neuen Lint-Fehler.

Falls der Test „linear: kein Wechsel-Thema" an `queryByText(/Wechsel/)` scheitert, weil ein anderer Text „Wechsel" enthält, den Matcher auf `/Wechsel (zu linear|vorgemerkt)/` verengen. Der Test prüft nur, dass keine Wechsel-Zeile erscheint.

- [ ] **Step 8: Commit**

```bash
git add lib/data/propertyActions.ts components/property/steuer tests/components/AfaCard.test.tsx
git commit -m "feat(steuer): AfA-Karte mit Wechsel-Zeile und Vormerken

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README, Spec-Nachträge, Gesamtprüfung

**Files:**
- Modify: `README.md` (Roadmap-Abschnitt „Degressive AfA", Zeilen 46–47)
- Modify: `docs/superpowers/specs/2026-10-12-degressive-afa-design.md`

- [ ] **Step 1: README-Roadmap-Punkt ersetzen**

Den Block

```
**Degressive AfA**
Neben der linearen AfA optional degressive Abschreibung als Berechnungsvariante anbieten.
```

ersetzen durch:

```
**Degressive AfA – Rest**
Die degressive AfA (§ 7 Abs. 5a EStG) mit planbarem Wechsel zu linear ist umgesetzt. Offen: Sonder-AfA nach § 7b (Wirkung auf den Restwert), nachträgliche Herstellungskosten als Zeitreihe und die Übernahme der Methode im neu zu gestaltenden Investment-Rechner.
```

- [ ] **Step 2: Spec an zwei Umsetzungsentscheidungen angleichen**

In der Spec (`docs/superpowers/specs/2026-10-12-degressive-afa-design.md`):
1. Signatur `optimalSwitchYear(...): number;` ändern in `optimalSwitchYear(...): number | null; // null bei Satz ≤ 0`.
2. In Abschnitt „Out of Scope" die Zeile „Keine Prüfung des Kaufvertragsdatums (Volta erfasst es nicht); der Hinweis nennt die Bedingungen." ersetzen durch „Als Kaufvertragsdatum dient `purchase_date`; die Warnung prüft das Zeitfenster 1.10.2023–30.9.2029 gegen dieses Datum." und im Abschnitt 4 den Satz „oder der Übergang nach dem 30.9.2029 liegt" ersetzen durch „oder `purchase_date` außerhalb des Zeitfensters 1.10.2023–30.9.2029 liegt".

- [ ] **Step 3: Gesamtprüfung**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm lint`
Expected: alle Tests PASS (603 + neue), keine TS-Fehler, 0 Lint-Fehler.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-10-12-degressive-afa-design.md
git commit -m "docs: README-Roadmap und Spec an Umsetzung angleichen

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Nach der Umsetzung (nicht Teil der Tasks)

- Die Migration `20261012120000_degressive_afa.sql` muss auf die Supabase-Datenbank angewendet werden (z. B. `supabase db push`), **bevor** die App gegen diese Datenbank läuft: Wizard und Edit schreiben die neuen Spalten.
- Optisch im Browser prüfen (Steuer-Tab, Wizard-Step, Edit), sobald eine Datenbank mit der Migration erreichbar ist.

## Selbstprüfung gegen die Spec

- Datenmodell → Task 1. Rechenkern, Wechsel, Optimum, Eignungshinweis, Zustände → Task 2. Anbindung `depreciationAmountOverride` und Steuer/Prognose/Summary → Tasks 3–4. Wizard/Edit-Felder → Task 5, UI → Task 6. Steuer-Tab-Karte inkl. fünf Zustände, Vorschau, Ausblick, Server Action → Task 7. README/Spec-Nachtrag → Task 8.
- Typkonsistenz: `DepreciationPlanInput`, `DepreciationYear`, `SwitchState`, `AfaCardModel`, `SwitchPreview` werden in Task 2 bzw. 4 definiert und in 6–7 mit denselben Namen verwendet; `depreciationAmountYear` (Task 3) wird in Task 4 gesetzt; `depreciationMethod`/`degressiveSwitchYear` (Task 5) in Task 6 verwendet.
