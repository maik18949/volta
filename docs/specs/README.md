# Volta — Spec-Übersicht

Jede Datei ist in sich vollständig und beschreibt ein Feature oder Tab.

| Datei | Inhalt |
|-------|--------|
| [spec-design-system.md](spec-design-system.md) | Farben, Typografie, Glass Cards, Spacing — Light Mode only |
| [spec-data-model.md](spec-data-model.md) | Property-Felder, Enums, WizardState, StatusEntry, Migration |
| [spec-wizard.md](spec-wizard.md) | Alle 7+1 Wizard-Schritte, Stellplatz-Logik, Hausgeld-Split |
| [spec-overview-tab.md](spec-overview-tab.md) | Übersicht-Tab: 4 Cards (Status/Cashflow, Rendite, Finanzierung, Objekt) |
| [spec-cashflow-tab.md](spec-cashflow-tab.md) | Cashflow-Tab: Prognose-Karte + vollständige Jahrestabelle |
| [spec-steuer-tab.md](spec-steuer-tab.md) | Steuer-Tab: Laufendes Jahr + Prognose, steuerrechtliche Grundlagen |
| [spec-verlauf-tab.md](spec-verlauf-tab.md) | Verlauf-Tab: Statusverlauf + außergewöhnliche Kosten (gemeinsame Datenquelle für Steuer + Cashflow) |
| [spec-einstellungen-tab.md](spec-einstellungen-tab.md) | Einstellungen-Tab: alle Felder, identisch mit Wizard |
| [spec-calculations.md](spec-calculations.md) | Berechnungslogik: Steuer, Cashflow, Rendite-KPIs, Proration |

## Wichtigste Design-Entscheidungen

- **Light Mode only** — kein Dark Mode
- **parkingType != .nichtVorhanden** = Bedingung für alle Stellplatz-Felder (kein hasParking-Feld)
- **Hausgeld-Split** = optionaler Toggle in Wizard UND Einstellungen (identisch)
- **Instandhaltungsrücklage** = Cashflow-Abfluss, aber NICHT steuerlich absetzbar
- **Tilgung** = Cashflow-Abfluss, aber NICHT steuerlich absetzbar
- **AfA** = steuerlich absetzbar, aber KEIN Cashflow-Abfluss
- **Zinsen amortisierend** — kein fixer Monatsbetrag, AmortizationCalculator
- **Verlauf-Tab** = zentrale Datenquelle für Statusverlauf + außergewöhnliche Kosten
- **Außergewöhnliche Kosten** = immer Cashflow-Abfluss, nur steuerlich wenn isDeductible = true
- **Prognose ohne Slider** — alle Werte kommen direkt aus Einstellungen
