# Datenmodell

**Datei:** `Volta/Models/Property.swift`  
**WizardState:** `Volta/Views/Wizard/WizardState.swift`

---

## Property — Alle Felder

### Stammdaten

```swift
var name: String
var address: String
var city: String
var state: String
var postalCode: String
var propertyType: PropertyType        // .apartment, .house, ...
var acquisitionType: AcquisitionType  // .kauf, ...
var yearBuilt: Int?
var notes: String
```

### Objektdaten

```swift
var livingAreaSqm: Double
var usableAreaSqm: Double
var landAreaSqm: Double
var rooms: Double?
var bedrooms: Int
var bathrooms: Int
var hasBalcony: Bool
var hasTerrace: Bool
var hasGarden: Bool
var hasBasement: Bool
var hasFittedKitchen: Bool
var heatingType: HeatingType?
var energyEfficiencyClass: EnergyClass?
var condition: PropertyCondition?
var lastRenovationYear: Int?
```

### Kauf & Nebenkosten

```swift
var purchaseDate: Date
var economicTransferDate: Date          // Besitzübergang — Startpunkt für AfA, Einnahmen, Kosten
var purchasePriceUnit: Double           // Kaufpreis Wohnung
var purchasePriceParking: Double        // Kaufpreis Stellplatz (nur wenn hasParking)
var landTransferTax: Double             // Grunderwerbsteuer
var notaryCosts: Double
var landRegistryCosts: Double
var agentFee: Double                    // Maklerprovision
var appraisalCosts: Double              // Gutachterkosten
var renovationModernizationCosts: Double
var renovationAfaEligible: Double       // davon aktivierungspflichtig (erhöht AfA-Basis)
```

### Einnahmen (Prognose / Einstellungen)

```swift
var coldRentMonthly: Double             // Kaltmiete Wohnung
var parkingRentMonthly: Double          // Parkingmiete (nur wenn hasParking)
var otherIncomeMonthly: Double
var vacancyRateAssumption: Double       // z.B. 0.03 = 3%
var rentMarketSqm: Double               // informativ
```

### Kosten — Wohnung

```swift
var hoaFeeTotalMonthly: Double          // Hausgeld Wohnung gesamt
var isHoaUnitSplit: Bool               // Toggle: Hausgeld aufteilen
var hoaFeeRecoverableMonthly: Double    // umlagefähig Wohnung (nur wenn isHoaUnitSplit)
var maintenanceReserveMonthly: Double   // Instandhaltungsrücklage Wohnung (nur wenn isHoaUnitSplit)
// abgeleitet (readonly):
// hoaFeeNonRecoverableMonthly = total - recoverable - reserve
var propertyTaxAnnual: Double           // Grundsteuer Wohnung/Jahr
var propertyManagementAnnual: Double    // Hausverwaltung
var propertyInsuranceAnnual: Double     // Gebäudeversicherung (falls separat)
var otherCostsMonthly: Double
```

### Kosten — Stellplatz

```swift
var hasParking: Bool                    // Master-Toggle für ALLE Stellplatz-Felder
var hoaFeeParkingTotalMonthly: Double   // Hausgeld Stellplatz gesamt
var isHoaParkingSplit: Bool            // Toggle: Hausgeld Stellplatz aufteilen
var hoaFeeParkingRecoverableMonthly: Double     // umlagefähig Stellplatz
var hoaFeeParkingMaintenanceReserveMonthly: Double  // Rücklage Stellplatz
// abgeleitet (readonly):
// hoaFeeParkingNonRecoverableMonthly = total - recoverable - reserve
var propertyTaxParkingAnnual: Double    // Grundsteuer Stellplatz/Jahr
```

### Finanzierung

```swift
var loanAmount: Double
var interestRate: Double                // z.B. 0.035 = 3,5%
var amortizationRate: Double           // z.B. 0.02 = 2%
var fixedInterestPeriodYears: Int      // Zinsbindung in Jahren
var loanStartDate: Date
var monthlyMortgageActual: Double?     // Tatsächliche Rate (optional, überschreibt Berechnung)
```

### AfA & Steuer

```swift
var landValue: Double                   // Grundstückswert (aus Regierungs-Excel)
var buildingValue: Double               // Gebäudewert (aus Regierungs-Excel)
var depreciationRate: Double            // AfA-Satz, z.B. 0.02 = 2% oder 0.03 = 3%
var marginalTaxRate: Double             // Persönlicher Grenzsteuersatz
```

### Stellplatz-Typ (in Objektdaten)

```swift
var parkingType: ParkingType?          // .tiefgarage, .carport, .stellplatz, .garage, .keiner
var parkingCount: Int
```

**Wichtig:** `parkingType` und `hasParking` sind getrennte Konzepte:
- `parkingType` = Art des Stellplatzes (Objektdaten, informativ)
- `hasParking` = ob steuerliche/finanzielle Stellplatz-Felder befüllt werden sollen

---

## Enums

### ParkingType

```swift
enum ParkingType: String, CaseIterable {
    case tiefgarage = "Tiefgarage"
    case carport    = "Carport"
    case stellplatz = "Außenstellplatz"
    case garage     = "Garage"
    // KEIN .keiner — "Keiner" wird als Optional<ParkingType>.none dargestellt
}
```

**Bug-Fix:** In `WizardStepObjektdaten` war `Text("Keiner").tag(.none)` + `ForEach(ParkingType.allCases)` doppelt, weil `allCases` kein `.keiner` enthält. Korrekte Lösung: Picker mit `Optional<ParkingType>`, explizit `.none` als erste Option.

### PropertyStatus

```swift
enum PropertyStatus {
    case vermietet
    case leerstand
    case mietgarantie    // Leerstand mit Mietgarantie-Zahlung
    case eigennutzung
    case renovierung
}
```

### PropertyType, AcquisitionType, HeatingType, EnergyClass, PropertyCondition

— bestehende Enums, unverändert.

---

## StatusEntry

```swift
@Model class StatusEntry {
    var date: Date                      // Beginn dieses Status
    var status: PropertyStatus
    var incomeActualMonthly: Double?    // nur für .mietgarantie befüllt
    var notes: String
    var property: Property
}
```

`incomeActualMonthly` wird nur beim Status `.mietgarantie` im UI angezeigt und genutzt. Bei allen anderen Status ignoriert.

---

## WizardState

Spiegelt alle `Property`-Felder exakt (außer `id`, `createdAt`, `updatedAt`). Mapping erfolgt in `AddPropertyWizard.saveProperty()`.

Zusatzfelder nur in WizardState:
```swift
var firstStatusDate: Date
var firstStatus: PropertyStatus
var firstStatusIncome: Double    // nur für .mietgarantie
var firstStatusNotes: String
```

---

## Abgeleitete Werte (nicht persistiert)

```swift
// Hausgeld Wohnung nicht-umlagefähig:
hoaFeeNonRecoverableUnitMonthly = hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - maintenanceReserveMonthly

// Hausgeld Stellplatz nicht-umlagefähig:
hoaFeeParkingNonRecoverableMonthly = hoaFeeParkingTotalMonthly - hoaFeeParkingRecoverableMonthly - hoaFeeParkingMaintenanceReserveMonthly

// Monatliche Hypothekenrate (wenn kein Actual-Override):
monthlyMortgageCalc = loanAmount × (interestRate + amortizationRate) / 12

// Gesamtkaufpreis:
totalPurchasePrice = purchasePriceUnit + purchasePriceParking

// Gesamtinvestment:
totalInvestment = totalPurchasePrice + landTransferTax + notaryCosts + landRegistryCosts
                + agentFee + appraisalCosts + renovationModernizationCosts

// Eingesetztes Eigenkapital:
equityUsed = totalInvestment - loanAmount
```

---

## Migration

Alle neuen Felder haben `= 0` / `= false` als SwiftData-Default — bestehende Daten bleiben intakt.

**Auto-Migration:** `purchasePriceParking > 0` → `hasParking = true` setzen beim ersten Laden.

**Manuelle Nacharbeit durch Nutzer:**
- `propertyTaxAnnual` auf Wohnung-only-Anteil korrigieren (war früher WE+TE kombiniert)
- `propertyTaxParkingAnnual` nachtragen wenn Stellplatz vorhanden
- Hausgeld-Aufteilung ergänzen wenn steuerlich relevant
