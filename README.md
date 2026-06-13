# Immobilien Portfolio Manager

Private Immobilienverwaltung für macOS — Rendite, Cashflow, Steuer und Realität vs. Prognose auf einen Blick.

## Stack

| Bereich | Technologie |
|---|---|
| Plattform | macOS 14+ (Sonoma) |
| Sprache | Swift 5.9+ |
| UI | SwiftUI |
| Persistenz | SwiftData (lokal, iCloud-ready) |
| Charts | Swift Charts |
| Abhängigkeiten | keine |

## Features

- **Portfolio-Übersicht** — alle Objekte auf einen Blick mit aggregierten KPIs
- **Rendite-KPIs** — Bruttorendite, Nettorendite, Cap Rate, Cash-on-Cash, DSCR, LTV
- **Cashflow Soll/Ist** — Prognose vs. tatsächliche Einnahmen mit Statushistorie
- **Steuer** — AfA-Berechnung, Werbungskosten, V+V-Ergebnis, Steuereffekt
- **Tilgungsplan** — dynamische Restschuld, LTV-Kurve über Zeit
- **Investment-Rechner** — Objekte vor dem Kauf durchrechnen, bei Kauf direkt übernehmen

## Projektstruktur

```
ImmobilienPortfolio/
├── Models/            # SwiftData Entitäten
├── ViewModels/        # Berechnungen + State (@Observable)
├── Views/
│   ├── Portfolio/     # Gesamtübersicht
│   ├── Property/      # Detail-Tabs (Übersicht, Cashflow, Steuer, Finanzierung, Einstellungen)
│   ├── Wizard/        # Schritt-für-Schritt Eingabe neue Immobilie
│   ├── InvestmentCalculator/
│   └── Components/    # Wiederverwendbare UI-Bausteine
├── Calculations/      # Pure Swift, kein SwiftUI — unit-testbar
└── Utilities/         # Formatter, Date/Double Extensions
```

## Datenspeicherung

SwiftData speichert automatisch als SQLite in `~/Library/Application Support/com.*.ImmobilienPortfolio/`. Kein manuelles Speichern nötig. Selbst mit 500 Objekten und 20 Jahren Historiedaten bleibt die Datenbank unter 10 MB.

iCloud-Sync kann später mit einer einzigen Änderung am `ModelContainer` aktiviert werden — keine Architektur-Anpassung nötig.

## Entwicklung

Xcode öffnen, Schema auswählen, bauen. Keine externen Abhängigkeiten, kein SPM, kein CocoaPods.

Berechnungslogik liegt vollständig in `Calculations/` als pure Swift-Funktionen — unabhängig von SwiftUI testbar. Testfixture: Dresdner ETW (alle Werte bekannt und verifiziert).

## Datenmodell

Siehe [`immobilien_datenmodell_v2.md`](immobilien_datenmodell_v2.md) für vollständige Felddefinitionen, Formeln und KPI-Berechnungen.

Technische Konventionen und Architekturentscheidungen: [`CLAUDEvolta.md`](CLAUDEvolta.md).
