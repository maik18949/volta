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
| [spec-einstellungen-tab.md](spec-einstellungen-tab.md) | Einstellungen-Tab: alle Felder, identisch mit Wizard |
| [spec-calculations.md](spec-calculations.md) | Berechnungslogik: Steuer, Cashflow, Rendite-KPIs, Proration |

## Wichtigste Design-Entscheidungen

- **Light Mode only** — kein Dark Mode
- **hasParking** = Master-Toggle für alle Stellplatz-Felder (Wizard + Einstellungen)
- **Hausgeld-Split** = optionaler Toggle in Wizard UND Einstellungen (identisch)
- **Instandhaltungsrücklage** = Cashflow-Abfluss, aber NICHT steuerlich absetzbar
- **Zinsen amortisierend** — kein fixer Monatsbetrag, AmortizationCalculator
- **Prognose ohne Slider** — alle Werte kommen direkt aus Einstellungen
