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

```swift
@Model
class Property {
    // Stammdaten
    var id: UUID
    var name: String
    var address: String
    var city: String
    var state: String
    var postalCode: String
    var propertyType: PropertyType          // Enum
    var acquisitionType: AcquisitionType    // Enum
    var yearBuilt: Int?
    var notes: String

    // Objektdaten
    var livingAreaSqm: Double
    var usableAreaSqm: Double?
    var landAreaSqm: Double?
    var rooms: Double?
    var bedrooms: Int?
    var bathrooms: Int?
    var floorLevel: Int?
    var hasBalcony: Bool
    var hasTerrace: Bool
    var hasGarden: Bool
    var hasBasement: Bool
    var basementSizeSqm: Double?
    var hasFittedKitchen: Bool
    var parkingType: ParkingType?
    var parkingCount: Int
    var heatingType: HeatingType?
    var energyEfficiencyClass: EnergyClass?
    var condition: PropertyCondition?
    var lastRenovationYear: Int?

    // Kauf
    var purchaseDate: Date
    var economicTransferDate: Date          // Wirtschaftlicher Übergang — steuert AfA-Beginn
    var purchasePriceUnit: Double
    var purchasePriceParking: Double
    var landTransferTax: Double
    var notaryCosts: Double
    var landRegistryCosts: Double
    var agentFee: Double
    var appraisalCosts: Double
    var renovationCosts: Double
    var renovationAfaEligible: Double       // Aktivierungspflichtig

    // Einnahmen (Prognose)
    var coldRentMonthly: Double
    var parkingRentMonthly: Double
    var otherIncomeMonthly: Double
    var serviceChargeRecoverableMonthly: Double
    var vacancyRateAssumption: Double
    var rentMarketSqm: Double?

    // Kosten
    var hoaFeeTotalMonthly: Double          // Hausgeld gesamt
    var hoaFeeRecoverableMonthly: Double    // davon umlagefähig
    var propertyTaxAnnual: Double
    var propertyManagementAnnual: Double
    var maintenanceReserveMonthly: Double
    var propertyInsuranceAnnual: Double
    var otherCostsMonthly: Double

    // Finanzierung
    var loanAmount: Double
    var interestRate: Double
    var amortizationRate: Double
    var fixedInterestPeriodYears: Int
    var loanStartDate: Date
    var monthlyMortgageActual: Double?      // Override falls Bank abweicht
    var remainingDebtManual: Double?        // Abgleich laut Kontoauszug

    // AfA & Steuer
    var landValue: Double                   // Aus Regierungs-Excel
    var buildingValue: Double               // Aus Regierungs-Excel
    var depreciationRate: Double            // 0.02 / 0.025 / individuell
    var marginalTaxRate: Double             // Grenzsteuersatz

    // Mietgarantie (optional)
    var rentGuarantee: RentGuarantee?

    // Relationen
    var statusHistory: [StatusEntry]        // Sortiert nach date aufsteigend
    var extraordinaryCosts: [ExtraordinaryCost]

    var createdAt: Date
    var updatedAt: Date
}
```

### StatusEntry

```swift
@Model
class StatusEntry {
    var id: UUID
    var property: Property
    var statusFrom: Date
    var status: PropertyStatus              // Enum
    var incomeActualMonthly: Double         // Tatsächliche Einnahmen in diesem Zeitraum
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
    var id: UUID
    var property: Property
    var costMonth: Date                     // Auf ersten Tag des Monats normalisieren
    var amount: Double
    var category: ExtraordinaryCostCategory // Enum
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
        ownerBorneRecoverableCosts = hoaFeeRecoverableMonthly + propertyTaxMonthly
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

### Trennnung von Concerns
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

- `Calculations/`-Layer vollständig unit-testbar (pure functions, kein SwiftUI)
- Testdaten: Dresdner ETW als Referenz-Fixture (alle Werte bekannt und verifiziert)
- Keine UI-Tests initial — Fokus auf Berechnungskorrektheit

---

## Bewusste Nicht-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Backend | Kein Backend initial | Single-User, lokale App — kein Overhead |
| Externe Dependencies | Keine | Wartbarkeit, keine Breaking Changes |
| CoreData | SwiftData stattdessen | Moderner, weniger Boilerplate, iCloud-ready |
| Combine | Kein Combine | @Observable reicht, weniger Komplexität |
| MVVM strikt | Pragmatisch | Kleine App — kein Over-Engineering |
