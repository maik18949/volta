# Cashflow-Tab: Kreditrate vor wirtschaftlichem Übergang

**Problem:** Die Cashflow-Jahrestabelle blendet jede Zeile — inklusive Kreditrate — komplett aus ("–"), solange der Monat vor `economic_transfer_date` (wirtschaftlicher Übergang) liegt. Läuft das Darlehen aber schon vorher (`loan_start_date` < `economic_transfer_date`), zahlt der Nutzer in dieser Zwischenzeit real schon die volle monatliche Rate — die aktuell nirgends im Cashflow auftaucht.

Konkretes Beispiel (Objekt "Eigentumswohnung Dresden"): `loan_start_date` = 01.12.2025, `economic_transfer_date` = 01.02.2026, `monthly_mortgage` = 1.242,85 €. Dezember 2025 und Januar 2026 zeigen aktuell keine Kreditrate, obwohl beide Monate real abgebucht wurden.

**Ziel:** Die Kreditrate-Zeile (und die davon abgeleitete "Cashflow vor/nach Steuern"-Zeile) ab `loan_start_date` zeigen, auch wenn das vor dem wirtschaftlichen Übergang liegt. Alle anderen Zeilen (Einnahmen, Nebenkosten etc.) bleiben unverändert an den wirtschaftlichen Übergang gekoppelt.

## Out of Scope

- **Card 1 "Prognose / Monat"** (`computeCashflowForecastMonth`): rein hypothetischer Settings-Monat ohne Bezug zu echten Daten — unverändert.
- **`loan_disbursements` (Auszahlungstranchen)**: bleiben ausschließlich für die Steuer-Abzugsfähigkeit relevant (bereits implementiert, `stagedInterestForCalendarYear`). Für die Kreditrate-Sichtbarkeit im Cashflow wird stattdessen das bereits vorhandene, immer gesetzte Feld `loan_start_date` genutzt — einfacher und passt zur Semantik ("Darlehensbeginn").
- **Steuereffekt-Berechnung** (`computeTaxCurrentYear`, `taxEffectMonthly`): bleibt exakt wie heute — Divisor weiterhin die Eigentumsmonate, nicht die Kreditmonate. Für Monate vor dem wirtschaftlichen Übergang wird kein Steuereffekt angezeigt oder neu berechnet.
- Ungenauigkeiten einzelner realer Bankbuchungen (z. B. ein abweichender Teilmonat direkt nach einer Teilauszahlung) werden nicht nachgebildet — die Kreditrate wird immer mit dem flachen `monthly_mortgage`-Betrag ab `loan_start_date` (tagesgenau anteilig im Startmonat) dargestellt, wie auch in allen bereits laufenden Monaten.
- Der Fall "Darlehen beginnt NACH dem wirtschaftlichen Übergang" ändert sich nicht (bleibt wie heute: volle Kreditrate ab Übergang, unabhängig von `loan_start_date`).

## Verhalten

### Neues Gate: `mortgageStartDate`

```
mortgageStartDate = loanStartDate < economicTransferDate ? loanStartDate : economicTransferDate
```

Pro Monat wird zusätzlich zu `ownerFraction` (bestehend, Basis `economicTransferDate`) ein `mortgageFraction` berechnet (gleiche Tagesanteil-Logik wie `ownershipDayFraction`, nur mit `mortgageStartDate` als Basis). Für Monate, die bereits `isOwned` sind, ist `mortgageFraction` immer ≥ `ownerFraction` (meist 1) — dort ändert sich nichts.

### Kreditrate-Zeile

- **Betrag:** `monthly_mortgage * mortgageFraction` (statt bisher nur innerhalb `isOwned`-Monaten gesetzt).
- **Sichtbarkeit:** ein neues Flag `hasMortgagePayment` (= `isOwned || mortgageFraction > 0`) ersetzt `isOwned` als Sichtbarkeits-Check für diese eine Zeile. Alle anderen Zeilen (Einnahmen, Kosten Wohnung/Stellplatz) bleiben bei `isOwned`.

### Cashflow vor Steuern

Für einen Monat mit `hasMortgagePayment && !isOwned` sind alle anderen Line-Item-Felder 0 (kein Eigentum, keine Miete/Kosten) — `cashflowBeforeTax` ergibt sich automatisch als `-monthly_mortgage * mortgageFraction`. Die Zeile "Cashflow vor Steuern" verwendet ab jetzt ebenfalls `hasMortgagePayment` statt `isOwned` als Sichtbarkeits-Check (bisher: `col.isOwned ? formatCurrency(...) : '–'` in `CashflowYearTable.tsx`).

### Steuererstattung Ø / Mon

**Unverändert.** Bleibt bei `col.isOwned` — für Vor-Übergang-Monate weiterhin "–". Keine Änderung an `computeTaxCurrentYear`/`taxEffectMonthly`.

### Cashflow nach Steuern

Für `hasMortgagePayment && !isOwned`-Monate: `cashflowAfterTax = lineItems.cashflowBeforeTax` (kein Steuereffekt addiert — identisch zu "Cashflow vor Steuern" in genau diesen Monaten, weil kein Steuereffekt zutrifft). Für `isOwned`-Monate unverändert die bestehende Formel (`cashflowBeforeTax + currentYearTaxEffectMonthly`). Die JSX-Zeile selbst (`col.cashflowAfterTax !== null ? ... : '–'`) braucht keine Änderung — sie zeigt bereits jeden nicht-`null`-Wert an.

### Ø Monat / Total (Summenspalten)

Neuer Zähler `mortgageMonthCount` = Summe von `mortgageFraction` über alle 12 Monate des Jahres (analog zu `ownershipMonthCount`, aber Basis `mortgageStartDate`).

- **`avgColumn`/`totalColumn` existieren jetzt, sobald `ownershipMonthCount > 0 ODER mortgageMonthCount > 0`** (bisher nur bei `ownershipMonthCount > 0`) — relevant für Jahre ganz vor dem wirtschaftlichen Übergang (z. B. 2025 im Dresden-Beispiel: 0 Eigentumsmonate, aber 1 Kreditmonat Dezember).
- **Alle Felder außer `mortgage` und `cashflowBeforeTax`** verwenden weiterhin `ownershipMonthCount` als Divisor (0, wenn keine Eigentumsmonate — Ergebnis dann 0, nicht "–", da das Objekt selbst nicht mehr `null` ist; siehe Grenzfall unten).
- **`mortgage` und `cashflowBeforeTax`** verwenden `mortgageMonthCount` als Divisor. `totalColumn.mortgage`/`totalColumn.cashflowBeforeTax` schließen die Vor-Übergang-Monate mit ein (die übrigen Felder in `totalColumn` nicht, da für diese Monate ja 0).
- **"Cashflow nach Steuern" Ø/Total** (`afterTaxAvg`/`afterTaxTotal` in `CashflowYearTable.tsx`): Formel bleibt unverändert (`avgColumn.cashflowBeforeTax + taxEffectMonthly` bzw. `totalColumn.cashflowBeforeTax + taxEffectMonthly * ownershipMonthCount`) — durch die Erweiterung von `avgColumn`/`totalColumn` fließen die Vor-Übergang-Monate automatisch mit ein, ohne dass zusätzlicher Steuereffekt hinzugerechnet wird (da `taxEffectMonthly` weiterhin nur mit `ownershipMonthCount` multipliziert wird). Das ist eine bewusst akzeptierte Vereinfachung: die "Ø"-Zahl mischt einen Kredit-Monate-Durchschnitt (CF vor Steuern) mit einem Eigentums-Monate-Durchschnitt (Steuereffekt) — laut Rückmeldung im Gespräch akzeptabel, da "nur eine Anzeige".

**Grenzfall Ø/Total bei 0 Eigentumsmonaten (z. B. Jahr 2025):** `avgColumn`/`totalColumn` sind nicht mehr `null`, sondern ein Objekt mit `mortgage`/`cashflowBeforeTax` = echter Wert, allen anderen Feldern = 0. Zeilen wie "Einnahmen" zeigen in der Summenspalte dadurch neu "0,00 €" statt "–" für ein Jahr ganz vor dem wirtschaftlichen Übergang. Akzeptiert als Nebenwirkung — die einzelnen Monatszellen dieser Zeilen bleiben unverändert "–" (nur die Summenspalte ändert sich).

### Jahr-Picker (`CashflowTab.tsx`)

```
minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear())
```

(bisher nur `economicTransferDate.getUTCFullYear()`) — damit z. B. 2025 auswählbar wird, wenn der Darlehensbeginn schon 2025 lag.

### Footer-Hinweistext

„Ø und Total über Eigentumsmonate" (`CashflowYearTable.tsx`) stimmt für die Kreditrate/CF-vor-Steuern-Zeile nicht mehr exakt. Text wird angepasst (z. B. „Ø und Total über Eigentums- bzw. Kreditmonate").

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `web/lib/data/propertyCashflow.ts` | `mortgageStartDate`/`mortgageFraction`/`mortgageMonthCount` berechnen; `hasMortgagePayment`-Flag auf `CashflowMonthColumn`; `lineItems.mortgage`/`.cashflowBeforeTax` und `cashflowAfterTax` für Vor-Übergang-Monate mit Kreditrate füllen statt `ZERO_LINE_ITEMS`/`null`; `avgColumn`/`totalColumn`-Gate und Divisor-Logik für `mortgage`/`cashflowBeforeTax` anpassen |
| `web/components/property/cashflow/CashflowYearTable.tsx` | `RowDef` um optionales `visible?: (col) => boolean` erweitern, Kreditrate-Zeile nutzt `hasMortgagePayment`; "Cashflow vor Steuern"-Zeile nutzt `hasMortgagePayment` statt `isOwned`; Footer-Text anpassen |
| `web/components/property/cashflow/CashflowTab.tsx` | `minYear`-Berechnung erweitern |
| Tests | `web/tests/data/propertyCashflow.test.ts`, `web/tests/calculations/cashflowCalculator.test.ts` (neue Fälle für Vor-Übergang-Kreditrate, 0-Eigentumsmonate-Jahr, Jahr-Picker-Grenze) |

## Nicht angetastet

- `computeTaxCurrentYear`, `taxEffectMonthly`, `stagedAmortizationSchedule`, `stagedInterestForCalendarYear` — komplett unverändert.
- Alle Zeilen außer Kreditrate/CF vor Steuern/CF nach Steuern — komplett unverändert (`isOwned`-Gate bleibt).
- Der Fall "Darlehen beginnt nach wirtschaftlichem Übergang" — unverändert (heutiges Verhalten: Kreditrate ab Übergang, wie schon immer).
