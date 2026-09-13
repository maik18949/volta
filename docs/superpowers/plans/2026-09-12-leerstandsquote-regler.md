# Leerstandsquote-Regler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary Vollvermietung/Leerstand-Toggle in Steuer- und Cashflow-Tab durch einen einzigen Leerstandsquote-Regler (0–100 %), dessen Startwert immer berechnet wird (nie manuell eingegeben oder gespeichert), und der zwischen den beiden Tabs für das laufende Jahr synchron bleibt.

**Architecture:**
- Zwei neue Kennzahlen (`actualVacancyRate`, unverändert seit Kauf, und neu `actualVacancyRateYear`, nur laufendes Jahr) liefern die Default-Werte für die Regler — nichts wird in der DB gespeichert.
- Zwei neue reine Blend-Funktionen (`blendTaxLineItems`, `blendCashflowLineItems`) interpolieren linear zwischen den bereits bestehenden `'vollvermietung'`/`'leerstand'`-Szenario-Funktionen — mathematisch exakt, weil nur Einnahmen und leerstandsabhängige Kosten sich zwischen den Szenarien unterscheiden.
- `computeTaxCurrentYear` bekommt einen optionalen `leerstandQuoteOverride`-Parameter: ohne ihn (bestehende Aufrufer, z. B. Card 2) unverändertes Verhalten; mit ihm wird der Teil des Jahres ab dem laufenden Monat statt mit dem letzten bekannten Status mit der Regler-Quote geblendet.
- Cross-Tab-Synchronisation des "Laufendes Jahr"-Reglers läuft über einen URL-Query-Parameter (`?leerstand=`), den `PropertyTabNav` beim Tab-Wechsel mitgibt — kein DB-Feld, keine Server Action.

**Tech Stack:** Next.js App Router (Server Components + `'use client'` für Regler/Tabs), Supabase-generierte Typen, Vitest für Unit-Tests.

**Branch:** Diese Arbeit passiert auf einem eigenen Branch/Worktree, nicht auf `main` (siehe `git log`/`CLAUDE.md`-Konvention dieses Repos).

**Out of scope (bewusst verschoben):** Die Cashflow-Jahresübersicht (Card 2, `CashflowYearTable.tsx`) zeigt für Zukunftsjahre weiterhin die bestehende "⚠ muss noch gedacht werden"-Warnung. Das wird hier nicht angefasst.

---

## File Structure

| File | Change |
|---|---|
| `web/lib/data/propertyOverview.ts` | Modify — neue Kennzahl `actualVacancyRateYear` + Roh-Tageszahlen |
| `web/lib/calculations/kpiCalculator.ts` | Modify — `BenchmarkKpi`-Union + Threshold-Eintrag |
| `web/lib/kpiInfo.ts` | Modify — `KPI_INFO`-Eintrag |
| `web/lib/kpiCalculationText.ts` | Modify — neuer `switch`-Case |
| `web/components/property/KpiScale.tsx` | Modify — `AXIS_FORMAT`-Eintrag |
| `web/components/property/overview/ReturnsCard.tsx` | Modify — neue KPI-Zeile |
| `web/lib/calculations/taxCalculator.ts` | Modify — `blendTaxLineItems`, `annualTaxableIncomeBreakdown` mit Override-Feldern |
| `web/lib/calculations/cashflowCalculator.ts` | Modify — `blendCashflowLineItems` |
| `web/lib/data/propertyTax.ts` | Modify — `computeTaxCurrentYear` mit optionalem Override, `computeTaxForecastYear` von `scenario` auf `leerstandQuote` |
| `web/lib/data/propertyCashflow.ts` | Modify — `computeCashflowForecastMonth` von `scenario` auf `leerstandQuote` |
| `web/components/ui/QuoteSlider.tsx` | Create — wiederverwendbarer Regler mit Reset-Button |
| `web/components/property/steuer/CurrentYearSection.tsx` | Modify — Regler einbauen |
| `web/components/property/steuer/ForecastSection.tsx` | Modify — Toggle durch Regler ersetzen |
| `web/components/property/steuer/SteuerTab.tsx` | Modify — State/Wiring für beide Regler, URL-Param für "Laufendes Jahr" |
| `web/components/property/cashflow/ForecastMonthCard.tsx` | Modify — Toggle-Anzeige durch Read-only-Quote ersetzen |
| `web/components/property/cashflow/CashflowTab.tsx` | Modify — URL-Param lesen statt lokalem Szenario-State |
| `web/components/property/PropertyTabNav.tsx` | Modify — `leerstand`-Query-Param beim Tab-Wechsel mitgeben |
| Tests (siehe je Task) | Modify/Create |

---

## Task 1: Neue Kennzahl `actualVacancyRateYear`

**Files:**
- Modify: `web/lib/data/propertyOverview.ts`
- Test: `web/tests/data/propertyOverview.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Füge in `web/tests/data/propertyOverview.test.ts` (im bestehenden `describe`-Block, der `actualVacancyRate` testet) hinzu:

```ts
it('actualVacancyRateYear only counts leerstand days within the current calendar year', () => {
  const today = new Date('2026-09-12T00:00:00Z');
  const property = { ...baseProperty, economic_transfer_date: '2023-01-01' };
  // Ganzes Jahr 2026 bis heute leerstand, alle Vorjahre vermietet.
  const statusEntries = [
    makeStatusEntry({ status_date: '2023-01-01', status: 'vermietet' }),
    makeStatusEntry({ status_date: '2026-01-01', status: 'leerstand' }),
  ];
  const result = computeOverviewMetrics(property, statusEntries, [], baseSummary, today);
  // 2026: 1. Jan - 12. Sep = 255 Tage, alle leerstand -> Quote nahe 1.0
  expect(result.actualVacancyRateYear).not.toBeNull();
  expect(result.actualVacancyRateYear!).toBeCloseTo(1.0, 2);
  // Gesamtquote (seit 2023) bleibt klein, weil die Vorjahre vermietet waren.
  expect(result.actualVacancyRate!).toBeLessThan(0.3);
});

it('actualVacancyRateYear is null when there is no status history', () => {
  const today = new Date('2026-09-12T00:00:00Z');
  const property = { ...baseProperty, economic_transfer_date: '2023-01-01' };
  const result = computeOverviewMetrics(property, [], [], baseSummary, today);
  expect(result.actualVacancyRateYear).toBeNull();
});

it('actualVacancyRateYear clamps its window to economicTransferDate when acquired mid-year', () => {
  const today = new Date('2026-09-12T00:00:00Z');
  // Kauf erst im Juni 2026 -> Fenster beginnt am Kaufdatum, nicht am 1. Januar.
  const property = { ...baseProperty, economic_transfer_date: '2026-06-01' };
  const statusEntries = [makeStatusEntry({ status_date: '2026-06-01', status: 'vermietet' })];
  const result = computeOverviewMetrics(property, statusEntries, [], baseSummary, today);
  expect(result.actualVacancyRateYear).toBeCloseTo(0, 4);
});
```

Prüfe oben im Testfile, ob `makeStatusEntry`/`baseProperty`/`baseSummary` bereits als Fixtures existieren (sie werden in den bestehenden `actualVacancyRate`-Tests verwendet) — falls die Namen abweichen, an die tatsächlichen Fixture-Namen in der Datei anpassen, sonst unverändert übernehmen.

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/data/propertyOverview.test.ts -t "actualVacancyRateYear"`
Expected: FAIL — `result.actualVacancyRateYear` ist `undefined`, `OverviewMetrics` hat das Feld noch nicht.

- [ ] **Step 3: `OverviewMetrics` und `computeOverviewMetrics` erweitern**

In `web/lib/data/propertyOverview.ts`, Interface erweitern (nach `ownershipDaysSinceTransfer: number;` auf Zeile 42):

```ts
  ownershipDaysSinceTransfer: number;
  /** Wie actualVacancyRateYear, aber die Roh-Tageszahlen für die Berechnung-Anzeige im KPI-Info-Modal. */
  leerstandDaysThisYear: number;
  ownershipDaysThisYear: number;
  /** Tatsächliche Leerstandsquote nur für das laufende Kalenderjahr (ab 1. Januar oder Kaufdatum, falls später). */
  actualVacancyRateYear: number | null;
```

Im Funktionskörper, direkt nach der bestehenden Zeile 76/77 (`const { ownershipDays, leerstandDays } = ...` / `const actualVacancyRateValue = ...`) ergänzen:

```ts
  const { ownershipDays, leerstandDays } = ownershipAndVacancyDaysSinceTransfer(statusHistory, economicTransferDate, today);
  const actualVacancyRateValue = statusHistory.length === 0 ? null : actualVacancyRate(leerstandDays, ownershipDays);

  const startOfCurrentYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const yearWindowStart = economicTransferDate.getTime() > startOfCurrentYear.getTime() ? economicTransferDate : startOfCurrentYear;
  const { ownershipDays: ownershipDaysThisYear, leerstandDays: leerstandDaysThisYear } = ownershipAndVacancyDaysSinceTransfer(
    statusHistory,
    yearWindowStart,
    today
  );
  const actualVacancyRateYearValue = statusHistory.length === 0 ? null : actualVacancyRate(leerstandDaysThisYear, ownershipDaysThisYear);
```

Im `return`-Objekt (nach `ownershipDaysSinceTransfer: ownershipDays,` auf Zeile 171) ergänzen:

```ts
    ownershipDaysSinceTransfer: ownershipDays,
    leerstandDaysThisYear,
    ownershipDaysThisYear,
    actualVacancyRateYear: actualVacancyRateYearValue,
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/data/propertyOverview.test.ts`
Expected: PASS (alle Tests der Datei, inkl. der drei neuen)

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/data/propertyOverview.ts tests/data/propertyOverview.test.ts
git commit -m "feat(overview): add actualVacancyRateYear KPI scoped to the current calendar year

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Neue Kennzahl in UI/Info-System verdrahten

**Files:**
- Modify: `web/lib/calculations/kpiCalculator.ts`
- Modify: `web/lib/kpiInfo.ts`
- Modify: `web/lib/kpiCalculationText.ts`
- Modify: `web/components/property/KpiScale.tsx`
- Modify: `web/components/property/overview/ReturnsCard.tsx`
- Test: `web/tests/calculations/kpiCalculator.test.ts`
- Test: `web/tests/kpiCalculationText.test.ts`

- [ ] **Step 1: Failing Tests schreiben**

In `web/tests/calculations/kpiCalculator.test.ts`, im `benchmarkColor`-Testblock ergänzen:

```ts
it('benchmarkColor: actualVacancyRateYear thresholds', () => {
  expect(benchmarkColor('actualVacancyRateYear', 0.02)).toBe('green');
  expect(benchmarkColor('actualVacancyRateYear', 0.05)).toBe('orange');
  expect(benchmarkColor('actualVacancyRateYear', 0.1)).toBe('red');
});
```

In `web/tests/kpiCalculationText.test.ts` ergänzen:

```ts
it('actualVacancyRateYear: shows this-year leerstand days over this-year ownership days', () => {
  const overviewWithYear = { ...overview, actualVacancyRateYear: 0.25, leerstandDaysThisYear: 63, ownershipDaysThisYear: 252 };
  const text = kpiCalculationText('actualVacancyRateYear', property, summary, overviewWithYear);
  expect(text).toBe('63 Tage ÷ 252 Tage = 25,0 %');
});

it('actualVacancyRateYear: null when the KPI value itself is null', () => {
  const overviewWithoutYear = { ...overview, actualVacancyRateYear: null };
  expect(kpiCalculationText('actualVacancyRateYear', property, summary, overviewWithoutYear)).toBeNull();
});
```

Passe `formatPercent(0.25)`-Ausgabeformat an das tatsächliche Format von `formatPercent` in diesem Repo an, falls es nicht `25,0 %` sondern z. B. `25,00 %` ausgibt (in `web/lib/formatters.ts` nachsehen) — den erwarteten String entsprechend korrigieren.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/calculations/kpiCalculator.test.ts tests/kpiCalculationText.test.ts -t "actualVacancyRateYear"`
Expected: FAIL — TypeScript-Compile-Fehler oder `undefined`, weil `'actualVacancyRateYear'` noch kein gültiger `BenchmarkKpi` ist.

- [ ] **Step 3: `BenchmarkKpi`-Union und Threshold ergänzen**

In `web/lib/calculations/kpiCalculator.ts`, Zeile 102–110, Union erweitern:

```ts
export type BenchmarkKpi =
  | 'grossYield'
  | 'netYield'
  | 'cashOnCash'
  | 'eigenkapitalrendite'
  | 'kaufpreisfaktor'
  | 'dscr'
  | 'ltv'
  | 'actualVacancyRate'
  | 'actualVacancyRateYear';
```

Im `BENCHMARK_THRESHOLDS`-Objekt (Zeile 127–137), nach der `actualVacancyRate`-Zeile ergänzen:

```ts
  actualVacancyRate: { direction: 'lowerIsBetter', green: 0.03, orange: 0.08, domainMin: 0, domainMax: 0.2 },
  actualVacancyRateYear: { direction: 'lowerIsBetter', green: 0.03, orange: 0.08, domainMin: 0, domainMax: 0.2 },
```

- [ ] **Step 4: `KPI_INFO`-Eintrag ergänzen**

In `web/lib/kpiInfo.ts`, nach dem `actualVacancyRate`-Eintrag (vor der schließenden `};` auf Zeile 90) ergänzen:

```ts
  actualVacancyRateYear: {
    name: 'Tats. Leerstandsquote (Jahr)',
    formula: 'Leerstandstage im laufenden Jahr\n÷ Eigentumstage im laufenden Jahr',
    purpose:
      'Wie "Tatsächliche Leerstandsquote", aber nur für das laufende Kalenderjahr statt die gesamte Haltedauer — zeigt, wie dieses Jahr bisher konkret lief, unabhängig vom Durchschnitt vergangener Jahre. Speist den Leerstandsquote-Regler im Steuer-Tab.',
    goodWhen: 'Unter 3 % ist der Leerstand dieses Jahr gering. Über 8 % liegt deutlich über dem, was die meisten Kalkulationen einplanen.',
  },
```

- [ ] **Step 5: `kpiCalculationText`-Case ergänzen**

In `web/lib/kpiCalculationText.ts`, nach dem `case 'actualVacancyRate':`-Block (vor der schließenden `}` des `switch`) ergänzen:

```ts
    case 'actualVacancyRateYear': {
      if (overview.actualVacancyRateYear === null) return null;
      return `${overview.leerstandDaysThisYear} Tage ÷ ${overview.ownershipDaysThisYear} Tage = ${formatPercent(
        overview.actualVacancyRateYear
      )}`;
    }
```

- [ ] **Step 6: `AXIS_FORMAT` in `KpiScale.tsx` ergänzen**

In `web/components/property/KpiScale.tsx`, Zeile 16–25, nach `actualVacancyRate: formatPercent,` ergänzen:

```ts
  actualVacancyRate: formatPercent,
  actualVacancyRateYear: formatPercent,
```

- [ ] **Step 7: Tests laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/calculations/kpiCalculator.test.ts tests/kpiCalculationText.test.ts`
Expected: PASS. Danach zusätzlich `cd web && npx tsc --noEmit` laufen lassen — muss fehlerfrei sein (bestätigt, dass alle `Record<BenchmarkKpi, ...>`-Literale den neuen Union-Wert abdecken).

- [ ] **Step 8: Neue KPI-Zeile in `ReturnsCard.tsx`**

In `web/components/property/overview/ReturnsCard.tsx`, im `kpiRows`-Array (Zeile 53–102), nach dem `actualVacancyRate`-Eintrag ergänzen:

```ts
    {
      kpi: 'actualVacancyRate',
      label: 'Tats. Leerstandsquote',
      rawValue: overview.actualVacancyRate,
      formattedValue: overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–',
    },
    {
      kpi: 'actualVacancyRateYear',
      label: 'Tats. Leerstandsquote (Jahr)',
      rawValue: overview.actualVacancyRateYear,
      formattedValue: overview.actualVacancyRateYear !== null ? formatPercent(overview.actualVacancyRateYear) : '–',
    },
```

- [ ] **Step 9: Manuell im Browser prüfen**

Dev-Server starten (`npm run dev` im `web`-Ordner) und auf der Übersichtsseite einer Property mit Status-Verlauf prüfen, dass "Tats. Leerstandsquote (Jahr)" als neunte KPI-Zeile erscheint, einen Info-Button mit Formel/Berechnung hat und farblich korrekt eingestuft wird.

- [ ] **Step 10: Commit**

```bash
cd web && git add lib/calculations/kpiCalculator.ts lib/kpiInfo.ts lib/kpiCalculationText.ts components/property/KpiScale.tsx components/property/overview/ReturnsCard.tsx tests/calculations/kpiCalculator.test.ts tests/kpiCalculationText.test.ts
git commit -m "feat(overview): surface actualVacancyRateYear in ReturnsCard and the KPI info system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `blendTaxLineItems` (reine Blend-Funktion)

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`

- [ ] **Step 1: Failing Test schreiben**

In `web/tests/calculations/taxCalculator.test.ts`, neuen `describe`-Block anfügen:

```ts
describe('taxCalculator.blendTaxLineItems', () => {
  const scenarioBaseInput: Omit<TaxScenarioInput, 'scenario' | 'year'> = {
    coldRentMonthly: 800,
    parkingRentMonthly: 0,
    loanStartDate: makeDate(2020, 1, 1),
    loanAmount: 200000,
    interestRate: 0.03,
    monthlyMortgage: 900,
    afaBasis: 160000,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 100,
    hoaUnitRecoverableMonthly: 80,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 30,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 20,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
  };

  it('quote 0 equals the pure vollvermietung scenario', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 0);
    expect(blended.taxableIncome).toBeCloseTo(voll.taxableIncome, 6);
    expect(blended.income).toBeCloseTo(voll.income, 6);
  });

  it('quote 1 equals the pure leerstand scenario', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 1);
    expect(blended.taxableIncome).toBeCloseTo(leer.taxableIncome, 6);
    expect(blended.hoaRecoverableWE).toBeCloseTo(leer.hoaRecoverableWE, 6);
  });

  it('quote 0.2 linearly interpolates income and leerstand-only cost lines, leaves scenario-invariant lines untouched', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 0.2);
    expect(blended.income).toBeCloseTo(voll.income * 0.8, 6);
    expect(blended.hoaRecoverableWE).toBeCloseTo(leer.hoaRecoverableWE * 0.2, 6);
    expect(blended.interest).toBe(voll.interest);
    expect(blended.depreciation).toBe(voll.depreciation);
    expect(blended.hoaNonRecoverableWE).toBe(voll.hoaNonRecoverableWE);
    expect(blended.taxableIncome).toBeCloseTo(voll.taxableIncome * 0.8 + leer.taxableIncome * 0.2, 6);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts -t "blendTaxLineItems"`
Expected: FAIL — `blendTaxLineItems` existiert nicht.

- [ ] **Step 3: `blendTaxLineItems` implementieren**

In `web/lib/calculations/taxCalculator.ts`, nach der `annualTaxableIncome`-Funktion (nach Zeile 187) einfügen:

```ts
/**
 * Lineare Interpolation zwischen einem Vollvermietungs- und einem Leerstand-Szenario
 * für dieselbe (Jahr, Property)-Kombination. Exakt statt approximiert, weil sich beide
 * Szenarien in taxLineItemsForScenario nur bei `income`, `hoaRecoverableWE` und
 * `propertyTaxWE` unterscheiden — alle anderen Felder sind identisch und bleiben durch
 * die Interpolation unverändert. `quote` ist die angenommene Leerstandsquote (0 = immer
 * vollvermietet, 1 = immer leerstand).
 */
export function blendTaxLineItems(vollvermietung: TaxLineItems, leerstand: TaxLineItems, quote: number): TaxLineItems {
  const p = quote;
  return {
    income: vollvermietung.income * (1 - p) + leerstand.income * p,
    interest: vollvermietung.interest,
    depreciation: vollvermietung.depreciation,
    hoaNonRecoverableWE: vollvermietung.hoaNonRecoverableWE,
    insuranceWE: vollvermietung.insuranceWE,
    managementWE: vollvermietung.managementWE,
    otherCostsWE: vollvermietung.otherCostsWE,
    hoaRecoverableWE: vollvermietung.hoaRecoverableWE * (1 - p) + leerstand.hoaRecoverableWE * p,
    propertyTaxWE: vollvermietung.propertyTaxWE * (1 - p) + leerstand.propertyTaxWE * p,
    hoaNonRecoverableTE: vollvermietung.hoaNonRecoverableTE,
    hoaRecoverableTE: vollvermietung.hoaRecoverableTE,
    propertyTaxTE: vollvermietung.propertyTaxTE,
    extraordinaryCostsDeductible: vollvermietung.extraordinaryCostsDeductible,
    taxableIncome: vollvermietung.taxableIncome * (1 - p) + leerstand.taxableIncome * p,
  };
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS (alle Tests der Datei)

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/calculations/taxCalculator.ts tests/calculations/taxCalculator.test.ts
git commit -m "feat(tax): add blendTaxLineItems for quote-based vollvermietung/leerstand interpolation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `blendCashflowLineItems` (reine Blend-Funktion)

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`

- [ ] **Step 1: Failing Test schreiben**

In `web/tests/calculations/cashflowCalculator.test.ts` anfügen:

```ts
describe('cashflowCalculator.blendCashflowLineItems', () => {
  const scenarioBaseInput: Omit<CashflowScenarioInput, 'scenario'> = {
    coldRentMonthly: 800,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    monthlyMortgage: 480,
    hoaFeeNonRecoverableMonthly: 100,
    hoaFeeMaintenanceReserveMonthly: 0,
    hoaFeeRecoverableMonthly: 80,
    propertyTaxAnnual: 360,
    propertyInsuranceAnnual: 0,
    propertyManagementAnnual: 240,
    otherCostsMonthly: 0,
    hoaFeeParkingNonRecoverableMonthly: 0,
    hoaFeeParkingMaintenanceReserveMonthly: 0,
    hoaFeeParkingRecoverableMonthly: 0,
    propertyTaxParkingAnnual: 0,
    extraordinaryCostsThisMonth: 0,
  };

  it('quote 0 equals the pure vollvermietung scenario', () => {
    const voll = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung' });
    const leer = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand' });
    const blended = blendCashflowLineItems(voll, leer, 0);
    expect(blended.cashflowBeforeTax).toBeCloseTo(voll.cashflowBeforeTax, 6);
  });

  it('quote 1 equals the pure leerstand scenario', () => {
    const voll = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung' });
    const leer = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand' });
    const blended = blendCashflowLineItems(voll, leer, 1);
    expect(blended.cashflowBeforeTax).toBeCloseTo(leer.cashflowBeforeTax, 6);
  });

  it('quote 0.05 linearly interpolates income and leerstand-only cost lines, recomputes cashflowBeforeTax from the blended lines', () => {
    const voll = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung' });
    const leer = cashflowLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand' });
    const blended = blendCashflowLineItems(voll, leer, 0.05);
    expect(blended.income).toBeCloseTo(voll.income * 0.95, 6);
    expect(blended.hoaRecoverableWE).toBeCloseTo(leer.hoaRecoverableWE * 0.05, 6);
    expect(blended.mortgage).toBe(voll.mortgage);
    const expectedCashflow =
      blended.income -
      blended.mortgage -
      blended.hoaNonRecoverableWE -
      blended.maintenanceReserveWE -
      blended.insuranceWE -
      blended.managementWE -
      blended.otherCostsWE -
      blended.hoaRecoverableWE -
      blended.propertyTaxWE -
      blended.hoaNonRecoverableTE -
      blended.maintenanceReserveTE -
      blended.hoaRecoverableTE -
      blended.propertyTaxTE -
      blended.extraordinaryCosts;
    expect(blended.cashflowBeforeTax).toBeCloseTo(expectedCashflow, 6);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts -t "blendCashflowLineItems"`
Expected: FAIL — `blendCashflowLineItems` existiert nicht.

- [ ] **Step 3: `blendCashflowLineItems` implementieren**

In `web/lib/calculations/cashflowCalculator.ts`, nach `cashflowLineItemsForScenario` (nach Zeile 254) einfügen:

```ts
/**
 * Lineare Interpolation zwischen einem Vollvermietungs- und einem Leerstand-Szenario,
 * exakt aus demselben Grund wie taxCalculator.blendTaxLineItems: nur `income`,
 * `hoaRecoverableWE` und `propertyTaxWE` unterscheiden sich zwischen den beiden
 * Szenarien in cashflowLineItemsForScenario, der Rest ist identisch.
 */
export function blendCashflowLineItems(vollvermietung: CashflowLineItems, leerstand: CashflowLineItems, quote: number): CashflowLineItems {
  const p = quote;
  const items: Omit<CashflowLineItems, 'cashflowBeforeTax'> = {
    income: vollvermietung.income * (1 - p) + leerstand.income * p,
    mortgage: vollvermietung.mortgage,
    hoaNonRecoverableWE: vollvermietung.hoaNonRecoverableWE,
    maintenanceReserveWE: vollvermietung.maintenanceReserveWE,
    insuranceWE: vollvermietung.insuranceWE,
    managementWE: vollvermietung.managementWE,
    otherCostsWE: vollvermietung.otherCostsWE,
    hoaRecoverableWE: vollvermietung.hoaRecoverableWE * (1 - p) + leerstand.hoaRecoverableWE * p,
    propertyTaxWE: vollvermietung.propertyTaxWE * (1 - p) + leerstand.propertyTaxWE * p,
    hoaNonRecoverableTE: vollvermietung.hoaNonRecoverableTE,
    maintenanceReserveTE: vollvermietung.maintenanceReserveTE,
    hoaRecoverableTE: vollvermietung.hoaRecoverableTE,
    propertyTaxTE: vollvermietung.propertyTaxTE,
    extraordinaryCosts: vollvermietung.extraordinaryCosts,
  };
  return { ...items, cashflowBeforeTax: cashflowBeforeTaxFromLineItems(items) };
}
```

`cashflowBeforeTaxFromLineItems` ist bereits eine (nicht exportierte) Funktion weiter oben in derselben Datei — kein neuer Import nötig, da `blendCashflowLineItems` im selben Modul steht.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/calculations/cashflowCalculator.ts tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(cashflow): add blendCashflowLineItems for quote-based vollvermietung/leerstand interpolation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `computeTaxForecastYear` von `scenario` auf `leerstandQuote` umstellen

**Files:**
- Modify: `web/lib/data/propertyTax.ts`
- Modify: `web/tests/data/propertyTax.test.ts`

- [ ] **Step 1: Bestehende Tests anpassen (sie werden zunächst fehlschlagen)**

In `web/tests/data/propertyTax.test.ts`, im `describe('computeTaxForecastYear', ...)`-Block (ab Zeile 196), alle Aufrufe mit `scenario`-String durch eine Quote ersetzen:

```ts
describe('computeTaxForecastYear', () => {
  it('leerstandQuote 0: full annual income, no owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 0);
    // ... bestehende Assertions unverändert übernehmen ...
  });

  it('leerstandQuote 1: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 1);
    // ... bestehende Assertions unverändert übernehmen ...
  });

  it('depreciation is never acquisition-year-prorated', () => {
    const result = computeTaxForecastYear(property, 2035, 0);
    // ... bestehende Assertions unverändert übernehmen ...
  });

  it('taxEffectMonthly divides the yearly effect by 12 (always a full year)', () => {
    const result = computeTaxForecastYear(property, 2028, 0);
    // ... bestehende Assertions unverändert übernehmen ...
  });

  it('lineItems fields are individually wired correctly (insurance, other costs, management, and parking all nonzero)', () => {
    // ...
    const result = computeTaxForecastYear(withExtras, 2028, 0);
    // ... bestehende Assertions unverändert übernehmen ...
  });

  it('leerstandQuote 0.3 linearly blends between the two extremes', () => {
    const voll = computeTaxForecastYear(property, 2028, 0);
    const leer = computeTaxForecastYear(property, 2028, 1);
    const blended = computeTaxForecastYear(property, 2028, 0.3);
    expect(blended.taxEffectYearly).toBeCloseTo(voll.taxEffectYearly * 0.7 + leer.taxEffectYearly * 0.3, 2);
  });
});
```

Übernimm bei jedem `it`-Block die bereits vorhandenen `expect(...)`-Zeilen unverändert — nur der Funktionsaufruf ändert sich von `computeTaxForecastYear(property, 2028, 'vollvermietung')` zu `computeTaxForecastYear(property, 2028, 0)` (bzw. `1` für `'leerstand'`).

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts -t "computeTaxForecastYear"`
Expected: FAIL — Typfehler, weil `computeTaxForecastYear` noch `scenario: TaxScenarioChoice` erwartet, keine `number`.

- [ ] **Step 3: `computeTaxForecastYear` umbauen**

In `web/lib/data/propertyTax.ts`:

Import ergänzen (Zeile 5–11):

```ts
import {
  annualTaxableIncomeBreakdown,
  taxLineItemsForScenario,
  blendTaxLineItems,
  taxEffectYearly,
  taxEffectMonthly as computeTaxEffectMonthly,
  type TaxLineItems,
} from '@/lib/calculations/taxCalculator';
```

`TaxForecastYearResult`-Interface (Zeile 122–128) und Funktionssignatur (Zeile 131) ändern:

```ts
export interface TaxForecastYearResult {
  year: number;
  leerstandQuote: number;
  lineItems: TaxLineItems;
  taxEffectYearly: number;
  taxEffectMonthly: number;
}

/** Steuer tab Section 2 ("Prognose") — ein gewähltes Jahr + eine Leerstandsquote (0-1), kein Status-Verlauf. */
export function computeTaxForecastYear(property: PropertyRow, year: number, leerstandQuote: number): TaxForecastYearResult {
```

Den Funktionskörper zwischen `const basis = ...` (Zeile 153) und dem `return` (Zeile 180) ersetzen — statt eines einzelnen `taxLineItemsForScenario`-Aufrufs jetzt zwei Aufrufe + Blend:

```ts
  const sharedInput = {
    year,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
  };
  const vollvermietung = taxLineItemsForScenario({ ...sharedInput, scenario: 'vollvermietung' });
  const leerstand = taxLineItemsForScenario({ ...sharedInput, scenario: 'leerstand' });
  const lineItems = blendTaxLineItems(vollvermietung, leerstand, leerstandQuote);

  const taxEffectYear = taxEffectYearly(lineItems.taxableIncome, property.marginal_tax_rate);
  const taxEffectMonth = computeTaxEffectMonthly(taxEffectYear, 12);

  return { year, leerstandQuote, lineItems, taxEffectYearly: taxEffectYear, taxEffectMonthly: taxEffectMonth };
}
```

Entferne den nun ungenutzten `TaxScenarioChoice`-Typ NICHT — er wird von `taxLineItemsForScenario`/`taxLineItemsForScenario`'s `scenario`-Feld weiter intern verwendet und bleibt bestehen.

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS

Zusätzlich: `cd web && npx tsc --noEmit` — prüft, dass keine anderen Call-Sites von `computeTaxForecastYear` mit dem alten `scenario`-String übrig sind (der Compiler listet sie sonst als Fehler auf; als nächstes in Task 7 behoben).

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/data/propertyTax.ts tests/data/propertyTax.test.ts
git commit -m "refactor(tax): computeTaxForecastYear takes a leerstandQuote instead of a binary scenario

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `computeTaxCurrentYear` — optionaler Leerstandsquote-Override für den Rest des Jahres

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts`
- Modify: `web/lib/data/propertyTax.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`
- Test: `web/tests/data/propertyTax.test.ts`

- [ ] **Step 1: Failing Test schreiben (taxCalculator)**

In `web/tests/calculations/taxCalculator.test.ts`, im `describe('taxCalculator.annualTaxableIncomeBreakdown', ...)`-Block ergänzen:

```ts
it('without leerstandQuoteOverride*, behaves exactly as before (regression guard)', () => {
  const input = {
    year: 2026,
    statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet' as const, incomeActualMonthly: null }],
    economicTransferDate: makeDate(2023, 1, 1),
    loanStartDate: makeDate(2020, 1, 1),
    loanAmount: 200000,
    interestRate: 0.03,
    monthlyMortgage: 900,
    afaBasis: 160000,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 100,
    hoaUnitRecoverableMonthly: 80,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 30,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 20,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
    coldRentMonthly: 800,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    today: makeDate(2026, 9, 12),
    extraordinaryCostsDeductibleYearly: 0,
  };
  const withoutOverride = annualTaxableIncomeBreakdown(input);
  const withUndefinedOverride = annualTaxableIncomeBreakdown({ ...input, leerstandQuoteOverrideFromMonth: undefined, leerstandQuoteOverride: undefined });
  expect(withUndefinedOverride).toEqual(withoutOverride);
});

it('leerstandQuoteOverride blends only months from the given month onward, leaves earlier months as real Ist', () => {
  const input = {
    year: 2026,
    statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet' as const, incomeActualMonthly: null }],
    economicTransferDate: makeDate(2023, 1, 1),
    loanStartDate: makeDate(2020, 1, 1),
    loanAmount: 200000,
    interestRate: 0.03,
    monthlyMortgage: 900,
    afaBasis: 160000,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 100,
    hoaUnitRecoverableMonthly: 80,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 30,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 20,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
    coldRentMonthly: 800,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    today: makeDate(2026, 9, 12),
    extraordinaryCostsDeductibleYearly: 0,
  };
  const naive = annualTaxableIncomeBreakdown(input);
  const overridden = annualTaxableIncomeBreakdown({
    ...input,
    leerstandQuoteOverrideFromMonth: makeDate(2026, 9, 1),
    leerstandQuoteOverride: 1, // volle Leerstand-Annahme ab September
  });
  // Ab September (4 Monate: Sep-Dez) fällt die Miete komplett weg -> weniger Einnahmen als naiv (weiterhin vermietet).
  expect(overridden.income).toBeLessThan(naive.income);
  expect(overridden.income).toBeCloseTo(naive.income - 800 * 4, 2);
  // Zinsen/AfA sind vom Override unberührt.
  expect(overridden.interest).toBe(naive.interest);
  expect(overridden.depreciation).toBe(naive.depreciation);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts -t "leerstandQuoteOverride"`
Expected: FAIL — die neuen Input-Felder existieren noch nicht auf `AnnualTaxableIncomeBreakdownInput`.

- [ ] **Step 3: `annualTaxableIncomeBreakdown` erweitern**

In `web/lib/calculations/taxCalculator.ts`, `AnnualTaxableIncomeBreakdownInput`-Interface (Zeile 49–52) erweitern:

```ts
export interface AnnualTaxableIncomeBreakdownInput extends AnnualTaxableIncomeInput {
  /** Sum of extraordinary_costs.amount for the year where is_deductible = true. */
  extraordinaryCostsDeductibleYearly: number;
  /**
   * Wenn gesetzt: jeder Monat ab (einschließlich) diesem Datum verwendet
   * `leerstandQuoteOverride` als Leerstandsanteil statt der echten Status-Historie —
   * für "was wäre, wenn der Rest des Jahres X % Leerstand hätte" statt der naiven
   * Fortschreibung des letzten bekannten Status. Monate davor bleiben unverändert
   * Ist-basiert. Ohne dieses Feld ist das Verhalten byte-identisch zu vorher.
   */
  leerstandQuoteOverrideFromMonth?: Date;
  leerstandQuoteOverride?: number;
}
```

Im Funktionskörper von `annualTaxableIncomeBreakdown`, die Schleife (Zeile 106–133) ersetzen:

```ts
  for (const month of ownershipMonths) {
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    ownershipMonthEquivalent += ownerFraction;

    const useOverride =
      input.leerstandQuoteOverrideFromMonth !== undefined &&
      month.getTime() >= input.leerstandQuoteOverrideFromMonth.getTime();

    const leerstandFraction = useOverride
      ? input.leerstandQuoteOverride!
      : leerstandDayFraction(month, input.statusHistory, input.today);
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    const monthIncome = useOverride
      ? (input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly) * (1 - input.leerstandQuoteOverride!)
      : incomeForMonth(
          month,
          input.statusHistory,
          input.today,
          input.coldRentMonthly,
          input.parkingRentMonthly,
          input.otherIncomeMonthly
        );

    totalIncome += monthIncome * ownerFraction;
  }
```

Die restlichen Zeilen des KNOWN-LIMITATION-Kommentars (ursprünglich Zeilen 111-121) können bestehen bleiben oder entfallen — sie beschreiben ein bestehendes, unverändertes Verhalten des Nicht-Override-Pfads und müssen nur bei `useOverride === false` weiterhin zutreffen, was hier der Fall ist.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS

- [ ] **Step 5: `computeTaxCurrentYear` um optionalen Parameter erweitern**

Failing Test zuerst, in `web/tests/data/propertyTax.test.ts`, im `describe('computeTaxCurrentYear', ...)`-Block ergänzen:

```ts
it('leerstandQuoteOverride, when passed, changes the result vs. the default call', () => {
  const withoutOverride = computeTaxCurrentYear(property, statusEntries, [], today);
  const withOverride = computeTaxCurrentYear(property, statusEntries, [], today, 1);
  expect(withOverride.taxEffectMonthly).not.toBeCloseTo(withoutOverride.taxEffectMonthly, 2);
});

it('omitting leerstandQuoteOverride keeps the exact previous behavior', () => {
  const a = computeTaxCurrentYear(property, statusEntries, [], today);
  const b = computeTaxCurrentYear(property, statusEntries, [], today);
  expect(a).toEqual(b);
});
```

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts -t "leerstandQuoteOverride"` → Expected: FAIL (5. Parameter existiert noch nicht).

In `web/lib/data/propertyTax.ts`, Signatur von `computeTaxCurrentYear` (Zeile 45–50) erweitern:

```ts
export function computeTaxCurrentYear(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  today: Date = new Date(),
  leerstandQuoteOverride?: number
): TaxCurrentYearResult {
```

Im `annualTaxableIncomeBreakdown`-Aufruf (Zeile 77–101) die zwei neuen Felder ergänzen:

```ts
  const lineItems = annualTaxableIncomeBreakdown({
    year,
    statusHistory,
    economicTransferDate,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    today,
    extraordinaryCostsDeductibleYearly: deductibleExtraordinaryCostsForYear(extraordinaryCostRows, year),
    leerstandQuoteOverrideFromMonth: leerstandQuoteOverride !== undefined ? makeDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1) : undefined,
    leerstandQuoteOverride,
  });
```

- [ ] **Step 6: Tests laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd web && git add lib/calculations/taxCalculator.ts lib/data/propertyTax.ts tests/calculations/taxCalculator.test.ts tests/data/propertyTax.test.ts
git commit -m "feat(tax): computeTaxCurrentYear accepts an optional leerstandQuoteOverride for the remaining months

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `computeCashflowForecastMonth` von `scenario` auf `leerstandQuote` umstellen

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts`
- Modify: `web/tests/data/propertyCashflow.test.ts`

- [ ] **Step 1: Bestehende Tests anpassen**

In `web/tests/data/propertyCashflow.test.ts`, `describe('computeCashflowForecastMonth', ...)`-Block (ab Zeile 120) umschreiben:

```ts
describe('computeCashflowForecastMonth', () => {
  it('leerstandQuote 0: full income, no owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 0, today);
    // ... bestehende Assertions unverändert übernehmen (vorher 'vollvermietung') ...
  });

  it('leerstandQuote 1: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 1, today);
    // ... bestehende Assertions unverändert übernehmen (vorher 'leerstand') ...
  });

  it('taxEffectMonthly matches computeTaxCurrentYear with the same leerstandQuoteOverride', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 0, today);
    const direct = computeTaxCurrentYear(property, statusEntries, [], today, 0);
    expect(result.taxEffectMonthly).toBeCloseTo(direct.taxEffectMonthly, 6);
  });

  it('cashflowAfterTax = cashflowBeforeTax + taxEffectMonthly', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 1, today);
    expect(result.cashflowAfterTax).toBeCloseTo(result.lineItems.cashflowBeforeTax + result.taxEffectMonthly, 6);
  });

  it('Card 1 never includes an actual extraordinary cost (it is a hypothetical typical month)', () => {
    const cost = /* bestehendes Fixture unverändert */;
    const result = computeCashflowForecastMonth(property, statusEntries, [cost], 0, today);
    // ... bestehende Assertion unverändert ...
  });

  it('lineItems fields are individually wired correctly (insurance, management, other costs, and parking all nonzero)', () => {
    // ...
    const result = computeCashflowForecastMonth(withExtras, statusEntries, [], 0, today);
    // ... bestehende Assertions unverändert ...
  });
});
```

Importiere `computeTaxCurrentYear` zusätzlich am Dateikopf, falls noch nicht importiert: `import { computeTaxCurrentYear } from '@/lib/data/propertyTax';`.

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts -t "computeCashflowForecastMonth"`
Expected: FAIL — Typfehler (Parameter ist noch `CashflowScenario`, kein `number`).

- [ ] **Step 3: `computeCashflowForecastMonth` umbauen**

In `web/lib/data/propertyCashflow.ts`:

Import ergänzen (Zeile 6–10):

```ts
import {
  cashflowLineItemsForScenario,
  cashflowLineItemsForActualMonth,
  blendCashflowLineItems,
  type CashflowLineItems,
} from '@/lib/calculations/cashflowCalculator';
```

`CashflowForecastMonthResult`-Interface (Zeile 20–25) und Funktionssignatur/-körper (Zeile 27–74) ersetzen:

```ts
export interface CashflowForecastMonthResult {
  leerstandQuote: number;
  lineItems: CashflowLineItems;
  taxEffectMonthly: number;
  cashflowAfterTax: number;
}

/**
 * Cashflow tab Card 1 ("Prognose / Monat") — ein settings-basierter typischer Monat
 * für die übergebene Leerstandsquote (0-1, linear zwischen Vollvermietung und
 * Leerstand). Ersetzt den früheren Vollvermietung/Leerstand-Toggle. `taxEffectMonthly`
 * kommt aus computeTaxCurrentYear MIT `leerstandQuoteOverride` — dadurch reflektiert
 * die Steuerzahl echt das gewählte Szenario statt (wie vor dieser Änderung) immer
 * die reale Ist-Steuersituation zu zeigen, unabhängig vom Regler.
 */
export function computeCashflowForecastMonth(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  leerstandQuote: number,
  today: Date = new Date()
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

  const sharedLineItemInput = {
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
    extraordinaryCostsThisMonth: 0,
  };
  const vollvermietung = cashflowLineItemsForScenario({ ...sharedLineItemInput, scenario: 'vollvermietung' });
  const leerstand = cashflowLineItemsForScenario({ ...sharedLineItemInput, scenario: 'leerstand' });
  const lineItems = blendCashflowLineItems(vollvermietung, leerstand, leerstandQuote);

  const { taxEffectMonthly } = computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today, leerstandQuote);

  return { leerstandQuote, lineItems, taxEffectMonthly, cashflowAfterTax: lineItems.cashflowBeforeTax + taxEffectMonthly };
}
```

Entferne den nun ungenutzten Typ `CashflowScenario` NICHT, falls er noch anderswo importiert wird (in Task 8 geprüft) — andernfalls am Ende dieses Tasks per `grep -rn "CashflowScenario" web/lib web/components` verifizieren und nur entfernen, wenn wirklich nichts mehr importiert.

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS

Zusätzlich `cd web && npx tsc --noEmit` — deckt verbleibende Call-Sites (`CashflowTab.tsx`, `ForecastMonthCard.tsx`) auf, die in Task 9 behoben werden.

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/data/propertyCashflow.ts tests/data/propertyCashflow.test.ts
git commit -m "refactor(cashflow): computeCashflowForecastMonth takes a leerstandQuote instead of a binary scenario

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `QuoteSlider`-Komponente (wiederverwendbarer Regler + Reset-Button)

**Files:**
- Create: `web/components/ui/QuoteSlider.tsx`
- Test: `web/tests/components/QuoteSlider.test.tsx`

- [ ] **Step 1: Failing Test schreiben**

Prüfe zuerst mit `grep -rn "testing-library\|@testing-library/react" web/package.json` ob React-Component-Tests in diesem Repo unterstützt werden. Falls ja:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuoteSlider } from '@/components/ui/QuoteSlider';

describe('QuoteSlider', () => {
  it('renders the current value as a percentage', () => {
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={() => {}} />);
    expect(screen.getByText('5,0 %')).toBeInTheDocument();
  });

  it('calls onChange with the new value when dragged', () => {
    const onChange = vi.fn();
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('shows no reset button when value equals defaultValue', () => {
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /zurücksetzen/i })).not.toBeInTheDocument();
  });

  it('shows a reset button when value differs from defaultValue, and resets on click', () => {
    const onChange = vi.fn();
    render(<QuoteSlider label="Leerstandsquote" value={20} defaultValue={5} onChange={onChange} />);
    const resetButton = screen.getByRole('button', { name: /zurücksetzen/i });
    fireEvent.click(resetButton);
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
```

Falls `@testing-library/react` NICHT im Repo vorhanden ist (per `grep` geprüft), diesen Step überspringen und stattdessen nur Step 5 (manuelle Browser-Prüfung) als Verifikation nutzen — keine neue Test-Infrastruktur in diesem Task einführen.

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen** (nur falls Step 1 nicht übersprungen wurde)

Run: `cd web && npx vitest run tests/components/QuoteSlider.test.tsx`
Expected: FAIL — Datei/Komponente existiert nicht.

- [ ] **Step 3: `QuoteSlider` implementieren**

```tsx
'use client';

import { formatPercent } from '@/lib/formatters';

export function QuoteSlider({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const isAtDefault = value === defaultValue;

  return (
    <div className="rounded-xl bg-blue-50/50 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-bold text-text-primary">{label}</label>
        <span className="font-mono text-lg font-extrabold text-accent">{formatPercent(value / 100)}</span>
      </div>
      <input
        type="range"
        role="slider"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
        aria-label={label}
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-text-dim">
        <span>0 % · Vollvermietung</span>
        {!isAtDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="font-semibold text-accent underline underline-offset-2"
          >
            ↺ Zurücksetzen ({formatPercent(defaultValue / 100)})
          </button>
        )}
        <span>100 % · Leerstand</span>
      </div>
    </div>
  );
}
```

`value`/`defaultValue` sind hier bewusst als 0–100-Ganzzahl (Prozentpunkte) modelliert, nicht als 0–1-Dezimalzahl — der `<input type="range">` arbeitet nativ in Ganzzahlschritten und Aufrufer (Task 10/11) rechnen beim Wireless auf `quote / 100` für die 0-1-Skala der Berechnungsfunktionen um.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen** (nur falls Step 1 nicht übersprungen wurde)

Run: `cd web && npx vitest run tests/components/QuoteSlider.test.tsx`
Expected: PASS

- [ ] **Step 5: Manuell prüfen**

Noch nicht in eine Seite eingebunden — dieser Schritt entfällt bis Task 10/11 und wird dort nachgeholt.

- [ ] **Step 6: Commit**

```bash
cd web && git add components/ui/QuoteSlider.tsx tests/components/QuoteSlider.test.tsx
git commit -m "feat(ui): add QuoteSlider component with reset-to-default button

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Falls Step 1 übersprungen wurde, `tests/components/QuoteSlider.test.tsx` aus dem `git add` weglassen.)

---

## Task 9: `PropertyTabNav` — `leerstand`-Query-Parameter beim Tab-Wechsel mitgeben

**Files:**
- Modify: `web/components/property/PropertyTabNav.tsx`

- [ ] **Step 1: Verhalten manuell festlegen (kein isolierter Unit-Test — reine Routing-Glue, wird in Task 11 end-to-end geprüft)**

- [ ] **Step 2: `PropertyTabNav.tsx` anpassen**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

const TABS = [
  { href: '', label: 'Übersicht' },
  { href: '/cashflow', label: 'Cashflow' },
  { href: '/steuer', label: 'Steuer' },
  { href: '/verlauf', label: 'Verlauf' },
  { href: '/finanzierung', label: 'Finanzierung' },
  { href: '/immobiliendaten', label: 'Immobiliendaten' },
];

export function PropertyTabNav({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/properties/${propertyId}`;
  const leerstandParam = searchParams.get('leerstand');

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const isActive = pathname === href;
        // Der Leerstandsquote-Regler lebt nur in Cashflow/Steuer — nur dorthin mitgeben,
        // damit ein Link zu z.B. "Verlauf" keinen ungenutzten Query-Parameter bekommt.
        const carriesQuote = tab.href === '/cashflow' || tab.href === '/steuer';
        const hrefWithQuery = carriesQuote && leerstandParam !== null ? `${href}?leerstand=${leerstandParam}` : href;
        return (
          <Link
            key={tab.href}
            href={hrefWithQuery}
            className={twMerge(
              'whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-text-secondary',
              isActive && 'border-accent text-accent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: keine neuen Fehler in `PropertyTabNav.tsx`.

- [ ] **Step 4: Commit**

```bash
cd web && git add components/property/PropertyTabNav.tsx
git commit -m "feat(nav): forward the leerstand query param between Cashflow and Steuer tabs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Steuer-Tab — beide Regler verdrahten

**Files:**
- Modify: `web/components/property/steuer/CurrentYearSection.tsx`
- Modify: `web/components/property/steuer/ForecastSection.tsx`
- Modify: `web/components/property/steuer/SteuerTab.tsx`

- [ ] **Step 1: `SteuerTab.tsx` — State und Berechnung umstellen**

Lies zuerst `web/components/property/steuer/SteuerTab.tsx` erneut, falls sich der Stand seit Beginn dieses Plans geändert hat (dieser Plan ging von der Version mit `useState<TaxScenarioChoice>` und `useState(currentYear + 1)` aus). Ersetze den Inhalt durch:

```tsx
'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { YearPicker } from '@/components/ui/YearPicker';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import { AfaBasisCard } from './AfaBasisCard';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function SteuerTab({
  property,
  statusEntries,
  extraordinaryCosts,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  today: Date;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const [forecastYear, setForecastYear] = useState(currentYear + 1);

  const summary = computePropertySummary(property, statusEntries, extraordinaryCosts, today);
  const overview = computeOverviewMetrics(property, statusEntries, extraordinaryCosts, summary, today);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  // "Laufendes Jahr"-Regler: Default = tatsächliche Leerstandsquote dieses Jahres,
  // Wert lebt im ?leerstand=-Query-Parameter, damit der Cashflow-Tab ihn mitlesen kann.
  const currentYearDefaultQuote = overview.actualVacancyRateYear !== null ? Math.round(overview.actualVacancyRateYear * 100) : 0;
  const leerstandParam = searchParams.get('leerstand');
  const currentYearQuote = leerstandParam !== null ? Number(leerstandParam) : currentYearDefaultQuote;

  const setCurrentYearQuote = (value: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === currentYearDefaultQuote) {
      params.delete('leerstand');
    } else {
      params.set('leerstand', String(value));
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  };

  // Prognose-Regler (Zukunftsjahre): Default = Leerstandsquote seit Kauf (Lebenszeit-Schnitt),
  // rein lokaler State — kein anderer Tab braucht diesen Wert.
  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const [forecastQuote, setForecastQuote] = useState(forecastDefaultQuote);

  const currentYearResult = useMemo(
    () =>
      leerstandParam !== null
        ? computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, currentYearQuote / 100)
        : computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today),
    [property, statusEntries, extraordinaryCosts, today, leerstandParam, currentYearQuote]
  );
  const forecastResult = computeTaxForecastYear(property, forecastYear, forecastQuote / 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col">
          <QuoteSlider
            label="Leerstandsquote (laufendes Jahr)"
            value={currentYearQuote}
            defaultValue={currentYearDefaultQuote}
            onChange={setCurrentYearQuote}
          />
          <div className="mt-3">
            <CurrentYearSection result={currentYearResult} hasParking={hasParking} economicTransferDate={economicTransferDate} />
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose</h2>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Prognose</span>
          </div>
          <div className="mb-3">
            <YearPicker year={forecastYear} onChange={setForecastYear} minYear={currentYear + 1} />
          </div>
          <QuoteSlider
            label="Leerstandsquote (Prognose)"
            value={forecastQuote}
            defaultValue={forecastDefaultQuote}
            onChange={setForecastQuote}
          />
          <div className="mt-3">
            <ForecastSection result={forecastResult} hasParking={hasParking} />
          </div>
        </GlassCard>
      </div>

      <AfaBasisCard property={property} />
    </div>
  );
}
```

Prüfe die exakten Importpfade/Funktionsnamen für `computePropertySummary` in `@/lib/data/propertySummary` — falls die Funktion dort anders heißt (z. B. `computeSummary`), an den tatsächlichen Namen anpassen; `SteuerTab.tsx` bekam `summary`/`overview` vorher nicht als Props, prüfe daher auch, ob die Server-Component `web/app/(app)/properties/[id]/steuer/page.tsx` diese Werte bereits berechnet und als Props übergeben könnte — falls ja, dort berechnen und durchreichen statt hier im Client-Component neu zu berechnen (vermeidet doppelte Berechnung bei jedem Re-Render).

- [ ] **Step 2: `ForecastSection.tsx` — Toggle-Anzeige entfernen (Regler lebt jetzt in `SteuerTab.tsx`)**

`ForecastSection.tsx` selbst braucht keine strukturelle Änderung — es bekommt weiterhin nur `result`/`hasParking` und zeigt reine Zahlen an. Prüfen: gab es dort jemals einen `SegmentedControl`? Laut vorherigem Lesen nicht (der Toggle sitzt/saß in `SteuerTab.tsx`). Kein Code-Änderungsbedarf in dieser Datei — Task-Schritt dient nur der Verifikation:

Run: `cd web && grep -n "SegmentedControl" components/property/steuer/ForecastSection.tsx`
Expected: kein Treffer.

- [ ] **Step 3: `CurrentYearSection.tsx` prüfen**

Analog: `CurrentYearSection.tsx` bekam nie einen Toggle, bleibt strukturell unverändert (Props unverändert: `result`, `hasParking`, `economicTransferDate`). Kein Code-Änderungsbedarf.

- [ ] **Step 4: Dev-Server manuell prüfen**

```bash
cd web && npm run dev
```

Im Browser `/properties/<id>/steuer` öffnen und prüfen:
1. "Laufendes Jahr"-Karte zeigt jetzt den Regler über der Ist-Aufstellung, vorbelegt mit der berechneten Jahres-Quote.
2. Regler bewegen → Zahlen in der Karte ändern sich, URL bekommt `?leerstand=NN`.
3. Regler auf den Default zurückbewegen (oder Reset-Button) → `?leerstand=` verschwindet aus der URL wieder.
4. "Prognose"-Karte zeigt den Regler statt des alten Vollvermietung/Leerstand-Toggles, vorbelegt mit der Lebenszeit-Quote.
5. Jahr in der Prognose-Karte wechseln → Zahlen ändern sich, Regler-Position bleibt erhalten.

- [ ] **Step 5: Vorhandene Steuer-Tab-Tests prüfen**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts tests/calculations/taxCalculator.test.ts`
Expected: PASS (keine Regressions aus den vorherigen Tasks)

- [ ] **Step 6: Commit**

```bash
cd web && git add components/property/steuer/SteuerTab.tsx
git commit -m "feat(steuer): replace vollvermietung/leerstand toggles with computed-default quote sliders

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Cashflow-Tab Card 1 — Toggle entfernen, Quote aus URL lesen

**Files:**
- Modify: `web/components/property/cashflow/CashflowTab.tsx`
- Modify: `web/components/property/cashflow/ForecastMonthCard.tsx`

- [ ] **Step 1: `CashflowTab.tsx` umbauen**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeCashflowForecastMonth, computeCashflowYearTable } from '@/lib/data/propertyCashflow';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { ForecastMonthCard } from './ForecastMonthCard';
import { CashflowYearTable } from './CashflowYearTable';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function CashflowTab({
  property,
  statusEntries,
  extraordinaryCosts,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  today: Date;
}) {
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  const summary = computePropertySummary(property, statusEntries, extraordinaryCosts, today);
  const overview = computeOverviewMetrics(property, statusEntries, extraordinaryCosts, summary, today);
  // Gleicher Default wie der "Laufendes Jahr"-Regler im Steuer-Tab — kein eigener
  // Regler mehr hier, nur Anzeige. Bewegt der Nutzer den Regler im Steuer-Tab, kommt
  // der Wert über den ?leerstand=-Parameter mit (siehe PropertyTabNav).
  const defaultQuote = overview.actualVacancyRateYear !== null ? Math.round(overview.actualVacancyRateYear * 100) : 0;
  const leerstandParam = searchParams.get('leerstand');
  const quote = leerstandParam !== null ? Number(leerstandParam) : defaultQuote;

  const forecast = computeCashflowForecastMonth(property, statusEntries, extraordinaryCosts, quote / 100, today);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const minYear = economicTransferDate.getUTCFullYear();
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today);
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose / Monat</h2>
        </div>
        <ForecastMonthCard result={forecast} hasParking={hasParking} quote={quote} />
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Jahresübersicht</h2>
          <YearPicker year={year} onChange={setYear} minYear={minYear} maxYear={currentYear + 1} />
        </div>
        <CashflowYearTable result={yearTable} hasParking={hasParking} />
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: `ForecastMonthCard.tsx` — Read-only-Quote-Anzeige statt Toggle-Konsument**

```tsx
import Link from 'next/link';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { CashflowForecastMonthResult } from '@/lib/data/propertyCashflow';

export function ForecastMonthCard({
  result,
  hasParking,
  quote,
}: {
  result: CashflowForecastMonthResult;
  hasParking: boolean;
  quote: number;
}) {
  const { lineItems } = result;
  const cfColor = result.cashflowAfterTax >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <div className="mb-2 flex items-center justify-between rounded-lg bg-blue-50/50 px-3 py-2">
        <div>
          <span className="text-xs text-text-secondary">Leerstandsquote</span>{' '}
          <span className="font-mono text-base font-extrabold text-accent">{formatPercent(quote / 100)}</span>
        </div>
        <Link href="../steuer" className="text-xs font-semibold text-accent underline underline-offset-2">
          im Steuer-Tab anpassen →
        </Link>
      </div>

      <Row label="Einnahmen" value={lineItems.income} />
      <Row label="Kreditrate" value={-lineItems.mortgage} />

      <SectionDivider label="Kosten Wohnung" />
      <Row label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableWE} />
      <Row label="Instandhaltungsrücklage" value={-lineItems.maintenanceReserveWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Verwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer" value={-lineItems.propertyTaxWE} />}

      {hasParking && (
        <>
          <SectionDivider label="Kosten Stellplatz" />
          <Row label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Instandhaltungsrücklage" value={-lineItems.maintenanceReserveTE} />
          <Row label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer" value={-lineItems.propertyTaxTE} />
        </>
      )}

      <SectionDivider label="Zusammenfassung" />
      <div className="flex justify-between border-t border-black/[0.06] pt-1.5 font-bold text-text-primary">
        <span>CF vor Steuern</span>
        <span className="font-mono">{formatCurrency(lineItems.cashflowBeforeTax)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text-secondary">Steuereffekt</span>
        <span className="font-mono text-accent">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>
      <div className={`flex justify-between border-t border-black/[0.06] pt-1.5 text-[18px] font-extrabold ${cfColor}`}>
        <span>CF nach Steuern</span>
        <span className="font-mono">{formatCurrency(result.cashflowAfterTax)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary">{formatCurrency(value)}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">{label}</p>;
}
```

Der `Link href="../steuer"` ist relativ zur aktuellen Property-Detail-Route (`/properties/[id]/cashflow` → `/properties/[id]/steuer`) — prüfe beim manuellen Test in Step 4, dass Next.js das relativ zur aktuellen Route auflöst; falls nicht, durch einen absoluten Pfad ersetzen, der die `propertyId` aus den Props von `CashflowTab` durchreicht (dann `ForecastMonthCard` um eine `propertyId`-Prop erweitern und `href={`/properties/${propertyId}/steuer`}` verwenden).

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: keine Fehler mehr zu `CashflowScenario`/altem `scenario`-Parameter.

- [ ] **Step 4: Manuell im Browser end-to-end prüfen**

1. `/properties/<id>/steuer` öffnen, "Laufendes Jahr"-Regler auf z. B. 25 % ziehen.
2. Über den Tab-Header zu "Cashflow" wechseln (nicht über den Link in der Karte).
3. Prüfen: Card 1 zeigt "Leerstandsquote: 25,0 %" und einen Steuereffekt, der mit dem im Steuer-Tab gezeigten "Laufendes Jahr"-Wert bei 25 % übereinstimmt.
4. Zurück zu "Steuer" wechseln → Regler steht weiterhin auf 25 % (URL-Parameter blieb erhalten).
5. Im Steuer-Tab zurücksetzen (Reset-Button) → im Cashflow-Tab erneut prüfen, dass wieder der berechnete Default gezeigt wird.

- [ ] **Step 5: Vorhandene Cashflow-Tests laufen lassen**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts tests/calculations/cashflowCalculator.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd web && git add components/property/cashflow/CashflowTab.tsx components/property/cashflow/ForecastMonthCard.tsx
git commit -m "feat(cashflow): Card 1 reads the leerstand quote from the URL instead of its own toggle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Vollständiger Regressionslauf

**Files:** keine Änderungen — reine Verifikation.

- [ ] **Step 1: Gesamte Test-Suite laufen lassen**

Run: `cd web && npx vitest run`
Expected: alle Tests PASS, keine übersprungenen/fehlgeschlagenen.

- [ ] **Step 2: Vollständiger Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Lint**

Run: `cd web && npm run lint` (Skript-Namen in `package.json` prüfen, falls abweichend)
Expected: keine neuen Warnungen/Fehler in den geänderten Dateien.

- [ ] **Step 4: Manueller Rundgang**

Dev-Server starten, folgende Seiten je einmal öffnen und auf Konsolenfehler prüfen:
- `/properties/<id>` (Übersicht — neue KPI-Zeile sichtbar)
- `/properties/<id>/steuer` (beide Regler funktionieren, Reset funktioniert)
- `/properties/<id>/cashflow` (Card 1 zeigt Read-only-Quote, Card 2 unverändert inkl. Zukunftsjahr-Warnung)

- [ ] **Step 5: Commit (nur falls Step 3 Auto-Fixes vorgenommen hat)**

```bash
cd web && git add -A
git commit -m "chore: lint fixes after leerstandsquote-regler feature

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review (durchgeführt beim Schreiben dieses Plans)

**Spec-Abdeckung:**
- Zwei KPIs (Jahr + Haltedauer), beide im Übersicht-Tab sichtbar → Task 1, 2. ✓
- Kein Eingabefeld, nur berechneter Default + Regler → Task 8, 10, 11 (Slider-Komponente hat keinen Freitext-Input). ✓
- Reset-Button auf den berechneten Wert → Task 8 (`QuoteSlider`), genutzt in Task 10/11. ✓
- Laufendes-Jahr-Regler nur bei Abweichung ein neuer Rechenpfad → Task 6 (`leerstandQuoteOverride` optional, `undefined` = alter Pfad), Task 10 (`leerstandParam !== null` entscheidet). ✓
- Prognose-Regler nimmt die Lebenszeit-Quote als Default → Task 10 (`forecastDefaultQuote` aus `overview.actualVacancyRate`). ✓
- Cashflow-Tab braucht keinen eigenen Toggle mehr, übernimmt vom Steuer-Tab → Task 9 (URL-Weitergabe), Task 11 (liest `?leerstand=`). ✓
- DB-Feld explizit vermieden → keine Migration in diesem Plan. ✓
- Cashflow-Jahresübersicht für Zukunftsjahre bewusst nicht angefasst → im Header als "Out of scope" vermerkt, keine Task dafür. ✓

**Platzhalter-Scan:** Keine "TBD"/"TODO"/"add appropriate X" gefunden — jeder Code-Schritt enthält vollständigen Code. Zwei Stellen verweisen bewusst auf "an das tatsächliche Repo-Verhalten anpassen" (Task 2 Step 1 `formatPercent`-Rundung, Task 8/11 Importpfad-Verifikation) — das sind Anweisungen, etwas Bestehendes zu prüfen, keine offen gelassenen Implementierungsdetails.

**Typkonsistenz:** `leerstandQuote`/`leerstandQuoteOverride` durchgängig als Dezimalzahl 0–1 in der Berechnungsschicht (`taxCalculator.ts`, `cashflowCalculator.ts`, `propertyTax.ts`, `propertyCashflow.ts`); die UI-Schicht (`QuoteSlider`, `SteuerTab.tsx`, `CashflowTab.tsx`, URL-Parameter) arbeitet konsequent in 0–100-Ganzzahl-Prozentpunkten und rechnet an der Grenze (`/ 100`) um — an jeder Stelle geprüft, dass diese Umrechnung tatsächlich stattfindet, bevor der Wert an eine Berechnungsfunktion übergeben wird.
