# Steuer-Tab: Jahresübersicht

**Problem:** Der Steuer-Tab kann heute nur das laufende Kalenderjahr (Ist) und Zukunftsjahre (rein hypothetische Prognose) zeigen — kein einziges vergangenes Jahr ist einsehbar, obwohl der Nutzer das für die Steuererklärung bräuchte. Zusätzlich hat `annualTaxableIncomeBreakdown` eine bekannte Lücke (siehe README-Roadmap-Notiz "Steuer-Jahresgrenze bei früher Kreditrate"): ein Kalenderjahr ganz vor dem wirtschaftlichen Übergang liefert pauschal 0 zurück, selbst wenn in diesem Jahr schon abzugsfähige Zinsen angefallen sind.

**Ziel:** Der Steuer-Tab bekommt eine navigierbare "Jahresübersicht" (Jahr-Picker, deckt Vergangenheit/laufendes Jahr/Zukunft ab), die bestehende "Prognose"-Karte entfällt. Die Kreditrate-vor-Übergang-Lücke wird als notwendige Voraussetzung mitgefixt. Der Cashflow-Tab bekommt zusätzlich einen echten (statt fehlenden) Steuereffekt für Zukunftsjahre.

---

## Out of Scope

- Cashflow-Tab bleibt strukturell unverändert (Card 1 "Prognose/Monat" + Card 2 "Jahrestabelle" bleiben genau wie sie sind) — einzige Cashflow-Änderung: Zukunftsjahre bekommen einen echten Steuereffekt statt `null` (siehe unten), kein Redesign.
- `AfaBasisCard` unverändert.
- Die Tranchen-Abzugsfähigkeit selbst (`stagedInterestForCalendarYear`, `loan_disbursements`) ändert sich nicht — sie wird nur jetzt auch für Jahre ganz vor dem Übergang korrekt erreicht statt verworfen.
- Kein neuer Regler in der Cashflow-Jahrestabelle — sie zeigt für Zukunftsjahre weiterhin nur eine (jetzt geteilte, siehe unten) Standard- oder übernommene Annahme, nie einen eigenen interaktiven Regler.

---

## 1. Datenlayer

### 1.1 Fix: `annualTaxableIncomeBreakdown` für Jahre ganz vor dem Übergang

**Datei:** `web/lib/calculations/taxCalculator.ts`

Aktuell: `if (ownershipMonths.length === 0) return ZERO_TAX_LINE_ITEMS;` — verwirft auch echte, längst entstandene Zinsen.

Fix: Zinsen fürs komplette angefragte Kalenderjahr werden **unabhängig von Eigentumsmonaten** berechnet (die Funktionen `interestForCalendarYear`/`stagedInterestForCalendarYear` nehmen ohnehin nur `year` + Darlehensdaten entgegen, kein Eigentums-Bezug). Bei `ownershipMonths.length === 0`: statt der pauschalen Null ein `TaxLineItems` mit `interest = interestYear`, `taxableIncome = -interestYear`, alle anderen Felder (Einnahmen, AfA, Nebenkosten) bleiben 0 — exakt dasselbe Muster wie die kürzlich gebaute Kreditrate-vor-Übergang-Lösung im Cashflow-Tab (nur die zinsbezogene Zeile wird vorzeitig "scharf", alles Eigentumsabhängige bleibt 0).

Betrifft `annualTaxableIncomeBreakdown` (und damit `annualTaxableIncome`, den dünnen Wrapper) — nicht `taxLineItemsForScenario` (Prognose-Pfad, unverändert, siehe unten).

### 1.2 `computeTaxCurrentYear` — Jahr wird zum Parameter

**Datei:** `web/lib/data/propertyTax.ts`

Bekommt einen neuen, optionalen `year`-Parameter (Default: `today.getUTCFullYear()` — bestehendes Verhalten für alle heutigen Aufrufer bleibt byte-identisch, additiv wie `leerstandQuoteOverride`/`disbursementRows`). Intern: der `leerstandQuoteOverride`-Mechanismus ("Rest des Jahres ab heute") bleibt ausschließlich aktiv, wenn `year === today.getUTCFullYear()` ist — für jedes andere (zwangsläufig vergangene) Jahr wird er ignoriert, es gibt dort ohnehin kein "Rest des Jahres ab heute". Reines Ist, keine Projektion.

Die bestehende Fallback-Logik `computeTaxEffectMonthly(taxEffectYear, ownershipMonthsThisYear || 12)` muss NICHT geändert werden — sie behandelt den Fall `ownershipMonthsThisYear === 0` bereits sinnvoll (Spread über 12 Monate), das passt auch für ein frisch durch Fix 1.1 nicht mehr immer-Null-Jahr.

### 1.3 `computeTaxForecastYear` — unverändert

Wird weiterhin für alle Zukunftsjahre genutzt, jetzt aber von zwei Stellen aufgerufen (Steuer-Jahresübersicht UND — neu — der Cashflow-Jahrestabelle, siehe Abschnitt 3). Keine Signaturänderung nötig, der Aufrufer entscheidet, welche `leerstandQuote` reingeht.

---

## 2. UI: Steuer-Tab

**Datei:** `web/components/property/steuer/SteuerTab.tsx` (+ neue Komponente für die Jahresübersicht-Karte, Name/Struktur beim Implementierungsplan festlegen — kann Rendering-Logik von `CurrentYearSection`/`ForecastSection` wiederverwenden)

- **"Laufendes Jahr"**: unverändert, keine Codeänderung nötig (nutzt `computeTaxCurrentYear` weiter ohne `year`-Argument = Default = aktuelles Jahr).
- **"Prognose"**: entfällt komplett (Karte, State, `ForecastSection`-Einbindung an dieser Stelle raus).
- **"Jahresübersicht"** (neu): `YearPicker` von `minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear())` (identische Logik wie kürzlich im Cashflow-Tab) bis unbegrenzt in die Zukunft (kein `maxYear`, wie die alte Prognose). Je nach gewähltem Jahr:
  - **Jahr < aktuelles Jahr:** `computeTaxCurrentYear(property, ..., year)` (Fix 1.1/1.2 greift), kein Regler.
  - **Jahr === aktuelles Jahr:** identisches Ergebnis-Objekt wie die "Laufendes Jahr"-Karte (derselbe Aufruf, derselbe `?leerstand=`-Wert) — kein eigener Regler in dieser Karte für diesen Fall.
  - **Jahr > aktuelles Jahr:** `computeTaxForecastYear(property, year, quote)`, mit eigenem Leerstandsquote-Regler — Standardwert wie bisher `overview.actualVacancyRate` (Lebenszeit-Durchschnitt, NICHT `actualVacancyRateYear` — das ist ein anderes, Jahres-Feld, das Card 1 im Cashflow-Tab nutzt).

---

## 3. Cashflow: Zukunftsjahre bekommen einen echten Steuereffekt

**Dateien:** `web/lib/data/propertyCashflow.ts`, `web/components/property/cashflow/CashflowTab.tsx`, `web/components/property/cashflow/CashflowYearTable.tsx`

`computeCashflowYearTable` bekommt einen neuen Parameter für die Zukunftsjahr-Leerstandsquote (vom Aufrufer `CashflowTab.tsx` übergeben — dort aus `overview.actualVacancyRate` berechnet, exakt dieselbe Quelle wie der Steuer-Jahresübersicht-Default). Für `isFutureYear`-Jahre wird `computeTaxForecastYear(property, year, quote)` aufgerufen und dessen `taxEffectMonthly` verwendet — ersetzt das bisherige `null` bei `taxEffectMonthly` und `cashflowAfterTax`.

In `CashflowYearTable.tsx` entfällt dadurch der Sonderfall-Warnhinweis ("Steuereffekt für Zukunftsjahre: Muss noch genauer nachgedacht werden...") — Zukunftsjahre rendern dieselben Zeilen (Steuererstattung, Cashflow nach Steuern) wie jedes andere Jahr, inklusive der bereits bestehenden korrekten Ø/Total-Berechnung.

---

## 4. Cross-Tab-Sync für Zukunftsjahr-Regler

**Datei:** `web/components/property/detail/PropertySidebar.tsx` (erweitert den bestehenden `leerstand`-Parameter-Mechanismus)

Neue URL-Parameter, nur für `/cashflow` und `/steuer` mitgegeben (wie `leerstand` heute schon): `prognoseJahr` (Zukunftsjahr) und `prognoseQuote` (Regler-Wert für genau dieses Jahr).

**Regeln:**
- Wechselt der Jahr-Picker (Steuer-Jahresübersicht ODER Cashflow-Jahresübersicht) auf ein Zukunftsjahr: `prognoseJahr` wird auf dieses Jahr gesetzt, `prognoseQuote` zurückgesetzt (neues Jahr → erstmal Standardannahme für dieses Jahr).
- Bewegt der Nutzer in der Steuer-Jahresübersicht den Regler (nur möglich, wenn Steuer gerade `prognoseJahr` zeigt): `prognoseQuote` wird gesetzt — bzw. aus der URL entfernt, sobald er wieder der Standardquote für dieses Jahr entspricht (analog zum bestehenden `leerstand`-Muster in `SteuerTab.tsx`).
- Effektive Quote für ein Zukunftsjahr in JEDER der beiden Jahresübersichten: `(eigenes gerade gezeigtes Jahr === prognoseJahr && prognoseQuote vorhanden) ? prognoseQuote : Standardquote`.
- Cashflow-Jahresübersicht hat keinen eigenen Regler — sie kann `prognoseJahr`/`prognoseQuote` nur lesen und (durch eigene Jahr-Navigation) `prognoseJahr` setzen/zurücksetzen, nie einen abweichenden `prognoseQuote` selbst erzeugen.
- Landet eine der beiden Jahresübersichten beim Laden der Seite mit `prognoseJahr` in der URL (und das ist ein Zukunftsjahr): ihr initialer Jahr-State startet dort, statt beim aktuellen Jahr.
- Bei Vergangenheits-/laufendem Jahr werden `prognoseJahr`/`prognoseQuote` weder gelesen noch verändert (bleiben ggf. unangetastet in der URL stehen, bis wieder ein Zukunftsjahr gewählt wird — harmlos, da ignoriert).

---

## Nicht angetastet

- Cashflow-Tab-Struktur (Card 1/Card 2), `AfaBasisCard`, Tranchen-Abzugsfähigkeits-Logik selbst, `taxLineItemsForScenario`.
- Der bestehende `leerstand`-Parameter-Mechanismus fürs laufende Jahr — bleibt exakt wie er ist, läuft parallel zu den neuen `prognose*`-Parametern.
