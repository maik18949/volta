# Cashflow-Jahresübersicht: Leerstandsquote wirkt auf Einnahmen/Status

**Problem:** Die Cashflow-Jahresübersicht (`computeCashflowYearTable`) berechnet Einnahmen/Status für JEDEN Monat immer über den echten (bzw. fortgeschriebenen) Statusverlauf — nie über eine Leerstandsquote. Das war schon immer so, fiel aber erst jetzt auf: Seit der letzten Änderung (Steuer-Jahresübersicht) reagiert die "Steuererstattung"-Zeile für Zukunftsjahre bereits auf eine Leerstandsquote, während Einnahmen und Status-Badge ("Vermietet") in derselben Tabelle unverändert bleiben — eine sichtbare Inkonsistenz. Dasselbe gilt fürs laufende Jahr: Card 1 ("Prognose/Monat") reagiert voll auf den Leerstandsquote-Regler, die Jahresübersicht (Card 2) für dieselben (noch nicht vergangenen) Monate gar nicht.

**Ziel:** Einnahmen-, Status- und davon abhängige Kosten-Zeilen (Umlagefähige Kosten WE, Grundsteuer WE) der Jahresübersicht nutzen für Monate, die noch nicht vergangen sind, dieselbe Leerstandsquote-Logik wie der Rest der App — konsistent mit Card 1 und dem bereits bestehenden `leerstandQuoteOverride`-Mechanismus der Steuerseite.

---

## Verhalten (vollständige Matrix)

| Zeitraum | Regler unberührt (Standard) | Regler bewusst bewegt |
|---|---|---|
| Vergangene Monate | Ist-Wert (Statusverlauf) | Ist-Wert — **nie** überschreibbar |
| Monat, der "heute" enthält | Ist bis heute + letzter bekannter Status für den Rest | **Neu:** Szenario-Blend (s.u.) mit der Regler-Quote — exakt wie beim bestehenden Steuer-Mechanismus: Umschaltpunkt ist der 1. des laufenden Monats, der laufende Monat ist also mit eingeschlossen |
| Restliche Monate im laufenden Jahr | Letzter bekannter Status fortgeschrieben (unverändert) | **Neu:** Szenario-Blend (s.u.) mit der Regler-Quote |
| Komplett zukünftiges Jahr | **Neu:** Szenario-Blend mit Standard-Quote (Lebenszeit-Ø) — läuft automatisch, kein Regler-Eingriff nötig | Szenario-Blend mit der gewählten Zukunfts-Quote |

**Szenario-Blend** = exakt der bereits bestehende Mechanismus aus Card 1 (`cashflowLineItemsForScenario` + `blendCashflowLineItems`, schon in `propertyCashflow.ts` importiert): lineare Verrechnung zwischen Vollvermietung- und Leerstand-Szenario nach der Quote — **pro Monat gleichmäßig**, nicht diskret ("2 Monate leer, 2 Monate voll"). Bei 50 % zeigt jeder betroffene Monat 50 % der Miete, nicht zwei Monate bei 0 € und zwei bei 100 %. Das ist dieselbe Rechenlogik, die Card 1 und der Steuer-`leerstandQuoteOverride` bereits verwenden — keine neue Konvention.

Betroffene Felder beim Blend: `incomeWE`, `incomeTE`, `hoaRecoverableWE`, `propertyTaxWE` (0 bei Vollvermietung, voll bei Leerstand). Alle anderen Felder (Kreditrate, nicht umlagefähige Kosten, Verwaltung, Versicherung, außergewöhnliche Kosten) bleiben unverändert — die hängen nicht vom Vermietungsstatus ab (`blendCashflowLineItems` behandelt das bereits korrekt).

**Status-Badge:** Für einen geblendeten Monat gibt es keinen "echten" Status mehr — `statusLabelsWE`/`statusLabelsTE` werden für diese Monate leer (kein Badge), analog zum bestehenden "kein StatusEntry vorhanden"-Fall.

## Steuereffekt fürs laufende Jahr zieht konsistent mit

Ursprünglich war angedacht, die "Steuererstattung"-Zeile fürs laufende Jahr unabhängig vom Regler zu lassen — das hätte aber zu einem inkonsistenten "Cashflow nach Steuern" geführt (neue Vor-Steuer-Zahl + alter Steuereffekt). Stattdessen: Die Jahresübersicht nutzt für ihren bestehenden `computeTaxCurrentYear`-Aufruf (der die Steuererstattung liefert) genau denselben `leerstandQuoteOverride`, den auch die Einnahmen-Berechnung bekommt — exakt das Muster, das Card 1 ("Prognose/Monat") für ihren eigenen `computeTaxCurrentYear`-Aufruf schon heute nutzt (`quote === defaultQuote ? ohne Override : mit Override`). Bei unberührtem Regler ändert sich dadurch nichts (Override ist `undefined`, byte-identisch zu heute). Bewegt man den Regler, ziehen Einnahmen UND Steuererstattung gemeinsam mit — "Cashflow nach Steuern" bleibt für jeden betroffenen Monat in sich stimmig.

---

## Technische Umsetzung

`computeCashflowYearTable` bekommt einen neuen, optionalen 8. Parameter `leerstandQuoteOverride?: number` (Fraktion 0–1, analog zu `forecastLeerstandQuote`, additiv/backward-kompatibel). Im Monats-Loop: ein Monat wird per Szenario-Blend (statt `lineItemsForMonth`) berechnet, wenn:
- `isFutureYear` ist (immer, mit `forecastLeerstandQuote`), ODER
- `leerstandQuoteOverride !== undefined` UND der Monat `>= erster Tag des laufenden Monats von "heute"` ist (mit `leerstandQuoteOverride`) — der Monat, der "heute" enthält, ist also mit eingeschlossen.

Der Umschaltpunkt ("erster Tag des laufenden Monats von heute") ist exakt derselbe wie in `annualTaxableIncomeBreakdown`s `leerstandQuoteOverride.fromMonth` — bewusst dieselbe Grenze, keine neue Konvention.

`CashflowTab.tsx` übergibt den bereits vorhandenen `quote`/`defaultQuote` (aus `?leerstand=`, schon für Card 1 genutzt) als `leerstandQuoteOverride`, aber nur wenn er vom Standard abweicht — exakt das Muster, das `computeCashflowForecastMonth` für Card 1 schon nutzt (`quote === defaultQuote ? computeTaxCurrentYear(...) : computeTaxCurrentYear(..., quote/100)`).

Innerhalb von `computeCashflowYearTable` wird derselbe `leerstandQuoteOverride`-Wert dann an ZWEI Stellen verwendet: (1) beim bestehenden `computeTaxCurrentYear`-Aufruf für `currentYearTaxEffectMonthly` (statt immer `undefined`), und (2) bei der neuen Szenario-Blend-Entscheidung pro Monat.

## Nicht angetastet

- Vergangene Monate — niemals blend-basiert, niemals überschreibbar.
- Card 1 ("Prognose/Monat"), Steuer-Tab, alles andere aus dem vorherigen Plan.
