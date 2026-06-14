# Immobilien Portfolio Manager — CLAUDE.md

Technische Referenz für KI-Assistenten und Entwickler.
Dieses Dokument beschreibt Architektur, Konventionen und Entscheidungen des Projekts.

---

## Projekt-Übersicht

**Name:** Immobilien Portfolio Manager
**Plattform:** macOS 14+ (Sonoma)
**Sprache:** Swift 5.9+
**UI-Framework:** SwiftUI
**Persistenz:** SwiftData
**Ziel:** Private Immobilienverwaltung für einen einzelnen Nutzer — kein Multi-User, kein Backend

---

## Tech Stack

| Bereich | Technologie | Begründung |
|---|---|---|
| UI | SwiftUI | Native macOS, deklarativ, wartbar |
| Datenbank | SwiftData | Native Apple-Persistenz, iCloud-ready, kein ORM-Boilerplate |
| Charts | Swift Charts | Native, keine externe Abhängigkeit |
| Zahlenformatierung | Foundation (NumberFormatter) | Locale-aware EUR-Formatierung |
| Datumsverarbeitung | Foundation (Calendar, DateComponents) | Tilgungsplan, Monats-Iteration |
| Abhängigkeiten extern | **keine** | Kein SPM, kein CocoaPods — absichtlich dependency-free |

---

## Projektstruktur

```
ImmobilienPortfolio/
├── ImmobilienPortfolioApp.swift       # App Entry Point, ModelContainer Setup
├── CLAUDE.md                          # Diese Datei
│
├── Models/                            # SwiftData Models
│   ├── Property.swift                 # Haupt-Entity: Immobilie
│   ├── StatusEntry.swift              # Statushistorie-Eintrag
│   ├── ExtraordinaryCost.swift        # Außerordentliche Kosten
│   ├── RentGuarantee.swift            # Mietgarantie
│   └── InvestmentCalculation.swift    # Investment-Rechner (eigenständig)
│
├── ViewModels/                        # ObservableObject / @Observable
│   ├── PropertyViewModel.swift        # KPI-Berechnungen pro Immobilie
│   ├── PortfolioViewModel.swift       # Aggregierte Portfolio-KPIs
│   └── InvestmentCalculatorViewModel.swift
│
├── Views/
│   ├── Portfolio/
│   │   ├── PortfolioView.swift        # Übersicht alle Objekte
│   │   └── PortfolioKPIView.swift     # Aggregierte Portfolio-KPIs
│   │
│   ├── Property/
│   │   ├── PropertyDetailView.swift   # Container mit Tab-Navigation
│   │   ├── OverviewTab.swift          # Statische KPIs + Objektinfos
│   │   ├── CashflowTab.swift          # Soll/Ist nebeneinander
│   │   ├── TaxTab.swift               # AfA, Werbungskosten, zvE
│   │   ├── FinancingTab.swift         # Tilgungsplan, LTV-Kurve
│   │   └── SettingsTab.swift          # Stammdaten bearbeiten
│   │
│   ├── Wizard/
│   │   ├── AddPropertyWizard.swift    # Schritt-für-Schritt Eingabe
│   │   ├── WizardStepStammdaten.swift
│   │   ├── WizardStepObjektdaten.swift
│   │   ├── WizardStepKauf.swift
│   │   ├── WizardStepEinnahmen.swift
│   │   ├── WizardStepKosten.swift
│   │   ├── WizardStepFinanzierung.swift
│   │   └── WizardStepAfA.swift
│   │
│   ├── InvestmentCalculator/
│   │   ├── InvestmentCalculatorView.swift
│   │   └── InvestmentResultView.swift
│   │
│   └── Components/                    # Wiederverwendbare UI-Komponenten
│       ├── KPICard.swift
│       ├── KPICardWithContext.swift    # KPI + Benchmark-Erklärung
│       ├── SollIstRow.swift           # Soll/Ist Vergleichszeile
│       ├── StatusBadge.swift          # Vermietet / Leerstand etc.
│       ├── CurrencyField.swift        # EUR-Eingabefeld
│       ├── PercentField.swift         # Prozent-Eingabefeld
│       └── SectionHeader.swift
│
├── Calculations/                      # Pure Swift, kein SwiftUI
│   ├── KPICalculator.swift            # Alle Rendite-KPIs
│   ├── CashflowCalculator.swift       # Monatlicher Cashflow (Soll + Ist)
│   ├── DepreciationCalculator.swift   # AfA-Berechnung
│   ├── AmortizationCalculator.swift   # Tilgungsplan
│   └── TaxCalculator.swift            # Steuereffekt V+V
│
└── Utilities/
    ├── Formatters.swift               # NumberFormatter, DateFormatter (shared)
    ├── Extensions+Date.swift          # firstDayOfMonth, monthsBetween etc.
    └── Extensions+Double.swift        # .asCurrency, .asPercent etc.
```

---

## Datenmodell (SwiftData)

### Property (Haupt-Entity)

// Hinweis iCloud/CloudKit-Kompatibilität:
// Alle nicht-optionalen Felder haben Default-Werte damit SwiftData Migrationen
// bei aktiviertem CloudKit-Sync korrekt funktionieren.
// Kind-Entitäten (StatusEntry, ExtraordinaryCost, RentGuarantee) haben optionale
// property-Referenz aus demselben Grund — in der App immer gesetzt.
```swift
@Model
class Property {
    // Stammdaten
    var id: UUID = UUID()
    var name: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var propertyType: PropertyType = .apartment
    var acquisitionType: AcquisitionType = .kauf
    var yearBuilt: Int?
    var notes: String = ""

    // Objektdaten
    var livingAreaSqm: Double = 0.0
    var usableAreaSqm: Double?
    var landAreaSqm: Double?
    var rooms: Double?
    var bedrooms: Int?
    var bathrooms: Int?
    var floorLevel: Int?
    var hasBalcony: Bool = false
    var hasTerrace: Bool = false
    var hasGarden: Bool = false
    var hasBasement: Bool = false
    var basementSizeSqm: Double?
    var hasFittedKitchen: Bool = false
    var parkingType: ParkingType?
    var parkingCount: Int = 0
    var heatingType: HeatingType?
    var energyEfficiencyClass: EnergyClass?
    var condition: PropertyCondition?
    var lastRenovationYear: Int?

    // Kauf
    var purchaseDate: Date = Date()
    var economicTransferDate: Date = Date()   // Wirtschaftlicher Übergang — steuert AfA-Beginn
    var purchasePriceUnit: Double = 0.0
    var purchasePriceParking: Double = 0.0
    var landTransferTax: Double = 0.0
    var notaryCosts: Double = 0.0
    var landRegistryCosts: Double = 0.0
    var agentFee: Double = 0.0
    var appraisalCosts: Double = 0.0
    var renovationModernizationCosts: Double = 0.0
    var renovationAfaEligible: Double = 0.0   // Aktivierungspflichtig

    // Einnahmen (Prognose)
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var serviceChargeRecoverableMonthly: Double = 0.0
    var vacancyRateAssumption: Double = 0.03
    var rentMarketSqm: Double?

    // Kosten
    var hoaFeeTotalMonthly: Double = 0.0      // Hausgeld gesamt
    var hoaFeeRecoverableMonthly: Double = 0.0 // davon umlagefähig
    var propertyTaxAnnual: Double = 0.0
    var propertyManagementAnnual: Double = 0.0
    var maintenanceReserveMonthly: Double = 0.0
    var propertyInsuranceAnnual: Double = 0.0
    var otherCostsMonthly: Double = 0.0

    // Finanzierung
    var loanAmount: Double = 0.0
    var interestRate: Double = 0.0
    var amortizationRate: Double = 0.0
    var fixedInterestPeriodYears: Int = 10
    var loanStartDate: Date = Date()
    var monthlyMortgageActual: Double?        // Override falls Bank abweicht
    var remainingDebtCurrent: Double?         // Abgleich laut Kontoauszug

    // AfA & Steuer
    var landValue: Double = 0.0               // Aus Regierungs-Excel
    var buildingValue: Double = 0.0           // Aus Regierungs-Excel
    var depreciationRate: Double = 0.02       // 0.02 / 0.025 / individuell
    var marginalTaxRate: Double = 0.0         // Grenzsteuersatz
    var landGuidelineValueSqm: Double?        // Bodenrichtwert €/m² — informativ, kein Berechnungsfeld

    // Mietgarantie (optional)
    var rentGuarantee: RentGuarantee?

    // Relationen
    var statusHistory: [StatusEntry] = []     // Sortiert nach date aufsteigend
    var extraordinaryCosts: [ExtraordinaryCost] = []

    var createdAt: Date = Date()
    var updatedAt: Date = Date()
}
```

### StatusEntry

```swift
@Model
class StatusEntry {
    var id: UUID = UUID()
    var property: Property?
    var statusFrom: Date = Date()
    var status: PropertyStatus = .vermietet  // Enum
    var incomeActualMonthly: Double = 0.0    // Tatsächliche Einnahmen in diesem Zeitraum
    var notes: String?
}

enum PropertyStatus: String, Codable, CaseIterable {
    case vermietet = "Vermietet"
    case leerstandMietgarantie = "Leerstand + Mietgarantie"
    case leerstand = "Leerstand"
    case eigennutzung = "Eigennutzung"
    case renovierung = "Renovierung"
}
```

### ExtraordinaryCost

```swift
@Model
class ExtraordinaryCost {
    var id: UUID = UUID()
    var property: Property?
    var costMonth: Date = Date()            // Auf ersten Tag des Monats normalisieren
    var amount: Double = 0.0
    var category: ExtraordinaryCostCategory = .sonstiges // Enum
    var descriptionText: String?
}

enum ExtraordinaryCostCategory: String, Codable, CaseIterable {
    case sonderumlage = "Sonderumlage"
    case reparatur = "Reparatur"
    case gutachter = "Gutachter"
    case rechtskosten = "Rechtskosten"
    case sonstiges = "Sonstiges"
}
```

### RentGuarantee

```swift
@Model
class RentGuarantee {
    var id: UUID = UUID()
    var property: Property?
    var guaranteeProvider: String = ""
    var guaranteeAmountMonthly: Double = 0.0
    var guaranteeStartDate: Date = Date()
    var guaranteeEndDate: Date = Date()
    var guaranteeNotes: String = ""
}
```

---

## Berechnungsschicht — Wichtige Formeln

### AfA-Basis

```swift
// building_value und land_value kommen direkt aus Regierungs-Excel
// building_share_ratio wird daraus abgeleitet, NICHT umgekehrt

let buildingShareRatio = buildingValue / purchasePrice
let afaBasis = buildingValue + (closingCostsTotal * buildingShareRatio) + renovationAfaEligible
let depreciationYearly = afaBasis * depreciationRate
```

### Bruttorendite

```swift
// Kaltmiete + Parkingmiete — NICHT gross_income (enthält sonstige Einnahmen)
let grossYield = (coldRentYearly + parkingRentYearly) / purchasePrice
```

### Zinsen/Tilgung

```swift
// Berechnet — überschreibbar durch monthlyMortgageActual
let interestMonthlyCalc = loanAmount * (interestRate / 12)
let principalMonthlyCalc = loanAmount * (amortizationRate / 12)
let monthlyMortgage = monthlyMortgageActual ?? (interestMonthlyCalc + principalMonthlyCalc)
```

### Dynamische Restschuld

```swift
func remainingDebt(atMonth t: Int) -> Double {
    let r = interestRate / 12
    return loanAmount * pow(1 + r, Double(t))
        - monthlyMortgage * (pow(1 + r, Double(t)) - 1) / r
}
```

### Cashflow pro Monat (Realität)

```swift
func cashflowActual(for month: Date) -> (beforeTax: Double, afterTax: Double) {
    let status = activeStatus(for: month)
    let income = status.incomeActualMonthly

    let fixedCosts = monthlyMortgage
        + operatingCostsNonRecoverableMonthly

    // Umlagefähige Kosten + Grundsteuer nur bei Leerstand vom Eigentümer zu tragen
    let ownerBorneRecoverableCosts: Double
    switch status.status {
    case .vermietet:
        ownerBorneRecoverableCosts = 0
    case .leerstandMietgarantie, .leerstand, .eigennutzung, .renovierung:
        ownerBorneRecoverableCosts = hoaFeeRecoverableMonthly + propertyTaxMonthly + propertyInsuranceMonthly
    }

    let extraordinary = extraordinaryCosts(for: month).reduce(0) { $0 + $1.amount }

    let cashflowBeforeTax = income - fixedCosts - ownerBorneRecoverableCosts - extraordinary
    let cashflowAfterTax = cashflowBeforeTax + taxEffectMonthly

    return (cashflowBeforeTax, cashflowAfterTax)
}
```

### Steuereffekt

```swift
// Vereinfacht: V+V-Ergebnis × Grenzsteuersatz
// Negatives Ergebnis = Verlust = Steuererstattung (positiver Cashflow-Effekt)
let taxableIncomeVV = effectiveGrossIncomeYearly
    - operatingCostsNonRecoverableYearly
    - interestAnnual
    - depreciationYearly

let taxEffectYearly = taxableIncomeVV * marginalTaxRate * -1
let taxEffectMonthly = taxEffectYearly / 12
```

---

## Navigationsstruktur

```
NavigationSplitView
├── Sidebar
│   ├── Portfolio-Übersicht
│   ├── [Immobilie 1]
│   ├── [Immobilie 2]
│   ├── ...
│   ├── Portfolio-KPIs
│   └── Investment-Rechner
│
└── Detail (TabView)
    ├── Übersicht      — Statische KPIs, immer sichtbar
    ├── Cashflow       — Soll/Ist nebeneinander + Statushistorie
    ├── Steuer         — AfA, Werbungskosten, zvE-Effekt
    ├── Finanzierung   — Tilgungsplan, LTV-Kurve
    └── Einstellungen  — Alle Stammdaten bearbeiten
```

---

## KPI-Anzeige Prinzip

**Drei Ebenen:**

1. **Immer sichtbar (Property Header):** Kaufpreis, Gesamtinvestment, Bruttorendite, Nettorendite, LTV — ändert sich nie nach Kauf
2. **Cashflow-Tab:** Soll vs. Ist nebeneinander mit Abweichungs-Highlighting
3. **Realität-Detail:** Statushistorie, außerordentliche Kosten, monatliche Aufschlüsselung

**KPI-Karten mit Kontext:** Jede KPI-Karte zeigt Wert + Benchmark + kurze Einordnung.
Beispiel DSCR: Wert 0.77 → "Unter 1.0 — bei aktuellen Zinsen strukturell normal bei deutschen Kaufpreismultiples"

---

## Konventionen

### Benennung
- Swift-Felder: `camelCase` (z.B. `coldRentMonthly`)
- SwiftData Models: Klassen mit `@Model`, keine Structs
- ViewModels: `@Observable` (Swift 5.9+), kein `ObservableObject`
- Views: Suffix `View` oder `Tab` (z.B. `CashflowTab`)
- Enums: `PascalCase`, raw value = deutscher Anzeigestring

### Währung & Zahlen
- Interne Berechnung immer in `Double`
- Anzeige immer über `Formatters.currency` (€, 2 Dezimalstellen, Locale DE)
- Prozente intern als Dezimal (0.042 = 4,2%), Anzeige via `Formatters.percent`
- Niemals direkt `.formatted()` im View — immer über Formatters-Singleton

### Datum
- Intern immer `Date`
- Monats-Normalisierung: erster Tag des Monats (00:00:00 UTC)
- `economicTransferDate` ist der Stichtag für AfA-Beginn und alle Realität-Berechnungen
- Kein `purchase_date` für Steuerberechnungen verwenden

### Fehlerbehandlung
- Division durch 0: immer explizit prüfen, `nil` oder `0` zurückgeben je nach KPI
- Fehlende optionale Felder: in Berechnungen als `0` behandeln, in UI als "–" anzeigen
- Kein `try!` oder `force unwrap` in Berechnungsschicht

### Trennung von Concerns
- **Models:** Nur Datenhaltung, keine Logik
- **Calculations/:** Pure Swift-Funktionen, kein SwiftUI, kein SwiftData — unit-testbar
- **ViewModels:** Bindeglied zwischen Calculations und Views
- **Views:** Nur Darstellung, keine Berechnungen

---

## Datenspeicherung

### Speicherort

SwiftData speichert automatisch als SQLite-Datenbank im App Support Verzeichnis:

```
~/Library/Application Support/
  com.deinname.ImmobilienPortfolio/
    default.store          ← SQLite-Hauptdatei
    default.store-shm      ← Shared Memory (WAL-Modus)
    default.store-wal      ← Write-Ahead Log
```

- Kein manuelles Speichern nötig — SwiftData persistiert bei jeder Änderung automatisch
- Daten bleiben bei App-Deinstallation erhalten (Library-Ordner bleibt)
- Automatisch in Time Machine-Backup enthalten
- Nutzer sieht diesen Pfad nie direkt — kein sichtbares Dokument

### Speicherkapazität

Schätzung pro Immobilie:

```
Stamm- & Objektdaten:              ~2 KB
Kauf / Finanzierung / AfA:         ~1 KB
Einnahmen & Kosten:                ~1 KB
Statushistorie (50 Einträge):      ~5 KB
Außerordentliche Kosten (20/Jahr): ~2 KB
─────────────────────────────────────────
Pro Immobilie gesamt:              ~10–15 KB
```

Hochrechnung:

| Objekte | Speicherbedarf |
|---|---|
| 10 Immobilien | ~150 KB |
| 50 Immobilien | ~750 KB |
| 100 Immobilien | ~1,5 MB |
| 500 Immobilien | ~7,5 MB |

SQLite hat für diesen Use Case kein praktisches Limit. Selbst mit 500 Objekten und 20 Jahren Historiedaten bleibt die Datenbank unter 10 MB. Speicher ist für diese App kein Thema.

---

## iCloud (spätere Erweiterung)

SwiftData ist von Beginn an iCloud-ready. Für Sync später genügt eine Änderung im `ModelContainer` — keine Architektur-Änderung notwendig:

```swift
// Aktuell (lokal):
let container = ModelContainer(for: Property.self)

// Später (mit iCloud Sync):
let container = ModelContainer(
    for: Property.self,
    configurations: ModelConfiguration(cloudKitDatabase: .automatic)
)
```

Voraussetzungen wenn iCloud aktiviert wird:
- iCloud-Entitlement im Xcode-Projekt aktivieren (`Signing & Capabilities → iCloud → CloudKit`)
- CloudKit Container anlegen (`iCloud.com.deinname.ImmobilienPortfolio`)
- Alle `@Model`-Felder müssen optional oder mit Default-Wert sein (CloudKit-Anforderung)
- Kein `unique`-Constraint auf Feldern (CloudKit unterstützt das nicht nativ)

Sync-Verhalten: Änderungen auf Gerät A erscheinen nach wenigen Sekunden auf Gerät B.
Konfliktauflösung: SwiftData / CloudKit löst Konflikte automatisch via Last-Write-Wins.

---

## Testing-Strategie

### Pyramide

```
            UI-Tests          ← 0 initial (bewusste Entscheidung)
        ViewModel-Tests       ← Wenige, nur für Integrationspfade
    Unit Tests (Calculations) ← Hauptfokus
```

### Priorität 1 — Unit Tests: `Calculations/` (Ziel: 90%+)

Alle Formeln sind pure functions ohne Side Effects — exakt das, was unit-testbar ist.

| Datei | Was testen |
|---|---|
| `KPICalculator` | `grossYield`, `netYield`, `capRate`, `cashOnCash`, `dscr`, `mietmultiplikator`, `breakEvenRent` |
| `CashflowCalculator` | Cashflow je Status (vermietet / leerstand / mietgarantie), außerordentliche Kosten, Steuereffekt |
| `DepreciationCalculator` | AfA-Basis-Formel, anteilige AfA im Erwerbsjahr, verschiedene `depreciationRate`-Szenarien |
| `AmortizationCalculator` | `remainingDebt(atMonth:)`, Tilgungsplan-Korrektheit, `monthlyMortgageActual`-Override |
| `TaxCalculator` | `taxableIncomeVV`, `taxEffectYearly`, negativer Steuereffekt = Erstattung |

**Kritische Edge Cases:**
- Division durch 0: kein Kaufpreis, kein Eigenkapital, kein Schuldenservice
- `monthlyMortgageActual = nil` → Fallback auf berechneten Wert
- AfA-Beginn genau an `economicTransferDate` (erster voller Monat)
- Cashflow bei `leerstandMietgarantie` vs. `leerstand` (umlagefähige Kosten-Logik)
- `effective_gross_income_yearly` bei 0% Leerstand vs. 100% Leerstand

**Fixture:** Dresdner ETW mit allen bekannten Werten als gemeinsames `TestFixtures.swift` — einmal definiert, in allen Calculator-Tests genutzt. Jede KPI wird gegen den händisch verifizierten Sollwert geprüft (Golden-Master-Ansatz).

### Priorität 2 — ViewModel-Tests (Ziel: 70%)

Nur für nicht-triviale Aggregations- und Statuslogik-Pfade:

| ViewModel | Was testen |
|---|---|
| `PropertyViewModel` | `activeStatus(for: month)` — korrekte Statusauswahl aus Statushistorie |
| `PropertyViewModel` | Cashflow-YTD-Aggregation über mehrere Monate mit Statuswechsel |
| `PortfolioViewModel` | Portfolio-KPIs korrekt über 2+ Immobilien aggregiert |
| `InvestmentCalculatorViewModel` | KPI-Freischaltlogik (Stufen 1–4), Sensitivitäts-Berechnung |

Kein SwiftData in ViewModel-Tests — In-Memory-`ModelContainer` oder Property als Teststub.

### Priorität 3 — Datenintegrität

Gezielte Tests für Invarianten, die die App voraussetzt:

- Erster `StatusEntry` muss `status_from == economicTransferDate` sein
- `cost_month` in `ExtraordinaryCost` ist immer auf ersten Tag des Monats normalisiert
- `building_share_ratio + land_share_ratio ≈ 1.0` (aus Regierungs-Excel-Werten)
- Promote-Flow: `InvestmentCalculation` → `Property` kopiert alle Felder korrekt

### Bewusst ausgelassen

| Bereich | Begründung |
|---|---|
| UI-Tests | Kleines Einzel-Nutzer-Tool, Wartungskosten zu hoch initial |
| SwiftData CRUD | Framework-Code — Apple testet das selbst |
| Formatters/Extensions | Triviale Wrapper ohne eigene Logik |
| iCloud Sync | Nicht aktiv, kein Backend |

---

## MVP-Scope (v1)

**v1 — muss funktionieren:**
- Immobilie anlegen (Wizard)
- Prognose-KPIs (Übersicht, Cashflow Soll, AfA, Tilgungsplan)
- Statushistorie + Ist-Cashflow
- Portfolio-Übersicht + Portfolio-KPIs
- Investment-Rechner inkl. Sensitivitätsanalyse und Promote-Flow

**v2 — bewusst rausgelassen:**
- iCloud Sync
- Export / Backup
- Mehrsprachigkeit

---

## Error-Handling-Strategie

Zwei Ebenen:

**Blocking — App verhindert Speichern:**
- Pflichtfeld leer (Name, Kaufpreis, Wohnfläche, Zinssatz, Tilgungssatz)
- `economicTransferDate` in der Vergangenheit ohne ersten Statuseintrag

**Warning — Speichern möglich, Hinweis wird angezeigt:**
- `land_value + building_value` weicht um mehr als 5% von `purchase_price` ab
- `depreciationRate` außerhalb der Normwerte (< 2% oder > 4%)
- `loanAmount` > `purchasePrice` (Vollfinanzierung inkl. Nebenkosten — ungewöhnlich)

**Systemfehler:**
- `ModelContainer` schlägt beim Start fehl → Fehlerdialog mit Pfad zur SQLite-Datei, kein Crash
- SwiftData-Operation schlägt fehl → In-App-Benachrichtigung, kein Silent Fail

---

## SwiftData-Migrationen

Jede Schema-Änderung erfordert eine neue `VersionedSchema` und eine `MigrationPlan`-Stage. Niemals ein Feld umbenennen oder löschen ohne Migration — das führt zu einem Crash beim Start.

```swift
enum SchemaV1: VersionedSchema {
    static var models: [any PersistentModel.Type] { [Property.self, StatusEntry.self, ExtraordinaryCost.self, RentGuarantee.self, InvestmentCalculation.self] }
    static var versionIdentifier = Schema.Version(1, 0, 0)
}
```

Aktuelle Version: **v1.0.0**

---

## Debug-Seeding

Im `DEBUG`-Build wird beim leeren Datenbestand automatisch die Dresdner ETW als Testimmobilie eingefügt:

```swift
#if DEBUG
if modelContext.isEmpty {
    SeedData.insertDresdnerETW(into: modelContext)
}
#endif
```

`SeedData.swift` liegt in `Utilities/` und ist vom Release-Build ausgeschlossen.

---

## Crash Reporting

Native MetricKit — kein externes SDK, kein Datenschutzproblem.

```swift
import MetricKit

class AppDelegate: NSObject, NSApplicationDelegate, MXMetricManagerSubscriber {
    func applicationDidFinishLaunching(_ notification: Notification) {
        MXMetricManager.shared.add(self)
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        // Payload als JSON in ~/Library/Logs/ImmobilienPortfolio/ schreiben
        // Nutzer kann bei Bedarf manuell einsenden
    }
}
```

Logs landen lokal, kein automatischer Upload. Bei gemeldeten Abstürzen schickt der Nutzer die Log-Datei manuell.

---

## Logging

`os.log` für Berechnungsfehler und unerwartete Zustände. Nicht User-Facing, aber im Feld debuggbar via Console.app.

```swift
import OSLog
let logger = Logger(subsystem: "com.deinname.ImmobilienPortfolio", category: "calculations")
// Verwendung z.B.:
logger.error("remainingDebt: division by zero, loanAmount=\(loanAmount)")
```

Kategorien: `calculations`, `persistence`, `migration`

---

## Onboarding / Leerer Startzustand

Erster App-Start ohne Immobilien zeigt einen Empty-State in der Detail-Spalte:

```
[Icon: Gebäude]
Noch keine Immobilien

Füge deine erste Immobilie hinzu
um Rendite, Cashflow und Steuereffekt
im Blick zu behalten.

[Button: Erste Immobilie hinzufügen]
```

Der Button öffnet direkt den `AddPropertyWizard`.

---

## Bewusste Nicht-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Backend | Kein Backend initial | Single-User, lokale App — kein Overhead |
| Externe Dependencies | Keine | Wartbarkeit, keine Breaking Changes |
| CoreData | SwiftData stattdessen | Moderner, weniger Boilerplate, iCloud-ready |
| Combine | Kein Combine | @Observable reicht, weniger Komplexität |
| MVVM strikt | Pragmatisch | Kleine App — kein Over-Engineering |
