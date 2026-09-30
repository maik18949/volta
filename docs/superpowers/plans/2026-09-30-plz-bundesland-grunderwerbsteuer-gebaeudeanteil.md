# PLZ-Bundesland, Grunderwerbsteuer-Vorschlag und Gebäudeanteil in % — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundesland wird aus der PLZ vorbelegt, die Grunderwerbsteuer als überschreibbarer Vorschlag nach Bundesland berechnet, und der Gebäudeanteil ist wahlweise in € oder % eingebbar.

**Architecture:** Reine Logik (Steuersätze, PLZ-Lookup, Anteilsrechnung) liegt als getestete TS-Module in `web/lib/`. Die PLZ-Tabelle wird von einem Skript aus einer CSV erzeugt und eingecheckt. Die UI-Änderungen passieren in den Schritt-Komponenten `StepStammdaten`, `StepKauf`, `StepAfaSteuer`, die Wizard und Bearbeiten-Formular gemeinsam nutzen. Keine DB-Migration.

**Tech Stack:** Next.js (App Router), React Hook Form, Vitest + Testing Library (jsdom), tsx, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-29-plz-bundesland-grunderwerbsteuer-gebaeudeanteil-design.md`

**Abweichungen vom Spec (Implementierungsdetails, bewusst so):**

1. Ein bestehender `state`-Freitext, den `normalizeState` nicht erkennt (z. B. „NRW"), wird **nicht** verworfen. Er bleibt als zusätzliche Dropdown-Option „NRW (bitte prüfen)" erhalten. Sonst würde der Autosave des Bearbeiten-Formulars ihn bei der nächsten Änderung stillschweigend mit `''` überschreiben.
2. Der Grunderwerbsteuer-Modus ist das nicht persistierte Formularfeld `landTransferTaxMode: 'auto' | 'manual'` in `WizardFormValues` (Wizard-Default `auto`, Bearbeiten-Formular lädt `manual`). Es gibt keine Prop `taxStartsManual` und keine aus den Werten abgeleitete Startlogik; der Modus überlebt die Schritt-Navigation (siehe „Abweichungen bei der Umsetzung").

**Konventionen:** Alle Befehle aus dem Verzeichnis `web/` dieses Worktrees. Tests mit `pnpm vitest run <datei>`. Komponententests beginnen mit `// @vitest-environment jsdom` und rufen `cleanup` in `afterEach`. Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.


## Abweichungen bei der Umsetzung (Stand nach den Reviews)

Die Code-Blöcke in den Tasks unten sind der **ursprüngliche Plan**. Die Branch-Historie (`git log faff2e9..HEAD`) und der Code sind maßgeblich. Abweichungen:

- **Grunderwerbsteuer-Modus:** Statt `taxStartsManual` und Ableitung aus den Werten gibt es das nicht persistierte Formularfeld `landTransferTaxMode: 'auto' | 'manual'` (`wizardLogic.ts`, Wizard-Default `auto`; `propertyEditLogic.ts` lädt `manual`). `StepKauf` liest/setzt es über RHF (`onUserEdit` -> `manual`, „Zurücksetzen" -> `auto`). Es überlebt die Schritt-Navigation: Der Vorschlag folgt einer Bundesland-Änderung auf einem früheren Schritt, ein eingegebener Wert 0 bleibt 0. Die Einschränkung „0 gilt beim Re-Mount als leer" entfällt. `mapToPropertyInsert` schreibt das Feld nicht.
- **Hinweis-Region:** „Zurücksetzen" steht außerhalb der `role="status"`-Region; der Statustext lautet „<Land> <Satz> wären <Betrag> ·" mit `aria-hidden` am Punkt.
- **Gebäudeanteil in %:** Textfeld (`inputMode="decimal"`), „." oder „," erlaubt, höchstens 3 Vorkomma- und 2 Nachkommastellen; Werte über 100 und ungültige Tastenanschläge werden ignoriert (Text und Euro-Werte bleiben). `parsePercentInput`/`formatPercentInput` liegen in `lib/wizard/buildingShare.ts`.
- **PLZ-Tabelle:** Die `// Quelle:`-Zeile hat kein Erzeugungsdatum (byte-reproduzierbar); Quelle Gist pmdroid/6ae8286a494cafce82b6ea5f6cc2362a, bereinigt. Kein `/* eslint-disable */`-Header, stattdessen `globalIgnores` in `eslint.config.mjs`. Der Generator (`scripts/generatePlzTable.ts`) löst den Ausgabepfad relativ zum Skript auf und überschreibt nicht bei leerer/unvollständiger Tabelle; der Builder umbricht die Ausgabe (max. 8 Bereiche pro Zeile) und sortiert per Code-Unit-Vergleich. `plzTableBuilder` und `generatePlzTable` wurden gegenüber den Task-Code-Blöcken gehärtet.
- **Grunderwerbsteuer-Sync:** Der Vorschlag wird nicht in `StepKauf`, sondern vom Hook `components/wizard/useLandTransferTaxAutoSync.ts` an der Formularwurzel geschrieben (Wizard und Bearbeiten-Formular). Er folgt so auch Bundesland-/Stellplatz-Änderungen, während der Kauf-Schritt nicht offen ist. Gesamtkaufpreis über `totalPurchasePrice` in `lib/wizard/wizardLogic.ts`.
- **Hinweis-Typen:** `HintTone` liegt geteilt in `lib/hintTone.ts`; die Komponente `FieldHint` in `components/ui/fieldStyles.tsx`.
- **Felder:** `CurrencyField` hat `onUserEdit` und `describedBy`; `SelectField` hat `describedBy`.
- **Satzanzeige:** Sätze werden über `formatPercent` angezeigt, z. B. „5,0 %", „3,5 %".
- **Tests:** Label-Selektoren sind Regexe, weil das `<label>` den „€"/„%"-Suffix mit umschließt. Mehrere Tests wurden in Nachfolge-Commits nachgeschärft (u. a. Building-Share-Tests, Round-Trip über das Edit-Mapping, Modus über Schritt-Navigation).

---

## File Structure

| Datei | Aktion | Verantwortung |
|---|---|---|
| `lib/data/landTransferTaxRates.ts` | neu | 16 Länder, Sätze, `suggestLandTransferTax`, `normalizeState` |
| `scripts/plzTableBuilder.ts` | neu | CSV parsen/bereinigen, Tabellen-Modul rendern (rein, testbar) |
| `scripts/generatePlzTable.ts` | neu | CLI: liest CSV, schreibt `lib/data/plzToState.ts` |
| `lib/data/plzToState.ts` | neu, generiert | PLZ-Bereiche je Land + uneindeutige PLZ |
| `lib/data/plzLookup.ts` | neu | `lookupState(plz)` über der generierten Tabelle |
| `lib/wizard/postalCodeState.ts` | neu | Reaktion aufs Dropdown und Hinweistext bei PLZ-Änderung |
| `lib/wizard/buildingShare.ts` | neu | Prozent ↔ Euro-Rechnung für den Gebäudeanteil |
| `lib/hintTone.ts` | neu | geteilter Typ `HintTone` |
| `lib/wizard/wizardLogic.ts` | ändern | Formularfeld `landTransferTaxMode` (Default `auto`, nicht persistiert) |
| `lib/wizard/propertyEditLogic.ts` | ändern | `state` beim Laden normalisieren; `landTransferTaxMode: 'manual'` |
| `components/ui/CurrencyField.tsx` | ändern | optionale Prop `onUserEdit` |
| `components/wizard/BuildingShareFields.tsx` | neu | €/%-Switcher + Felder |
| `components/wizard/steps/StepStammdaten.tsx` | ändern | Bundesland-Dropdown + PLZ-Logik |
| `components/wizard/steps/StepKauf.tsx` | ändern | Steuervorschlag, Modus, Hinweis |
| `components/wizard/steps/StepAfaSteuer.tsx` | ändern | nutzt `BuildingShareFields` |
| `components/property/immobiliendaten/PropertyEditForm.tsx` | ändern | `<StepKauf />` (Modus kommt aus dem geladenen Formularwert) |
| `package.json` | ändern | Script `generate:plz` |
| `../README.md` | ändern | drei Roadmap-Einträge entfernen |
| `../docs/specs/spec-property-setup.md`, `../docs/specs/spec-immobiliendaten-tab.md` | ändern | Feldbeschreibungen Bundesland, Grunderwerbsteuer, Gebäude-/Grundstückswert nachziehen |
| `../docs/specs/spec-data-model.md`, `../immobilien_datenmodell_v2.md` | ändern | `state` kanonisch, `building_value`/`land_value` Hinweis |
| `tests/...` | neu | je Modul, siehe Tasks |

---

### Task 0: Worktree vorbereiten

**Files:** keine

- [ ] **Step 1: Abhängigkeiten installieren**

Run: `pnpm install --frozen-lockfile`
Expected: endet ohne Fehler.

- [ ] **Step 2: Baseline-Tests laufen lassen**

Run: `pnpm test`
Expected: alle bestehenden Tests PASS. Falls etwas rot ist, hier stoppen und melden, bevor Änderungen beginnen.

---

### Task 1: Bundesländer, Steuersätze, `normalizeState`

**Files:**
- Create: `lib/data/landTransferTaxRates.ts`
- Test: `tests/data/landTransferTaxRates.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/data/landTransferTaxRates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  GERMAN_STATES,
  STATE_NAMES,
  isStateName,
  landTransferTaxRatePercent,
  suggestLandTransferTax,
  normalizeState,
} from '@/lib/data/landTransferTaxRates';

const EXPECTED_RATES: Array<[string, number]> = [
  ['Baden-Württemberg', 5],
  ['Bayern', 3.5],
  ['Berlin', 6],
  ['Brandenburg', 6.5],
  ['Bremen', 5.5],
  ['Hamburg', 5.5],
  ['Hessen', 6],
  ['Mecklenburg-Vorpommern', 6],
  ['Niedersachsen', 5],
  ['Nordrhein-Westfalen', 6.5],
  ['Rheinland-Pfalz', 5],
  ['Saarland', 6.5],
  ['Sachsen', 5.5],
  ['Sachsen-Anhalt', 5],
  ['Schleswig-Holstein', 6.5],
  ['Thüringen', 5],
];

describe('GERMAN_STATES', () => {
  it('lists exactly the 16 Bundesländer with the agreed rates', () => {
    expect(GERMAN_STATES).toHaveLength(16);
    expect(GERMAN_STATES.map((s) => [s.name, s.ratePercent])).toEqual(EXPECTED_RATES);
  });
});

describe('isStateName', () => {
  it('accepts canonical names only', () => {
    expect(isStateName('Sachsen')).toBe(true);
    expect(isStateName('sachsen')).toBe(false);
    expect(isStateName('NRW')).toBe(false);
  });
});

describe('landTransferTaxRatePercent', () => {
  it.each(EXPECTED_RATES)('%s -> %s %%', (state, rate) => {
    expect(landTransferTaxRatePercent(state)).toBe(rate);
  });

  it('returns null for empty or unknown state', () => {
    expect(landTransferTaxRatePercent('')).toBeNull();
    expect(landTransferTaxRatePercent('NRW')).toBeNull();
  });
});

describe('suggestLandTransferTax', () => {
  it('multiplies rate and purchase price', () => {
    expect(suggestLandTransferTax('Sachsen', 175000)).toBe(9625);
  });

  it('rounds to cents', () => {
    expect(suggestLandTransferTax('Bayern', 250001)).toBe(8750.04);
  });

  it('returns 0 for a purchase price of 0', () => {
    expect(suggestLandTransferTax('Sachsen', 0)).toBe(0);
  });

  it('returns null without a known state', () => {
    expect(suggestLandTransferTax('', 175000)).toBeNull();
    expect(suggestLandTransferTax('NRW', 175000)).toBeNull();
  });
});

describe('normalizeState', () => {
  it('returns the canonical name for spelling variants', () => {
    expect(normalizeState('sachsen')).toBe('Sachsen');
    expect(normalizeState('  Sachsen ')).toBe('Sachsen');
    expect(normalizeState('THÜRINGEN')).toBe('Thüringen');
    expect(normalizeState('Thueringen')).toBe('Thüringen');
    expect(normalizeState('sachsen-anhalt')).toBe('Sachsen-Anhalt');
  });

  it('returns an empty string for unrecognized text', () => {
    expect(normalizeState('NRW')).toBe('');
    expect(normalizeState('')).toBe('');
  });

  it('knows every canonical name', () => {
    for (const name of STATE_NAMES) expect(normalizeState(name)).toBe(name);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `pnpm vitest run tests/data/landTransferTaxRates.test.ts`
Expected: FAIL — Modul `@/lib/data/landTransferTaxRates` nicht gefunden.

- [ ] **Step 3: Implementieren**

`lib/data/landTransferTaxRates.ts`:

```ts
/**
 * Grunderwerbsteuersätze je Bundesland (Prozent des Kaufpreises).
 * Quelle: Angabe des Projektinhabers, Stand 29.09.2026.
 */
export const GERMAN_STATES = [
  { name: 'Baden-Württemberg', ratePercent: 5 },
  { name: 'Bayern', ratePercent: 3.5 },
  { name: 'Berlin', ratePercent: 6 },
  { name: 'Brandenburg', ratePercent: 6.5 },
  { name: 'Bremen', ratePercent: 5.5 },
  { name: 'Hamburg', ratePercent: 5.5 },
  { name: 'Hessen', ratePercent: 6 },
  { name: 'Mecklenburg-Vorpommern', ratePercent: 6 },
  { name: 'Niedersachsen', ratePercent: 5 },
  { name: 'Nordrhein-Westfalen', ratePercent: 6.5 },
  { name: 'Rheinland-Pfalz', ratePercent: 5 },
  { name: 'Saarland', ratePercent: 6.5 },
  { name: 'Sachsen', ratePercent: 5.5 },
  { name: 'Sachsen-Anhalt', ratePercent: 5 },
  { name: 'Schleswig-Holstein', ratePercent: 6.5 },
  { name: 'Thüringen', ratePercent: 5 },
] as const;

export type StateName = (typeof GERMAN_STATES)[number]['name'];

export const STATE_NAMES: readonly StateName[] = GERMAN_STATES.map((s) => s.name);

export function isStateName(value: string): value is StateName {
  return (STATE_NAMES as readonly string[]).includes(value);
}

/** Steuersatz in Prozent (z. B. 5.5) oder null, wenn `state` kein kanonischer Ländername ist. */
export function landTransferTaxRatePercent(state: string): number | null {
  return GERMAN_STATES.find((s) => s.name === state)?.ratePercent ?? null;
}

/** Vorschlag = Satz × Gesamtkaufpreis, auf Cent gerundet; null ohne bekanntes Bundesland. */
export function suggestLandTransferTax(state: string, purchasePrice: number): number | null {
  const rate = landTransferTaxRatePercent(state);
  if (rate === null) return null;
  return Math.round(purchasePrice * rate) / 100;
}

function fold(text: string): string {
  return text.trim().toLowerCase().replace(/ü/g, 'ue').replace(/\s+/g, ' ');
}

/** Bildet Freitext auf den kanonischen Ländernamen ab; leer, wenn nicht erkennbar. */
export function normalizeState(text: string): StateName | '' {
  const key = fold(text);
  return STATE_NAMES.find((name) => fold(name) === key) ?? '';
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/data/landTransferTaxRates.test.ts`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Commit**

```bash
git add lib/data/landTransferTaxRates.ts tests/data/landTransferTaxRates.test.ts
git commit -m "feat(data): add Bundesländer with Grunderwerbsteuer rates and state normalization

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PLZ-Tabellen-Builder (Skript-Logik)

**Files:**
- Create: `scripts/plzTableBuilder.ts`
- Test: `tests/scripts/plzTableBuilder.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/scripts/plzTableBuilder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parsePostcodeCsv, renderTableModule } from '@/scripts/plzTableBuilder';

const CSV = [
  'Ort;Plz;Bundesland',
  'Dresden;1067;Sachsen',
  'Dresden;1068;Sachsen',
  'Aach;54298;Rheinland-Pfalz',
  'Aach;78267;Baden-Württemberg',
  'Hamburg;21039;Hamburg',
  'Börnsen;21039;Schlewig-Holstein',
  ';;',
  '',
].join('\n');

describe('parsePostcodeCsv', () => {
  it('pads PLZ to 5 digits and fixes the Schleswig-Holstein typo', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.unique.get('01067')).toBe('Sachsen');
    expect(table.unique.get('01068')).toBe('Sachsen');
    expect(table.unique.get('54298')).toBe('Rheinland-Pfalz');
    expect(table.unique.get('78267')).toBe('Baden-Württemberg');
  });

  it('puts PLZ in two Bundesländer into ambiguous, sorted alphabetically, and not into unique', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.ambiguous.get('21039')).toEqual(['Hamburg', 'Schleswig-Holstein']);
    expect(table.unique.has('21039')).toBe(false);
  });

  it('skips empty rows', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.unique.size + table.ambiguous.size).toBe(5);
  });

  it('throws on an unexpected header', () => {
    expect(() => parsePostcodeCsv('Ort,Plz\nX,1')).toThrow(/header/i);
  });

  it('throws on an unknown Bundesland', () => {
    expect(() => parsePostcodeCsv('Ort;Plz;Bundesland\nX;12345;Atlantis')).toThrow(/Atlantis/);
  });

  it('throws on a malformed PLZ', () => {
    expect(() => parsePostcodeCsv('Ort;Plz;Bundesland\nX;12a45;Sachsen')).toThrow(/PLZ/);
  });
});

describe('renderTableModule', () => {
  it('merges consecutive PLZ of the same state into ranges and lists ambiguous PLZ', () => {
    const source = renderTableModule(parsePostcodeCsv(CSV), 'test-source');
    expect(source).toContain('"Sachsen": [[1067,1068]]');
    expect(source).toContain('"Rheinland-Pfalz": [[54298,54298]]');
    expect(source).toContain('"21039": ["Hamburg","Schleswig-Holstein"]');
    expect(source).toContain('GENERATED');
    expect(source).toContain('test-source');
  });
});
```

Der Alias `@/scripts/...` löst laut `vitest.config.ts` auf das Verzeichnis `web/` auf, das passt.

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/scripts/plzTableBuilder.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementieren**

`scripts/plzTableBuilder.ts`:

```ts
import { isStateName } from '../lib/data/landTransferTaxRates';

export interface PlzTable {
  /** PLZ (5 Ziffern) -> Bundesland, nur eindeutige PLZ. */
  unique: Map<string, string>;
  /** PLZ (5 Ziffern) -> alle Bundesländer, alphabetisch; nur PLZ in mehr als einem Land. */
  ambiguous: Map<string, string[]>;
}

const EXPECTED_HEADER = 'Ort;Plz;Bundesland';

/** Bekannte Tippfehler in der Quelldatei. */
const STATE_TYPOS: Record<string, string> = {
  'Schlewig-Holstein': 'Schleswig-Holstein',
};

export function parsePostcodeCsv(csv: string): PlzTable {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header = lines.shift() ?? '';
  if (header.trim() !== EXPECTED_HEADER) {
    throw new Error(`Unexpected CSV header: "${header}" (expected "${EXPECTED_HEADER}")`);
  }

  const statesByPlz = new Map<string, Set<string>>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [, rawPlz = '', rawState = ''] = line.split(';');
    const plzText = rawPlz.trim();
    const stateText = rawState.trim();
    if (!plzText && !stateText) continue; // ";;" rows in the source file

    if (!/^\d{1,5}$/.test(plzText)) throw new Error(`Invalid PLZ in line: ${line}`);
    const plz = plzText.padStart(5, '0');
    const state = STATE_TYPOS[stateText] ?? stateText;
    if (!isStateName(state)) throw new Error(`Unknown Bundesland "${state}" in line: ${line}`);

    const set = statesByPlz.get(plz) ?? new Set<string>();
    set.add(state);
    statesByPlz.set(plz, set);
  }

  const unique = new Map<string, string>();
  const ambiguous = new Map<string, string[]>();
  for (const [plz, states] of statesByPlz) {
    if (states.size === 1) unique.set(plz, [...states][0]);
    else ambiguous.set(plz, [...states].sort((a, b) => a.localeCompare(b, 'de')));
  }
  return { unique, ambiguous };
}

/** Fasst aufeinanderfolgende PLZ desselben Landes zu [von, bis]-Bereichen zusammen. */
function toRanges(plzs: number[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const plz of plzs) {
    const last = ranges[ranges.length - 1];
    if (last && plz === last[1] + 1) last[1] = plz;
    else ranges.push([plz, plz]);
  }
  return ranges;
}

export function renderTableModule(table: PlzTable, sourceNote: string): string {
  const numbersByState = new Map<string, number[]>();
  for (const [plz, state] of table.unique) {
    const list = numbersByState.get(state) ?? [];
    list.push(Number(plz));
    numbersByState.set(state, list);
  }

  const stateLines = [...numbersByState.keys()]
    .sort((a, b) => a.localeCompare(b, 'de'))
    .map((state) => {
      const sorted = numbersByState.get(state)!.sort((a, b) => a - b);
      return `  ${JSON.stringify(state)}: ${JSON.stringify(toRanges(sorted))},`;
    });

  const ambiguousLines = [...table.ambiguous.keys()]
    .sort()
    .map((plz) => `  ${JSON.stringify(plz)}: ${JSON.stringify(table.ambiguous.get(plz))},`);

  return [
    '/* eslint-disable */',
    '// GENERATED by scripts/generatePlzTable.ts — do not edit by hand.',
    `// Quelle: ${sourceNote}`,
    '',
    '/** Bundesland -> Bereiche [von, bis] aufeinanderfolgender, eindeutig zugeordneter PLZ. */',
    'export const PLZ_RANGES: Record<string, ReadonlyArray<readonly [number, number]>> = {',
    ...stateLines,
    '};',
    '',
    '/** PLZ, die in mehr als einem Bundesland liegen (alphabetisch). */',
    'export const AMBIGUOUS_PLZ: Record<string, readonly string[]> = {',
    ...ambiguousLines,
    '};',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/scripts/plzTableBuilder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/plzTableBuilder.ts tests/scripts/plzTableBuilder.test.ts
git commit -m "feat(scripts): add PLZ table builder (parse, clean, render)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tabelle generieren und `lookupState`

**Files:**
- Create: `scripts/generatePlzTable.ts`, `lib/data/plzToState.ts` (generiert), `lib/data/plzLookup.ts`
- Modify: `package.json` (Script `generate:plz`)
- Test: `tests/data/plzLookup.test.ts`

- [ ] **Step 1: CLI schreiben**

`scripts/generatePlzTable.ts`:

```ts
// Usage (aus web/): pnpm generate:plz <pfad-zu-german-postcodes.csv>
// Quelle der CSV: https://gist.github.com/pmdroid/6ae8286a494cafce82b6ea5f6cc2362a
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parsePostcodeCsv, renderTableModule } from './plzTableBuilder';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: pnpm generate:plz <path-to-german-postcodes.csv>');
  process.exit(1);
}

const table = parsePostcodeCsv(readFileSync(csvPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const source = `GitHub-Gist pmdroid/6ae8286a494cafce82b6ea5f6cc2362a (german-postcodes.csv), bereinigt, erzeugt am ${today}`;
const outPath = path.resolve(process.cwd(), 'lib/data/plzToState.ts');
writeFileSync(outPath, renderTableModule(table, source));

console.log(`PLZ eindeutig: ${table.unique.size}, uneindeutig: ${table.ambiguous.size}`);
for (const [plz, states] of [...table.ambiguous].sort()) console.log(`  ${plz}: ${states.join(' / ')}`);
console.log(`Geschrieben: ${outPath}`);
```

In `package.json` unter `"scripts"` nach `"seed"` ergänzen (Komma beachten):

```json
    "seed": "tsx scripts/seed.ts",
    "generate:plz": "tsx scripts/generatePlzTable.ts"
```

- [ ] **Step 2: Tabelle erzeugen**

Die geprüfte Rohdatei liegt bereits lokal (Download vom Gist wurde vom Projektinhaber freigegeben):
`/private/tmp/claude-501/-Users-maikschlarmann-volta/a36006d2-ae06-4070-af38-d27e9a4da5a8/scratchpad/german-postcodes.csv`.
Existiert sie nicht mehr, **nicht selbst neu laden**, sondern den Projektinhaber um Freigabe bzw. den Pfad bitten (Roh-URL: `https://gist.githubusercontent.com/pmdroid/6ae8286a494cafce82b6ea5f6cc2362a/raw/`).

Run: `pnpm generate:plz /private/tmp/claude-501/-Users-maikschlarmann-volta/a36006d2-ae06-4070-af38-d27e9a4da5a8/scratchpad/german-postcodes.csv`
Expected: `PLZ eindeutig: 8230, uneindeutig: 26`, danach 26 Zeilen mit PLZ und Ländern, dann `Geschrieben: …/lib/data/plzToState.ts`. (Summe 8.256 aus der Vorprüfung; weichen die Zahlen ab, stoppen und melden.)

- [ ] **Step 3: Failing test schreiben**

`tests/data/plzLookup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lookupState } from '@/lib/data/plzLookup';
import { PLZ_RANGES, AMBIGUOUS_PLZ } from '@/lib/data/plzToState';
import { STATE_NAMES } from '@/lib/data/landTransferTaxRates';

describe('lookupState', () => {
  it.each([
    ['01099', 'Sachsen'],
    ['80331', 'Bayern'],
    ['20095', 'Hamburg'],
    ['28195', 'Bremen'],
    ['10115', 'Berlin'],
    ['50667', 'Nordrhein-Westfalen'],
    ['60311', 'Hessen'],
    ['70173', 'Baden-Württemberg'],
    ['30159', 'Niedersachsen'],
    ['55116', 'Rheinland-Pfalz'],
    ['66111', 'Saarland'],
    ['24103', 'Schleswig-Holstein'],
    ['19053', 'Mecklenburg-Vorpommern'],
    ['39104', 'Sachsen-Anhalt'],
    ['99084', 'Thüringen'],
    ['14467', 'Brandenburg'],
  ])('%s -> %s', (plz, state) => {
    expect(lookupState(plz)).toEqual({ kind: 'unique', state });
  });

  it.each([
    ['65326', ['Hessen', 'Rheinland-Pfalz']],
    ['88147', ['Baden-Württemberg', 'Bayern']],
    ['21039', ['Hamburg', 'Schleswig-Holstein']],
  ])('%s is ambiguous', (plz, states) => {
    expect(lookupState(plz)).toEqual({ kind: 'ambiguous', states });
  });

  it.each(['00000', '99999', '1234', '123456', 'abcde', ''])('"%s" is unknown', (plz) => {
    expect(lookupState(plz)).toEqual({ kind: 'unknown' });
  });

  it('ignores surrounding whitespace', () => {
    expect(lookupState(' 01099 ')).toEqual({ kind: 'unique', state: 'Sachsen' });
  });
});

describe('generated table integrity', () => {
  it('only uses canonical Bundesland names and covers all 16', () => {
    const states = Object.keys(PLZ_RANGES);
    for (const state of states) expect(STATE_NAMES).toContain(state);
    expect([...states].sort()).toEqual([...STATE_NAMES].sort());
  });

  it('has well-formed ranges and no PLZ in two states', () => {
    const seen = new Set<number>();
    for (const ranges of Object.values(PLZ_RANGES)) {
      for (const [from, to] of ranges) {
        expect(from).toBeGreaterThanOrEqual(1000);
        expect(to).toBeLessThanOrEqual(99999);
        expect(from).toBeLessThanOrEqual(to);
        for (let plz = from; plz <= to; plz++) {
          expect(seen.has(plz)).toBe(false);
          seen.add(plz);
        }
      }
    }
    expect(seen.size + Object.keys(AMBIGUOUS_PLZ).length).toBe(8256);
    expect(Object.keys(AMBIGUOUS_PLZ)).toHaveLength(26);
  });

  it('keeps ambiguous PLZ out of the ranges', () => {
    for (const plz of Object.keys(AMBIGUOUS_PLZ)) {
      expect(lookupState(plz).kind).toBe('ambiguous');
    }
  });
});
```

- [ ] **Step 4: Fehlschlag prüfen**

Run: `pnpm vitest run tests/data/plzLookup.test.ts`
Expected: FAIL — `@/lib/data/plzLookup` nicht gefunden.

- [ ] **Step 5: `lookupState` implementieren**

`lib/data/plzLookup.ts`:

```ts
import { AMBIGUOUS_PLZ, PLZ_RANGES } from './plzToState';

export type PlzLookup =
  | { kind: 'unique'; state: string }
  | { kind: 'ambiguous'; states: readonly string[] }
  | { kind: 'unknown' };

let index: Map<number, string> | null = null;

function getIndex(): Map<number, string> {
  if (index) return index;
  const built = new Map<number, string>();
  for (const [state, ranges] of Object.entries(PLZ_RANGES)) {
    for (const [from, to] of ranges) {
      for (let plz = from; plz <= to; plz++) built.set(plz, state);
    }
  }
  index = built;
  return built;
}

/** Ordnet eine 5-stellige PLZ einem Bundesland zu (offline, aus der generierten Tabelle). */
export function lookupState(plz: string): PlzLookup {
  const trimmed = plz.trim();
  if (!/^\d{5}$/.test(trimmed)) return { kind: 'unknown' };
  const ambiguousStates = AMBIGUOUS_PLZ[trimmed];
  if (ambiguousStates) return { kind: 'ambiguous', states: ambiguousStates };
  const state = getIndex().get(Number(trimmed));
  return state ? { kind: 'unique', state } : { kind: 'unknown' };
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `pnpm vitest run tests/data/plzLookup.test.ts`
Expected: PASS. Schlägt eine Stichproben-PLZ fehl (z. B. weil sie in der Quelldatei fehlt), nicht die Erwartung anpassen, sondern melden.

- [ ] **Step 7: Commit**

```bash
git add scripts/generatePlzTable.ts lib/data/plzToState.ts lib/data/plzLookup.ts package.json tests/data/plzLookup.test.ts
git commit -m "feat(data): generate PLZ table and add lookupState

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reaktion auf PLZ-Änderung und Hinweistexte

**Files:**
- Create: `lib/wizard/postalCodeState.ts`
- Test: `tests/wizard/postalCodeState.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/wizard/postalCodeState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stateUpdateForPostalCode, postalCodeHint } from '@/lib/wizard/postalCodeState';

describe('stateUpdateForPostalCode', () => {
  it('sets the state for a unique PLZ', () => {
    expect(stateUpdateForPostalCode('01099')).toEqual({ action: 'set', state: 'Sachsen' });
  });

  it('clears the state for an ambiguous PLZ', () => {
    expect(stateUpdateForPostalCode('65326')).toEqual({ action: 'clear' });
  });

  it('keeps the state for an unknown or incomplete PLZ', () => {
    expect(stateUpdateForPostalCode('00000')).toEqual({ action: 'keep' });
    expect(stateUpdateForPostalCode('0109')).toEqual({ action: 'keep' });
    expect(stateUpdateForPostalCode('')).toEqual({ action: 'keep' });
  });
});

describe('postalCodeHint', () => {
  it('shows nothing while the PLZ is incomplete', () => {
    expect(postalCodeHint('', '')).toBeNull();
    expect(postalCodeHint('0109', 'Sachsen')).toBeNull();
  });

  it('asks for a valid PLZ when a complete PLZ is unknown', () => {
    expect(postalCodeHint('00000', '')).toEqual({ text: 'Gültige Postleitzahl eingeben', tone: 'warn' });
  });

  it('names both candidates for an ambiguous PLZ while no state is chosen', () => {
    expect(postalCodeHint('65326', '')).toEqual({
      text: 'PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen',
      tone: 'warn',
    });
  });

  it('is silent for an ambiguous PLZ once a state is chosen', () => {
    expect(postalCodeHint('65326', 'Hessen')).toBeNull();
  });

  it('confirms detection only while the state still matches the PLZ', () => {
    expect(postalCodeHint('01099', 'Sachsen')).toEqual({ text: 'Aus PLZ erkannt', tone: 'info' });
    expect(postalCodeHint('01099', 'Bayern')).toBeNull();
  });
});
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/wizard/postalCodeState.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementieren**

`lib/wizard/postalCodeState.ts`:

```ts
import { lookupState } from '@/lib/data/plzLookup';

export type PostalCodeStateUpdate = { action: 'set'; state: string } | { action: 'clear' } | { action: 'keep' };

export interface PostalCodeHint {
  text: string;
  tone: 'info' | 'warn';
}

function isCompletePostalCode(postalCode: string): boolean {
  return /^\d{5}$/.test(postalCode.trim());
}

/** Was das Bundesland-Dropdown tun soll, wenn sich die PLZ zu `postalCode` geändert hat. */
export function stateUpdateForPostalCode(postalCode: string): PostalCodeStateUpdate {
  if (!isCompletePostalCode(postalCode)) return { action: 'keep' };
  const result = lookupState(postalCode);
  if (result.kind === 'unique') return { action: 'set', state: result.state };
  if (result.kind === 'ambiguous') return { action: 'clear' };
  return { action: 'keep' };
}

/** Hinweis unter dem Bundesland-Dropdown; null, wenn nichts anzuzeigen ist. */
export function postalCodeHint(postalCode: string, state: string): PostalCodeHint | null {
  if (!isCompletePostalCode(postalCode)) return null;
  const result = lookupState(postalCode);
  if (result.kind === 'unknown') return { text: 'Gültige Postleitzahl eingeben', tone: 'warn' };
  if (result.kind === 'ambiguous') {
    if (state) return null;
    return { text: `PLZ liegt in ${result.states.join(' und ')} – bitte wählen`, tone: 'warn' };
  }
  return state === result.state ? { text: 'Aus PLZ erkannt', tone: 'info' } : null;
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/wizard/postalCodeState.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wizard/postalCodeState.ts tests/wizard/postalCodeState.test.ts
git commit -m "feat(wizard): add PLZ to Bundesland update rules and hint texts

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `StepStammdaten` mit Bundesland-Dropdown

**Files:**
- Modify: `components/wizard/steps/StepStammdaten.tsx`
- Test: `tests/components/StepStammdaten.test.tsx`

- [ ] **Step 1: Failing test schreiben**

`tests/components/StepStammdaten.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepStammdaten } from '@/components/wizard/steps/StepStammdaten';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {} }: { overrides?: Partial<WizardFormValues> }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
  });
  return (
    <FormProvider {...form}>
      <StepStammdaten />
    </FormProvider>
  );
}

function typePostalCode(value: string) {
  fireEvent.change(screen.getByLabelText('PLZ'), { target: { value } });
}

describe('StepStammdaten Bundesland from PLZ', () => {
  it('offers all 16 Bundesländer plus the empty option', () => {
    render(<Harness />);
    const select = screen.getByLabelText('Bundesland');
    expect(select.querySelectorAll('option')).toHaveLength(17);
  });

  it('sets the Bundesland for a unique PLZ and says so', async () => {
    render(<Harness />);
    typePostalCode('01099');
    expect(await screen.findByText('Aus PLZ erkannt')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Sachsen');
  });

  it('clears the Bundesland and names both candidates for an ambiguous PLZ', async () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('65326');
    expect(await screen.findByText('PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('');
  });

  it('keeps the Bundesland and asks for a valid PLZ when a complete PLZ is unknown', async () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('00000');
    expect(await screen.findByText('Gültige Postleitzahl eingeben')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('shows no hint while the PLZ is incomplete', () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('0109');
    expect(screen.queryByText('Gültige Postleitzahl eingeben')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('does not touch a saved Bundesland on mount', () => {
    render(<Harness overrides={{ postalCode: '01099', state: 'Bayern' }} />);
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('keeps an unrecognized legacy value as a selectable option', () => {
    render(<Harness overrides={{ state: 'NRW' }} />);
    expect(screen.getByRole('option', { name: 'NRW (bitte prüfen)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('NRW');
  });
});
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/components/StepStammdaten.test.tsx`
Expected: FAIL — u. a. „Bundesland" ist noch ein Textfeld (kein `select`/17 Optionen).

- [ ] **Step 3: Implementieren**

In `components/wizard/steps/StepStammdaten.tsx` die Imports ersetzen/ergänzen:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { FormCard, FormGrid, FormSection } from '@/components/ui/FormLayout';
import { STATE_NAMES, isStateName } from '@/lib/data/landTransferTaxRates';
import { postalCodeHint, stateUpdateForPostalCode } from '@/lib/wizard/postalCodeState';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';
```

Die Konstanten `PROPERTY_TYPES` und `ACQUISITION_TYPES` bleiben unverändert. Die Komponente wird ersetzt durch:

```tsx
export function StepStammdaten() {
  const { register, control, setValue } = useFormContext<WizardFormValues>();
  const postalCode = useWatch({ control, name: 'postalCode' }) ?? '';
  const state = useWatch({ control, name: 'state' }) ?? '';

  // Only react to a *change* of the PLZ, never to the initial value (a saved Bundesland must survive opening the form).
  const previousPostalCode = useRef(postalCode);
  useEffect(() => {
    if (postalCode === previousPostalCode.current) return;
    previousPostalCode.current = postalCode;
    const update = stateUpdateForPostalCode(postalCode);
    if (update.action === 'set') setValue('state', update.state);
    else if (update.action === 'clear') setValue('state', '');
  }, [postalCode, setValue]);

  const stateOptions: Array<[string, string]> = STATE_NAMES.map((name) => [name, name]);
  // A saved free-text value we can't map stays selectable so autosave never silently drops it.
  if (state && !isStateName(state)) stateOptions.push([state, `${state} (bitte prüfen)`]);
  const hint = postalCodeHint(postalCode, state);

  return (
    <FormSection>
      <FormCard title="Stammdaten">
        <FormGrid>
          <TextField label="Name" name="name" register={register} required className="sm:col-span-2" />
          <TextField label="Adresse" name="address" register={register} required />
          <TextField label="Stadt" name="city" register={register} required />
          <TextField label="PLZ" name="postalCode" register={register} />
          <div>
            <SelectField label="Bundesland" name="state" register={register} options={stateOptions} emptyOption="Bitte wählen" />
            {hint && (
              <p className={hint.tone === 'warn' ? 'mt-1.5 text-[12px] font-medium text-amber-800' : 'mt-1.5 text-[12px] text-text-dim'}>
                {hint.text}
              </p>
            )}
          </div>
          <SelectField label="Objekttyp" name="propertyType" register={register} options={PROPERTY_TYPES} />
          <TextField label="Baujahr" name="yearBuilt" register={register} type="number" />
          <SelectField label="Erwerbsart" name="acquisitionType" register={register} options={ACQUISITION_TYPES} />
          <TextAreaField label="Notizen" name="notes" register={register} className="sm:col-span-2" />
        </FormGrid>
      </FormCard>
    </FormSection>
  );
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/components/StepStammdaten.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/wizard/steps/StepStammdaten.tsx tests/components/StepStammdaten.test.tsx
git commit -m "feat(wizard): Bundesland dropdown prefilled from PLZ

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Gespeichertes `state` beim Laden normalisieren

**Files:**
- Modify: `lib/wizard/propertyEditLogic.ts:26`
- Test: `tests/wizard/propertyEditLogic.test.ts`

- [ ] **Step 1: Failing test ergänzen**

In `tests/wizard/propertyEditLogic.test.ts` am Ende der Datei (die Datei nutzt `makeProperty` und `mapPropertyToEditFormValues` bereits) anfügen:

```ts
describe('mapPropertyToEditFormValues state normalization', () => {
  it('maps spelling variants of a Bundesland to the canonical name', () => {
    expect(mapPropertyToEditFormValues(makeProperty({ state: ' sachsen ' })).state).toBe('Sachsen');
  });

  it('keeps an unrecognized free-text value instead of dropping it', () => {
    expect(mapPropertyToEditFormValues(makeProperty({ state: 'NRW' })).state).toBe('NRW');
  });
});
```

Falls `describe` dort nicht importiert ist: die Datei importiert `describe, it, expect` bereits aus `vitest` (Zeile 1).

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/wizard/propertyEditLogic.test.ts`
Expected: FAIL — `' sachsen '` bleibt unverändert statt `'Sachsen'`.

- [ ] **Step 3: Implementieren**

In `lib/wizard/propertyEditLogic.ts` den Import ergänzen:

```ts
import { normalizeState } from '@/lib/data/landTransferTaxRates';
```

und in `mapPropertyToEditFormValues` die Zeile `state: property.state,` ersetzen durch:

```ts
    state: normalizeState(property.state) || property.state,
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm vitest run tests/wizard/propertyEditLogic.test.ts`
Expected: PASS (alte und neue Tests).

- [ ] **Step 5: Commit**

```bash
git add lib/wizard/propertyEditLogic.ts tests/wizard/propertyEditLogic.test.ts
git commit -m "feat(wizard): normalize saved Bundesland when opening the edit form

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `CurrencyField` meldet Nutzereingaben

**Files:**
- Modify: `components/ui/CurrencyField.tsx`
- Test: `tests/components/CurrencyField.test.tsx`

- [ ] **Step 1: Failing test schreiben**

`tests/components/CurrencyField.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';

afterEach(cleanup);

interface Values {
  amount: number;
}

function Harness({ onUserEdit, setRef }: { onUserEdit?: () => void; setRef?: (setValue: (v: number) => void) => void }) {
  const { register, setValue } = useForm<Values>({ defaultValues: { amount: 0 } });
  setRef?.((v) => setValue('amount', v));
  return <CurrencyField label="Betrag" name="amount" register={register} onUserEdit={onUserEdit} />;
}

describe('CurrencyField onUserEdit', () => {
  it('fires when the user types', () => {
    const onUserEdit = vi.fn();
    render(<Harness onUserEdit={onUserEdit} />);
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '12' } });
    expect(onUserEdit).toHaveBeenCalledTimes(1);
  });

  it('does not fire for programmatic setValue', () => {
    const onUserEdit = vi.fn();
    let setAmount: (v: number) => void = () => {};
    render(<Harness onUserEdit={onUserEdit} setRef={(fn) => (setAmount = fn)} />);
    act(() => setAmount(99));
    expect(screen.getByLabelText('Betrag')).toHaveValue(99);
    expect(onUserEdit).not.toHaveBeenCalled();
  });

  it('still works without the prop', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '5' } });
    expect(screen.getByLabelText('Betrag')).toHaveValue(5);
  });
});
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/components/CurrencyField.test.tsx`
Expected: FAIL — `onUserEdit` wird nie aufgerufen (und TypeScript kennt die Prop nicht; Vitest bricht deshalb nicht ab, der erste Test schlägt fehl).

- [ ] **Step 3: Implementieren**

In `components/ui/CurrencyField.tsx` die Props um `onUserEdit` erweitern und an `register` durchreichen:

```tsx
export function CurrencyField<T extends FieldValues>({
  label,
  name,
  register,
  required = false,
  hint,
  className,
  onUserEdit,
}: {
  label: ReactNode;
  name: Path<T>;
  register: UseFormRegister<T>;
  required?: boolean;
  hint?: string;
  className?: string;
  /** Called when the user edits the field (not for programmatic setValue). */
  onUserEdit?: () => void;
}) {
  return (
    <label className={twMerge('block', className)}>
      <FieldLabel label={label} required={required} hint={hint} />
      <SuffixedInputBox suffix="€">
        <input
          type="number"
          step="0.01"
          className={SUFFIXED_INPUT_CLASS}
          onFocus={(e) => e.target.select()}
          {...register(name, { valueAsNumber: true, onChange: onUserEdit ? () => onUserEdit() : undefined })}
        />
      </SuffixedInputBox>
    </label>
  );
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/components/CurrencyField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/CurrencyField.tsx tests/components/CurrencyField.test.tsx
git commit -m "feat(ui): CurrencyField reports user edits via onUserEdit

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `StepKauf` mit Grunderwerbsteuer-Vorschlag

**Files:**
- Modify: `components/wizard/steps/StepKauf.tsx`, `components/property/immobiliendaten/PropertyEditForm.tsx`
- Test: `tests/components/StepKauf.test.tsx`

- [ ] **Step 1: Failing test schreiben**

`tests/components/StepKauf.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {}, taxStartsManual = false }: { overrides?: Partial<WizardFormValues>; taxStartsManual?: boolean }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
  });
  return (
    <FormProvider {...form}>
      <StepKauf taxStartsManual={taxStartsManual} />
    </FormProvider>
  );
}

const taxField = () => screen.getByLabelText('Grunderwerbsteuer');
const priceField = () => screen.getByLabelText(/Kaufpreis Wohnung/);

describe('StepKauf Grunderwerbsteuer suggestion', () => {
  it('fills in rate x purchase price in automatic mode and explains it', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    expect(screen.getByText(/Sachsen 5,5 % \(Vorschlag\)/)).toBeInTheDocument();
  });

  it('includes the parking price in the base', async () => {
    render(
      <Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, purchasePriceParking: 25000, parkingType: 'tiefgarage' }} />
    );
    await waitFor(() => expect(taxField()).toHaveValue(11000));
  });

  it('recalculates when the purchase price changes', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    fireEvent.change(priceField(), { target: { value: '200000' } });
    await waitFor(() => expect(taxField()).toHaveValue(11000));
  });

  it('asks for a Bundesland while none is chosen', () => {
    render(<Harness overrides={{ purchasePriceUnit: 175000 }} />);
    expect(taxField()).toHaveValue(0);
    expect(screen.getByText('Bundesland wählen, dann erscheint ein Vorschlag.')).toBeInTheDocument();
  });

  it('switches to manual on user edit, keeps the value and offers a reset', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));

    fireEvent.change(taxField(), { target: { value: '8000' } });
    fireEvent.change(priceField(), { target: { value: '200000' } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument());
    expect(taxField()).toHaveValue(8000);
    expect(screen.getByText(/wären/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    await waitFor(() => expect(taxField()).toHaveValue(11000));
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument();
  });

  it('never overwrites a saved value when taxStartsManual is set', async () => {
    render(<Harness taxStartsManual overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }} />);
    expect(taxField()).toHaveValue(1234);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('starts manual in the wizard when the current value differs from the suggestion', () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }} />);
    expect(taxField()).toHaveValue(1234);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('suggests 0 without complaint for a purchase price of 0', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 0 }} />);
    await waitFor(() => expect(screen.getByText(/Sachsen 5,5 % \(Vorschlag\)/)).toBeInTheDocument());
    expect(taxField()).toHaveValue(0);
  });
});
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/components/StepKauf.test.tsx`
Expected: FAIL — kein Vorschlag im Feld, keine Hinweise.

- [ ] **Step 3: `StepKauf` implementieren**

In `components/wizard/steps/StepKauf.tsx` Imports ergänzen (zu den bestehenden hinzufügen; `useWatch`/`useFormContext` sind schon importiert):

```tsx
import { useEffect, useState } from 'react';
import { landTransferTaxRatePercent, suggestLandTransferTax } from '@/lib/data/landTransferTaxRates';
```

Signatur und Anfang der Komponente ersetzen. Aus

```tsx
export function StepKauf() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePriceUnit = safeNum(values.purchasePriceUnit);
  const purchasePriceParking = parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0;
  const purchasePrice = purchasePriceUnit + purchasePriceParking;
```

wird

```tsx
export function StepKauf({ taxStartsManual = false }: { taxStartsManual?: boolean }) {
  const { register, control, setValue } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const purchasePriceUnit = safeNum(values.purchasePriceUnit);
  const purchasePriceParking = parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0;
  const purchasePrice = purchasePriceUnit + purchasePriceParking;

  const state = values.state ?? '';
  const landTransferTax = safeNum(values.landTransferTax);
  const suggestion = suggestLandTransferTax(state, purchasePrice);
  const rateText = `${String(landTransferTaxRatePercent(state) ?? '').replace('.', ',')} %`;

  // The wizard remounts this step on navigation, so derive the start mode from the values:
  // automatic only while the field is empty or still equals the suggestion. The edit form
  // always starts manual so a saved value is never overwritten.
  const [taxMode, setTaxMode] = useState<'auto' | 'manual'>(() =>
    taxStartsManual ? 'manual' : landTransferTax === 0 || landTransferTax === suggestion ? 'auto' : 'manual'
  );

  useEffect(() => {
    if (taxMode === 'auto' && suggestion !== null && suggestion !== landTransferTax) {
      setValue('landTransferTax', suggestion);
    }
  }, [taxMode, suggestion, landTransferTax, setValue]);

  let taxHint: React.ReactNode;
  if (suggestion === null) {
    taxHint = 'Bundesland wählen, dann erscheint ein Vorschlag.';
  } else if (taxMode === 'auto' || suggestion === landTransferTax) {
    taxHint = `${state} ${rateText} (Vorschlag)`;
  } else {
    taxHint = (
      <>
        {state} {rateText} wären {formatCurrency(suggestion)} ·{' '}
        <button type="button" className="font-semibold text-accent underline hover:no-underline" onClick={() => setTaxMode('auto')}>
          Zurücksetzen
        </button>
      </>
    );
  }
```

Den Import von React-Typen ergänzen (oben in der Datei):

```tsx
import type { ReactNode } from 'react';
```

und `let taxHint: React.ReactNode;` zu `let taxHint: ReactNode;` ändern.

Das Feld in der Karte „Kaufnebenkosten" ersetzen. Aus

```tsx
          <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
```

wird

```tsx
          <div>
            <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} onUserEdit={() => setTaxMode('manual')} />
            <p className="mt-1.5 text-[12px] text-text-dim">{taxHint}</p>
          </div>
```

- [ ] **Step 4: Bearbeiten-Formular anpassen**

In `components/property/immobiliendaten/PropertyEditForm.tsx` die Zeile

```tsx
          {activeSection === 'kauf' && <StepKauf />}
```

ersetzen durch

```tsx
          {activeSection === 'kauf' && <StepKauf taxStartsManual />}
```

- [ ] **Step 5: Test laufen lassen**

Run: `pnpm vitest run tests/components/StepKauf.test.tsx`
Expected: PASS. Bei Timing-Fehlern in `waitFor` Erwartung nicht abschwächen, sondern Ursache prüfen (Effekt setzt Wert, `useWatch` rendert neu).

- [ ] **Step 6: Commit**

```bash
git add components/wizard/steps/StepKauf.tsx components/property/immobiliendaten/PropertyEditForm.tsx tests/components/StepKauf.test.tsx
git commit -m "feat(wizard): overridable Grunderwerbsteuer suggestion by Bundesland

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Rechenlogik für den Gebäudeanteil

**Files:**
- Create: `lib/wizard/buildingShare.ts`
- Test: `tests/wizard/buildingShare.test.ts`

- [ ] **Step 1: Failing test schreiben**

`tests/wizard/buildingShare.test.ts`:

```ts
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
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/wizard/buildingShare.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Implementieren**

`lib/wizard/buildingShare.ts`:

```ts
/** Gebäudeanteil in Prozent (0–100, zwei Nachkommastellen) aus den Euro-Werten; null ohne Kaufpreis. */
export function buildingSharePercent(buildingValue: number, purchasePrice: number): number | null {
  if (!(purchasePrice > 0)) return null;
  return Math.round((buildingValue / purchasePrice) * 10000) / 100;
}

export function clampPercent(percent: number): number {
  if (Number.isNaN(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** Gebäudewert = Anteil × Kaufpreis (auf Cent), Grundstückswert = Rest. */
export function valuesFromBuildingShare(percent: number, purchasePrice: number): { buildingValue: number; landValue: number } {
  const buildingValue = Math.round(purchasePrice * clampPercent(percent)) / 100;
  const landValue = Math.round((purchasePrice - buildingValue) * 100) / 100;
  return { buildingValue, landValue };
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run tests/wizard/buildingShare.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wizard/buildingShare.ts tests/wizard/buildingShare.test.ts
git commit -m "feat(wizard): add building share percent/euro calculations

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: `BuildingShareFields` und Einbau in `StepAfaSteuer`

**Files:**
- Create: `components/wizard/BuildingShareFields.tsx`
- Modify: `components/wizard/steps/StepAfaSteuer.tsx`
- Test: `tests/components/BuildingShareFields.test.tsx`

- [ ] **Step 1: Failing test schreiben**

`tests/components/BuildingShareFields.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { BuildingShareFields } from '@/components/wizard/BuildingShareFields';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { formatCurrency } from '@/lib/formatters';

afterEach(cleanup);

function Harness({ price, building, land }: { price: number; building: number; land: number }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), buildingValue: building, landValue: land },
  });
  const [b, l] = useWatch({ control: form.control, name: ['buildingValue', 'landValue'] });
  return (
    <FormProvider {...form}>
      <BuildingShareFields purchasePrice={price} buildingLabel="Gebäudewert" landLabel="Grundstückswert" />
      <output data-testid="values">{JSON.stringify({ b, l })}</output>
    </FormProvider>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as { b: number; l: number };

describe('BuildingShareFields', () => {
  it('starts in euro mode with both euro fields', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    expect(screen.getByLabelText(/Gebäudewert/)).toHaveValue(140000);
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(35000);
    expect(screen.getByRole('button', { name: '€' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the current share when switching to percent and hides the euro inputs', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/Gebäudeanteil/)).toHaveValue(80);
    expect(screen.queryByLabelText(/^Gebäudewert/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveAttribute('readonly');
  });

  it('does not change the euro values just by switching modes', () => {
    render(<Harness price={175000} building={141234} land={33766} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.click(screen.getByRole('button', { name: '€' }));
    expect(values()).toEqual({ b: 141234, l: 33766 });
    expect(screen.getByLabelText(/Gebäudewert/)).toHaveValue(141234);
  });

  it('computes building value and remainder from the typed percentage', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/Gebäudeanteil/), { target: { value: '50' } });
    expect(values()).toEqual({ b: 87500, l: 87500 });
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(formatCurrency(87500));
  });

  it('keeps the percentage and recalculates when the purchase price changes', () => {
    const { rerender } = render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/Gebäudeanteil/), { target: { value: '50' } });
    rerender(<Harness price={200000} building={140000} land={35000} />);
    expect(values()).toEqual({ b: 100000, l: 100000 });
  });

  it('clamps a percentage above 100', () => {
    render(<Harness price={1000} building={800} land={200} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/Gebäudeanteil/), { target: { value: '150' } });
    expect(values()).toEqual({ b: 1000, l: 0 });
  });

  it('leaves the percent field empty without a purchase price', () => {
    render(<Harness price={0} building={0} land={0} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/Gebäudeanteil/)).toHaveValue(null);
  });
});
```

- [ ] **Step 2: Fehlschlag prüfen**

Run: `pnpm vitest run tests/components/BuildingShareFields.test.tsx`
Expected: FAIL — Komponente nicht gefunden.

- [ ] **Step 3: Komponente implementieren**

`components/wizard/BuildingShareFields.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { ReadOnlyField } from '@/components/ui/ReadOnlyField';
import { FieldLabel, SUFFIXED_INPUT_CLASS, SuffixedInputBox } from '@/components/ui/fieldStyles';
import { buildingSharePercent, valuesFromBuildingShare } from '@/lib/wizard/buildingShare';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

type Mode = 'eur' | 'pct';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

const SEGMENT_BASE = 'px-3 py-1 text-[12px] font-semibold';

/**
 * Gebäude-/Grundstückswert wahlweise in € (zwei Felder) oder als Gebäudeanteil in % (Grundstück = Rest).
 * Gespeichert wird immer in Euro (`buildingValue`/`landValue`); der Modus ist reiner UI-State.
 * Rendert in einem `FormGrid` (Fragment mit Switcher-Zeile + Feldern).
 */
export function BuildingShareFields({
  purchasePrice,
  buildingLabel,
  landLabel,
}: {
  purchasePrice: number;
  buildingLabel: ReactNode;
  landLabel: ReactNode;
}) {
  const { register, control, setValue, getValues } = useFormContext<WizardFormValues>();
  const buildingValue = safeNum(useWatch({ control, name: 'buildingValue' }));
  const landValue = safeNum(useWatch({ control, name: 'landValue' }));
  const [mode, setMode] = useState<Mode>('eur');
  const [percentText, setPercentText] = useState('');
  const previousPrice = useRef(purchasePrice);

  const applyPercent = useCallback(
    (text: string, price: number) => {
      const values = valuesFromBuildingShare(text.trim() === '' ? 0 : Number(text), price);
      setValue('buildingValue', values.buildingValue);
      setValue('landValue', values.landValue);
    },
    [setValue]
  );

  // In percent mode the share is the source of truth: a new purchase price recomputes the euro values.
  useEffect(() => {
    if (previousPrice.current === purchasePrice) return;
    previousPrice.current = purchasePrice;
    if (mode === 'pct') applyPercent(percentText, purchasePrice);
  }, [purchasePrice, mode, percentText, applyPercent]);

  function switchTo(next: Mode) {
    if (next === mode) return;
    if (next === 'pct') {
      const percent = buildingSharePercent(safeNum(getValues('buildingValue')), purchasePrice);
      setPercentText(percent === null ? '' : String(percent));
    }
    setMode(next);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <span className="text-[13px] font-semibold text-text-secondary">Aufteilung Gebäude / Grundstück</span>
        <div role="group" aria-label="Eingabeart" className="inline-flex overflow-hidden rounded-[8px] border border-black/[0.12]">
          <button
            type="button"
            aria-pressed={mode === 'eur'}
            onClick={() => switchTo('eur')}
            className={`${SEGMENT_BASE} ${mode === 'eur' ? 'bg-accent text-white' : 'bg-white text-text-secondary hover:bg-black/[0.04]'}`}
          >
            €
          </button>
          <button
            type="button"
            aria-pressed={mode === 'pct'}
            onClick={() => switchTo('pct')}
            className={`${SEGMENT_BASE} ${mode === 'pct' ? 'bg-accent text-white' : 'bg-white text-text-secondary hover:bg-black/[0.04]'}`}
          >
            %
          </button>
        </div>
      </div>

      {mode === 'eur' ? (
        <>
          <CurrencyField label={buildingLabel} name="buildingValue" register={register} required />
          <CurrencyField label={landLabel} name="landValue" register={register} required />
        </>
      ) : (
        <>
          <label className="block">
            <FieldLabel label="Gebäudeanteil" required hint={`= ${formatCurrency(buildingValue)}`} />
            <SuffixedInputBox suffix="%">
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={percentText}
                onChange={(e) => {
                  setPercentText(e.target.value);
                  applyPercent(e.target.value, purchasePrice);
                }}
                onFocus={(e) => e.target.select()}
                className={SUFFIXED_INPUT_CLASS}
              />
            </SuffixedInputBox>
          </label>
          <ReadOnlyField label="Grundstückswert (Rest)" value={formatCurrency(landValue)} />
        </>
      )}
    </>
  );
}
```

`landLabel` wird im %-Modus nicht verwendet (dort ist das Feld „Grundstückswert (Rest)"). Der Test sucht per `/Grundstückswert/`, das passt in beiden Modi.

- [ ] **Step 4: In `StepAfaSteuer` einbauen**

In `components/wizard/steps/StepAfaSteuer.tsx`:

1. Import `CurrencyField` entfernen und `BuildingShareFields` importieren. Die Zeile
   `import { CurrencyField } from '@/components/ui/CurrencyField';`
   ersetzen durch
   `import { BuildingShareFields } from '@/components/wizard/BuildingShareFields';`
2. In der Komponente `register` aus der Destrukturierung streichen: `const { register, control } = useFormContext<WizardFormValues>();` wird zu `const { control } = useFormContext<WizardFormValues>();`
3. Die zwei `CurrencyField`-Blöcke (Gebäudewert, Grundstückswert) im `FormGrid` der Karte „AfA & Steuer" ersetzen durch:

```tsx
            <BuildingShareFields
              purchasePrice={purchasePrice}
              buildingLabel={<>Gebäudewert (<BerechnungshilfeLink />)</>}
              landLabel={<>Grundstückswert (<BerechnungshilfeLink />)</>}
            />
```

Der Rest (AfA-Satz, Grenzsteuersatz, Abweichungswarnung, `CalcSummary`) bleibt unverändert.

- [ ] **Step 5: Test laufen lassen**

Run: `pnpm vitest run tests/components/BuildingShareFields.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/wizard/BuildingShareFields.tsx components/wizard/steps/StepAfaSteuer.tsx tests/components/BuildingShareFields.test.tsx
git commit -m "feat(wizard): euro/percent switcher for building share

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Feld-Dokumentation nachziehen

Das Projekt arbeitet spec-first; die Feld-Specs beschreiben Bundesland als `[Textfeld]`, Grunderwerbsteuer als `[Währungsfeld]` und Gebäude-/Grundstückswert als reine Euro-Eingaben. Nach diesem Feature stimmt das nicht mehr. Alle Pfade relativ zum Repo-Root (`..` von `web/`).

**Files:**
- Modify: `docs/specs/spec-property-setup.md`, `docs/specs/spec-immobiliendaten-tab.md`, `docs/specs/spec-data-model.md`, `immobilien_datenmodell_v2.md`

- [ ] **Step 1: Bundesland in beiden Feld-Specs ersetzen**

In `docs/specs/spec-property-setup.md` (Zeile 33) und `docs/specs/spec-immobiliendaten-tab.md` (Zeile 45) die Zeile

```
Bundesland:     [Textfeld]
```

ersetzen durch

```
Bundesland:     [Picker]   16 Länder; wird bei vollständiger PLZ (5 Ziffern) vorbelegt, bei PLZ in zwei Ländern leer + Hinweis, jederzeit änderbar
```

- [ ] **Step 2: Grunderwerbsteuer in beiden Feld-Specs ersetzen**

In `docs/specs/spec-property-setup.md` (Zeile 96) und `docs/specs/spec-immobiliendaten-tab.md` (Zeile 108) die Zeile

```
Grunderwerbsteuer:           [Währungsfeld]
```

ersetzen durch

```
Grunderwerbsteuer:           [Währungsfeld]  Vorschlag = Landessatz × Gesamtkaufpreis (Wohnung + Stellplatz), überschreibbar, "Zurücksetzen" stellt den Vorschlag wieder her
```

- [ ] **Step 3: Gebäude-/Grundstückswert in beiden Feld-Specs ergänzen**

In `docs/specs/spec-property-setup.md` (Zeilen 209–210, Schritt 7) und `docs/specs/spec-immobiliendaten-tab.md` (Zeilen 241–242) direkt nach der Zeile `Grundstückswert (aus Regierungs-Excel) *: [Währungsfeld]` einfügen:

```
                                          Switcher [€ | %]: im %-Modus ein Feld "Gebäudeanteil" (0–100 %),
                                          Grundstückswert = Rest; gespeichert wird immer in Euro
```

- [ ] **Step 4: Datenmodell-Dokumente anpassen**

In `docs/specs/spec-data-model.md` (Zeile 55) `state: string;` ändern zu

```
state: string;                            // kanonischer Ländername (16 Bundesländer), vorbelegt aus postalCode
```

und Zeile 94 `landTransferTax: number;                  // Grunderwerbsteuer` ändern zu

```
landTransferTax: number;                  // Grunderwerbsteuer (Vorschlag: Landessatz × Gesamtkaufpreis, überschreibbar)
```

In `immobilien_datenmodell_v2.md` (Zeile 324) den Hinweis-Absatz um einen Satz erweitern; am Ende der Zeile anfügen:

```
 In der UI sind beide Werte alternativ über einen Gebäudeanteil in % eingebbar (Grundstück = Rest); gespeichert werden weiterhin absolute Euro-Werte.
```

Die Änderungstabelle ab Zeile 733 (`building_value`/`land_value` „als direkte manuelle Eingaben") bleibt unverändert: sie ist ein historisches Änderungsprotokoll von v2.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/spec-property-setup.md docs/specs/spec-immobiliendaten-tab.md docs/specs/spec-data-model.md immobilien_datenmodell_v2.md
git commit -m "docs(specs): update field docs for Bundesland picker, Grunderwerbsteuer suggestion and building share switcher

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Abschluss — Roadmap, Gesamtprüfung, Sichtprüfung

**Files:**
- Modify: `../README.md` (Repo-Root), `../docs/superpowers/specs/2026-09-29-plz-bundesland-grunderwerbsteuer-gebaeudeanteil-design.md`

- [ ] **Step 1: Drei Roadmap-Einträge aus der README entfernen**

In `README.md` (Repo-Root) die drei Absätze „**Bundesland-Erkennung aus PLZ**", „**Grunderwerbsteuer automatisch nach Bundesland**" und „**Gebäudeanteil prozentual auswählbar**" samt den Leerzeilen dazwischen löschen. Die Einträge davor („Degressive AfA") und danach („KI-Objekterfassung") bleiben.

- [ ] **Step 2: Spec um die zwei Abweichungen ergänzen**

Im Spec am Ende von Abschnitt 3 „Fehlerfälle" den Punkt „Gespeichertes `state` nicht erkennbar …" ersetzen durch:

```
- Gespeichertes `state` nicht erkennbar (`normalizeState` liefert leer): der Text bleibt als zusätzliche Dropdown-Option „<Text> (bitte prüfen)" erhalten, damit der Autosave ihn nicht überschreibt; kein Vorschlag, bis ein Land gewählt ist.
```

und in Abschnitt 2.2 nach „Startzustand: …" ergänzen:

```
Im Wizard wird der Startzustand aus den Werten abgeleitet (Automatisch, wenn das Feld 0 ist oder dem Vorschlag entspricht), weil der Schritt bei der Navigation neu montiert wird und einen manuellen Wert sonst überschreiben würde.
```

- [ ] **Step 3: Gesamtprüfung**

Run: `pnpm test`
Expected: alle Tests PASS (neue und bestehende).

Run: `pnpm exec tsc --noEmit`
Expected: keine Fehler.

Run: `pnpm lint`
Expected: keine Fehler (Warnungen zu `plzToState.ts` entfallen wegen `eslint-disable`).

- [ ] **Step 4: Sichtprüfung im Browser**

Der Wizard liegt hinter dem Login (Supabase). Wenn eine lokale Supabase-Instanz läuft (`supabase start`, `.env.local` vorhanden), `pnpm dev` starten, `/properties/new` öffnen und prüfen: PLZ `01099` → Sachsen + „Aus PLZ erkannt"; PLZ `65326` → Hinweis mit beiden Ländern; Kaufpreis 175000 → Grunderwerbsteuer 9.625; Steuer von Hand ändern → „Zurücksetzen"; im Schritt „AfA & Steuer" € → % umschalten. Läuft keine Instanz, das im Abschlussbericht ausdrücklich als **nicht** geprüft nennen.

- [ ] **Step 5: Commit**

```bash
git add ../README.md ../docs/superpowers/specs/2026-09-29-plz-bundesland-grunderwerbsteuer-gebaeudeanteil-design.md
git commit -m "docs: mark PLZ/Grunderwerbsteuer/Gebäudeanteil roadmap items as done

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
