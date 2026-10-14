# Degressive AfA (§ 7 Abs. 5a EStG) mit planbarem Wechsel zu linear

**Problem:** Volta rechnet die AfA ausschließlich linear (`Basis × Satz`, im Erwerbsjahr anteilig). Für Neubauten, die ab 2023 fertiggestellt wurden, gibt es seit dem Wachstumschancengesetz die degressive AfA (5 % vom Restwert). Sie lässt sich weder auswählen noch abbilden, und der Restwert wird nirgends angezeigt.

**Ziel:**

1. Pro Objekt wählbare AfA-Methode: Linear oder Degressiv 5 %.
2. Bei Degressiv: planbarer Wechsel zu linear ab einem Jahr, mit Anzeige des rechnerisch optimalen Jahres und einem Ein-Klick-Weg, den Wechsel vorzumerken.
3. Die Steuer-Karte zeigt die aktuelle AfA, die Steuerersparnis, den Restwert und den Wechselstatus. Alle Steuerberechnungen (laufendes Jahr, Jahresübersicht, Prognose, Cashflow nach Steuern) verwenden dieselbe AfA.

Gestaltungsvorlage sind die Prototypen aus der Brainstorming-Session (Karte mit vier Kennzahlen, Wechsel-Zeile in fünf Zuständen, Vorschau-Feld beim Vormerken, Ausblick-Zeile). Details dürfen bei der Umsetzung im Stil der bestehenden Komponenten verbessert werden.

---

## Rechtsgrundlage (Stand: Gesetzestext gesetze-im-internet.de, gelesen 12.10.2026)

| Punkt | Regel |
|---|---|
| Satz | 5 % **vom jeweiligen Restwert** (fallende Jahresbeträge), fest, nicht wählbar (§ 7 Abs. 5a Satz 4). |
| Alternative zu | der linearen AfA nach § 7 Abs. 4 Satz 1 Nr. 2 a (3 %, Fertigstellung ab 1.1.2023). |
| Objekt | Wohnzwecke, EU/EWR, selbst hergestellt oder **bis zum Ende des Fertigstellungsjahres angeschafft** (Neubau). |
| Zeitfenster | Herstellungsbeginn (Datum der Baubeginnsanzeige) oder rechtswirksamer Kaufvertrag nach dem 30.9.2023 und vor dem 1.10.2029. |
| Erstes Jahr | zeitanteilig, § 7 Abs. 1 Satz 4 gilt entsprechend (Satz 5): 1/12 pro Monat ab Anschaffungsmonat. |
| Keine AfaA | Außergewöhnliche Abnutzung ist bei degressiver AfA nicht zulässig (Satz 6). |
| Wechsel | Nur degressiv → linear, jederzeit, nicht umkehrbar (Sätze 7, 8). Danach: Restwert und der nach Abs. 4 unter Berücksichtigung der Restnutzungsdauer maßgebende Prozentsatz. |
| Lineare Referenz | 3 % (33⅓ Jahre Nutzungsdauer) für ab 2023 fertiggestellte Gebäude. Kürzere tatsächliche Nutzungsdauer ist nach Abs. 4 Satz 2 möglich. |

**Lesart des Wechsels (nicht amtlich bestätigt):** Nach dem Wechsel wird der eingefrorene Restwert gleichmäßig auf die Restnutzungsdauer verteilt: `Restwert ÷ (Nutzungsdauer − bisher vergangene Zeit)` pro Jahr, konstant. Ein BMF-Schreiben wurde nicht gefunden; die Lesart ist im Code mit einem Kommentar zu kennzeichnen.

---

## Out of Scope

- **Investment-Rechner** (`investment_calculations`, `InvestmentInputSections`): bleibt linear. Er wird laut README ohnehin neu gebaut. Beim Übernehmen in ein Objekt gilt der Default `linear`.
- **Sonder-AfA nach § 7b** und deren Wirkung auf den Restwert.
- **Nachträgliche Herstellungskosten** nach dem Erwerb als Zeitreihe (Basis bleibt die Summe aus Gebäudewert, anteiligen Nebenkosten und `renovation_afa_eligible`).
- **Außergewöhnliche AfA (AfaA)**, Teilwertabschreibung.
- **Erbschaft/Schenkung** (siehe README-Hinweis zur Buchwertfortführung).
- Kein Restwert-Zeilenzusatz in der Jahresübersicht (`YearOverviewCard`); deren AfA-Zeile erhält nur die korrekten Werte.
- Als Kaufvertragsdatum dient `purchase_date`; die Warnung prüft das Zeitfenster 1.10.2023–30.9.2029 gegen dieses Datum.

---

## 1. Datenmodell

**Migration** `web/supabase/migrations/20261012120000_degressive_afa.sql`, nur Tabelle `properties`:

```sql
alter table properties
  add column depreciation_method text not null default 'linear'
    check (depreciation_method in ('linear', 'degressiv_5a')),
  add column degressive_switch_year int
    check (degressive_switch_year is null or degressive_switch_year between 2000 and 2200);
```

- Bestehende Objekte bleiben `linear`.
- `degressive_switch_year` ist der **Plan**: Ab diesem Kalenderjahr wird linear gerechnet. Er wird nur bei `degressiv_5a` ausgewertet. Es gibt keinen Hintergrundjob: Der Wechsel ist wirksam, sobald `Jahr ≥ degressive_switch_year` gilt.
- `depreciation_rate` bleibt bei beiden Methoden erhalten. Bei Degressiv bedeutet es „linearer Satz nach Wechsel" und liefert die Nutzungsdauer `1 / depreciation_rate`.
- `web/lib/supabase/types.ts`: Row/Insert/Update von `properties` ergänzen.

## 2. Rechenkern

**Datei:** `web/lib/calculations/depreciationSchedule.ts` (rein, ohne I/O, Vitest-getestet, UTC-Datumslogik wie `dateHelpers`).

```ts
export type DepreciationMethod = 'linear' | 'degressiv_5a';

export interface DepreciationPlanInput {
  basis: number;                 // AfA-Bemessungsgrundlage (afaBasis())
  method: DepreciationMethod;
  linearRate: number;            // z. B. 0.03
  economicTransferDate: Date;    // AfA-Beginn
  switchYear: number | null;     // nur bei degressiv_5a relevant
}

export interface DepreciationYear {
  year: number;
  amount: number;                // AfA des Jahres
  bookValueEnd: number;          // Restwert zum Jahresende
  phase: 'linear' | 'degressiv' | 'linear_nach_wechsel';
}

export function depreciationSchedule(input: DepreciationPlanInput, untilYear: number): DepreciationYear[];
export function depreciationForYear(input: DepreciationPlanInput, year: number): DepreciationYear | null; // null vor dem Erwerbsjahr
export function optimalSwitchYear(input: { economicTransferDate: Date; linearRate: number }): number | null; // null bei Satz ≤ 0
```

**Regeln:**

- Erwerbsjahr: Anteil `f = (13 − Monat(economicTransferDate)) / 12`; alle weiteren Jahre `f = 1`. Das entspricht der bestehenden Zählung der Eigentumsmonate in `annualTaxableIncomeBreakdown`.
- **Linear:** `amount = min(basis × linearRate × f, Restwert)`.
- **Degressiv vor dem Wechsel:** `amount = Restwert_Jahresanfang × 0,05 × f`.
- **Ab Wechseljahr** (`year ≥ switchYear`): Der Betrag wird einmal bei Wechselbeginn festgelegt: `Restwert_bei_Wechsel ÷ (Nutzungsdauer − vergangene_Zeit)` mit `Nutzungsdauer = 1 / linearRate` und `vergangene_Zeit` = Summe der Jahresanteile vor dem Wechseljahr. Danach konstant, begrenzt auf den Restwert. Ist `Nutzungsdauer − vergangene_Zeit ≤ 0`, wird der gesamte Restwert abgeschrieben. Ein Wechseljahr ≤ Erwerbsjahr wird wie das Erwerbsjahr + 1 behandelt (Validierung verhindert es im Formular).
- Sobald der Restwert unter 0,005 € fällt, ist der Betrag 0.
- **Optimales Wechseljahr:** das erste Jahr nach dem Erwerbsjahr, in dem `vergangene_Zeit > Nutzungsdauer − 20` gilt (`20 = 1 / 0,05`). Bei 3 % und Erwerb im Jahr 2026 ergibt das 2040. Der Break-even gilt, ab dem `1 / (Nutzungsdauer − t) > 5 %` ist, also der lineare Betrag den degressiven übersteigt; simulativ bestätigt als Maximum der kumulierten AfA nach 20 Jahren und des Barwerts bei 3 % und 5 %.

## 3. Anbindung an die Steuerberechnung

Das bestehende Muster „optional und additiv" wird beibehalten, damit lineare Objekte byte-identisch bleiben:

- `AnnualTaxableIncomeInput` (damit auch `AnnualTaxableIncomeBreakdownInput`) und `TaxScenarioInput` bekommen das optionale Feld `depreciationAmountYear?: number`. Wenn gesetzt, ersetzt es die bisherige Berechnung (`afaBasis × depreciationRate`, inkl. Erwerbsjahr-Anteil). `afaBasis` und `depreciationRate` bleiben Pflichtfelder.
- **Neue Datei** `web/lib/data/propertyDepreciation.ts`: `depreciationPlanFor(property, basis)` baut den `DepreciationPlanInput`; `depreciationAmountOverride(property, basis, year)` liefert `undefined` bei `linear` (Legacy-Pfad bleibt aktiv) und sonst den Jahresbetrag aus dem Plan.
- Anzupassen: `computeTaxCurrentYear` (inkl. `yearOverride`), `computeTaxForecastYear` und `propertySummary.ts`. Die Prognose kennt das Erwerbsdatum ohnehin über `property.economic_transfer_date`.
- Ein Jahr vor dem Erwerbsjahr liefert der Plan `null`; der bestehende Frühausstieg in `annualTaxableIncomeBreakdown` (keine Eigentumsmonate) bleibt unverändert.

## 4. Wizard und Bearbeitung (`StepAfaSteuer`)

`PropertyEditForm` rendert dieselbe Komponente, daher gelten die Änderungen in beiden Flows.

**Formularkarte „AfA & Steuer":**

- **Neu:** Auswahl „AfA-Methode" (Linear | Degressiv 5 %), Default Linear.
- Beim Umschalten auf Degressiv wird `depreciationRate` auf 3 % gesetzt (§ 7 Abs. 5a ersetzt die 3-%-Regel) und das Feld „AfA-Satz" ausgeblendet. Die Methode heißt im Dropdown „Degressiv 5 %" (ohne Paragraphenhinweis).
- Das Wechseljahr wird **nicht** im Wizard/Edit erfasst, sondern nur im Steuer-Tab (Vormerken). Das Feld `degressiveSwitchYear` bleibt in den Formularwerten, damit ein gespeicherter Plan beim Speichern erhalten bleibt.
- **Weiche Warnung** (`FormWarning`, keine Sperre) bei Degressiv, wenn `yearBuilt < 2023`, das Erwerbsjahr nach dem Baujahr liegt (Anschaffung nicht im Fertigstellungsjahr) oder `purchase_date` außerhalb des Zeitfensters 1.10.2023–30.9.2029 liegt. Text nennt die Bedingungen (Neubau, Kauf im Fertigstellungsjahr, Vertrag zwischen 1.10.2023 und 30.9.2029).

**`CalcSummary`:** gleiche Zeilen für beide Methoden: Bemessungsgrundlage, „AfA {Erwerbsjahr} (x Monate)", „AfA {Folgejahr}", „Restwert Ende {Folgejahr}", Summe „AfA / Monat ({Folgejahr})". Als Erwerbsdatum dient `values.economicTransferDate` (Fallback: heutiges Datum).

**Daten:** `wizardLogic.ts` (Werte, Defaults, `toDb`) und `propertyEditLogic.ts` (Mapping aus der Row) um `depreciationMethod` und `degressiveSwitchYear` ergänzen. Beim Speichern wird `degressive_switch_year` auf `null` gesetzt, wenn die Methode `linear` ist.

## 5. Steuer-Tab: AfA-Karte

`AfaBasisCard` wird zur AfA-Karte (gleiche Datei oder Umbenennung auf `AfaCard`).

**Oben vier Kennzahlen:**

- AfA {Jahr} (Untertitel: „5 % vom Restwert", „Restwert ÷ Restnutzungsdauer" oder „3 % der Basis")
- Steuerersparnis {Jahr} (≈ AfA × Grenzsteuersatz, Untertitel „bei x % Grenzsteuersatz")
- Restwert Ende {Jahr} (Untertitel „von … Basis"), bei **beiden** Methoden
- Methode („Degressiv 5 %", „Linear 3 %", „Linear (seit 2040)"), ohne Paragraphenhinweis

**Darunter** eine kleine Zeile mit den bisherigen Stammdaten (Grundstückswert, Gebäudewert, Bemessungsgrundlage, Grenzsteuersatz), damit keine bisherige Information verloren geht.

**Wechsel-Zeile (nur bei Degressiv).** Der Zustand wird aus `today.getUTCFullYear()`, `switchYear` und dem optimalen Jahr abgeleitet (reine Funktion `switchState(...)`, getestet):

| Zustand | Bedingung | Darstellung |
|---|---|---|
| `weit` | kein Plan, Jahr < optimal − 1 | grau: „Wechsel empfohlen ab 2040 · in 14 Jahren", Link „Jetzt vormerken" |
| `faellig` | kein Plan, Jahr ∈ {optimal − 1, optimal} | gelb mit Button „Wechsel ab 2040 vormerken" |
| `ueberfaellig` | kein Plan, Jahr > optimal | gelb: „Wechsel wäre seit … sinnvoll", entgangene AfA und Steuer dieses Jahr, Button „Ab {Jahr} wechseln" |
| `vorgemerkt` | Plan, Wechseljahr > Jahr | blau: „Wechsel vorgemerkt: ab …", Links „Ändern" und „Zurücknehmen" |
| `aktiv` | Plan, Wechseljahr ≤ Jahr | grün: „Linear seit …", ohne Rückgängig |

**Vormerken:** Ein Klick auf einen der Buttons öffnet unter der Zeile ein Vorschau-Feld (kein Dialog): Jahres-Dropdown (Default = Vorschlag, ab laufendem Jahr), Tabelle „ohne Wechsel / mit Wechsel / Wirkung in Steuer" für Wechseljahr, +5 und +10 Jahre sowie „AfA endet". Hinweis: Volta übernimmt den Wechsel automatisch ab dem Jahr; er ist bis dahin änderbar; steuerlich ist er nicht umkehrbar, sobald er in einer Steuererklärung angewendet wurde. Buttons „Wechsel vormerken" und „Abbrechen".

**Ausblick-Zeile:** „AfA in 5 Jahren …, in 10 Jahren …, AfA endet …".

**Server Action** `setDegressiveSwitchYear(propertyId, year | null)`: nur für Objekte mit `depreciation_method = 'degressiv_5a'`; Jahr größer als das Erwerbsjahr; schreibt `degressive_switch_year`; `revalidatePath` für die Objektseite. Zugriffsschutz wie bei den übrigen Property-Actions (RLS).

## 6. Fehler- und Randfälle

- `basis ≤ 0`: Plan liefert 0, Karte zeigt „–" statt Restwert.
- Methode `degressiv_5a` bei `yearBuilt < 2023`: gerechnet wird trotzdem (Nutzer entscheidet), die Warnung bleibt sichtbar.
- Wechseljahr in der Vergangenheit beim Speichern erlaubt (Nachtragen), aber nicht vor dem Erwerbsjahr.
- Methode wird von degressiv auf linear gestellt: `degressive_switch_year` wird gelöscht; die Steuerjahre werden rückwirkend linear gerechnet (Hinweis im Edit-Flow).
- Linearer Satz ≠ 3 % bei Degressiv ist erlaubt; die Nutzungsdauer folgt aus `1 / depreciation_rate`.

## 7. Tests

- `depreciationSchedule`: Beispiel Basis 300.000 €, Erwerb Januar 2026: 15.000 €, 14.250 €, 13.537,50 €; Restwert nach 14 Jahren ≈ 146.298 €; Wechsel 2040: linear ≈ 7.567 €/Jahr, Ende 2059. Erwerb im März: Erwerbsjahr = 10/12 des Jahresbetrags. Linear identisch zum Legacy-Betrag (`depreciationYearly`, `depreciationProratedInAcquisitionYear`). Randfälle: Basis 0, Satz 2 %, Wechsel im Erwerbsjahr, Restwert vollständig abgeschrieben.
- `optimalSwitchYear`: 2040 bei 3 % (Erwerb Januar und März 2026), Verhalten bei 2 % und 2,5 %.
- `switchState`: alle fünf Zustände an den Grenzjahren.
- `taxCalculator`: mit `depreciationAmountYear` ersetzt der Wert die Legacy-Berechnung; ohne bleibt alles byte-identisch (bestehende Tests unverändert grün).
- `propertyTax`/`propertySummary`: degressives Objekt liefert in Jahresübersicht, Prognose und Cashflow dieselbe AfA wie der Plan.
- `wizardLogic`/`propertyEditLogic`: Roundtrip der neuen Felder, `degressive_switch_year` wird bei Linear verworfen.
- Komponenten: `StepAfaSteuer` (Umschalten setzt 3 %, Wechseljahr-Feld nur bei Degressiv, Warnung), AfA-Karte (Zustände, Vorschau-Feld, Zurücknehmen).

## 8. Offene Punkte

- **Lesart der Restnutzungsdauer nach dem Wechsel** (siehe oben) nicht amtlich verifiziert; bei Bedarf Steuerberater oder BMF-Schreiben prüfen.
- **Zeitanteil der „vergangenen Zeit"** (Erwerbsjahr als Teiljahr gezählt) ist eine Annahme, durch Tests festgeschrieben.
- Die README-Roadmap-Zeile „Degressive AfA" nach Abschluss entfernen und die verbleibenden Lücken (§ 7b, nachträgliche Herstellungskosten, Investment-Rechner) dort vermerken.
