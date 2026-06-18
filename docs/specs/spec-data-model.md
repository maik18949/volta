# Datenmodell

**Datei:** `Volta/Models/Property.swift`  
**WizardState:** `Volta/Views/Wizard/WizardState.swift`

---

## Enums

### AcquisitionType

```swift
enum AcquisitionType: String, CaseIterable {
    case kauf      = "Kauf"
    case erbschaft = "Erbschaft"
    case schenkung = "Schenkung"
    // ENTFERNT: kaufUndRenovierung, neubau
}
```

### ParkingType

```swift
enum ParkingType: String, CaseIterable {
    case nichtVorhanden   = "Nicht vorhanden"
    case tiefgarage       = "Tiefgarage"
    case aussenstellplatz = "Außenstellplatz"
    case garage           = "Garage"
    // ENTFERNT: keiner, carport, doppelparker
}
```

**Wichtig:** `parkingType` ist nicht optional — Default ist `.nichtVorhanden`. Alle Stellplatz-Felder (Einnahmen, Kosten, Kauf) erscheinen nur wenn `parkingType != .nichtVorhanden`. Kein separates `hasParking`-Feld.

### PropertyType

```swift
enum PropertyType: String, CaseIterable {
    case apartment        = "Eigentumswohnung"
    case einfamilienhaus  = "Einfamilienhaus"
    case mehrfamilienhaus = "Mehrfamilienhaus"
    case gewerbe          = "Gewerbe"
    case grundstuck       = "Grundstück"
    case sonstiges        = "Sonstiges"
}
```

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

### HeatingType, EnergyClass, PropertyCondition

— unverändert.

---

## Property — Gespeicherte Felder

### Stammdaten

```swift
var name: String
var address: String
var city: String
var state: String
var postalCode: String
var propertyType: PropertyType
var acquisitionType: AcquisitionType      // Kauf / Erbschaft / Schenkung
var yearBuilt: Int?
var notes: String
```

### Objektdaten

```swift
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
var parkingType: ParkingType = .nichtVorhanden   // nicht optional, Default = .nichtVorhanden
var parkingCount: Int = 0                         // nur relevant wenn != .nichtVorhanden
var heatingType: HeatingType?
var energyEfficiencyClass: EnergyClass?
var condition: PropertyCondition?
var lastRenovationYear: Int?
```

### Kauf & Nebenkosten

```swift
var purchaseDate: Date                    // Kaufdatum / Datum Erbschaft / Schenkung (Label je acquisitionType)
var economicTransferDate: Date            // Wirtschaftlicher Übergang — AfA-Startpunkt
var purchasePriceUnit: Double             // Kaufpreis Wohnung
var purchasePriceParking: Double          // Kaufpreis Stellplatz (nur wenn parkingType != .nichtVorhanden)
var landTransferTax: Double               // Grunderwerbsteuer
var notaryCosts: Double
var landRegistryCosts: Double
var agentFee: Double                      // Maklerprovision
var appraisalCosts: Double                // Gutachterkosten
var renovationModernizationCosts: Double  // Renovierung gesamt
var renovationAfaEligible: Double         // davon aktivierungspflichtig (erhöht AfA-Bemessungsgrundlage)
```

### Einnahmen

```swift
var coldRentMonthly: Double               // Kaltmiete / Monat (Nettomiete ohne NK)
var parkingRentMonthly: Double            // Stellplatzmiete / Monat (nur wenn parkingType != .nichtVorhanden)
var otherIncomeMonthly: Double            // Sonstige Einnahmen / Monat
var vacancyRateAssumption: Double         // Angenommene Leerstandsquote, z.B. 3%
var rentMarketSqm: Double?               // Marktmiete / m² (informativ)
```

### Kosten — Wohnung

```swift
var hoaFeeTotalMonthly: Double                   // Hausgeld Wohnung gesamt / Monat
var isHoaUnitSplit: Bool = false                 // Toggle: Hausgeld aufteilen
var hoaFeeRecoverableMonthly: Double             // davon umlagefähig / Monat (nur wenn isHoaUnitSplit)
var hoaFeeMaintenanceReserveMonthly: Double      // davon Instandhaltungsrücklage / Monat (nur wenn isHoaUnitSplit)
// hoaFeeNonRecoverableMonthly — abgeleitet: total - recoverable - reserve (siehe Berechnete Werte)
var propertyTaxAnnual: Double                    // Grundsteuer Wohnung / Jahr
var propertyManagementAnnual: Double             // Hausverwaltung / Jahr
var propertyInsuranceAnnual: Double              // Gebäudeversicherung / Jahr (nur wenn nicht im Hausgeld enthalten)
var otherCostsMonthly: Double                    // Sonstige Kosten / Monat
```

### Kosten — Stellplatz (nur wenn parkingType != .nichtVorhanden)

```swift
var hoaFeeParkingTotalMonthly: Double                    // Hausgeld Stellplatz gesamt / Monat
var isHoaParkingSplit: Bool = false                      // Toggle: Hausgeld Stellplatz aufteilen
var hoaFeeParkingRecoverableMonthly: Double              // davon umlagefähig / Monat (nur wenn isHoaParkingSplit)
var hoaFeeParkingMaintenanceReserveMonthly: Double       // davon Rücklage / Monat (nur wenn isHoaParkingSplit)
// hoaFeeParkingNonRecoverableMonthly — abgeleitet: total - recoverable - reserve (siehe Berechnete Werte)
var propertyTaxParkingAnnual: Double                     // Grundsteuer Stellplatz / Jahr
```

### Finanzierung

```swift
var loanAmount: Double                    // Darlehensbetrag (Anfangsbetrag)
var interestRate: Double                  // Zinssatz jährl., z.B. 3,50%
var amortizationRate: Double              // Tilgungssatz jährl., z.B. 2,00%
var fixedInterestPeriodYears: Int         // Zinsbindung in Jahren
var loanStartDate: Date                   // Darlehensbeginn
var monthlyMortgage: Double               // Monatsrate — im Wizard vorausgefüllt mit loanAmount × (rate + tilgung) / 12, direkt editierbar
var equityContributed: Double             // Eigenkapital selbst eingebracht
var brokerCommissionAgreement: Double     // Anteil aus Eigenprovisions-Vereinbarung (nicht Teil des Kaufpreises)
```

**Hinweis equityContributed vs equityUsed:**
- `equityContributed` (gespeichert) = was der Nutzer selbst eingebracht hat
- `equityUsed` (berechnet) = `totalInvestment − loanAmount`
- `equityContributed + brokerCommissionAgreement` sollte `equityUsed` ergeben

### AfA & Steuer

```swift
var landValue: Double                     // Grundstückswert (aus Regierungs-Excel)
var buildingValue: Double                 // Gebäudewert (aus Regierungs-Excel)
var depreciationRate: Double              // AfA-Satz, z.B. 2% (Altbau) oder 3% (Neubau ab 2023)
var marginalTaxRate: Double               // Persönlicher Grenzsteuersatz, z.B. 42%
```

---

## Berechnete Werte (nicht persistiert)

### Kosten — abgeleitete Felder

```swift
hoaFeeNonRecoverableMonthly        = hoaFeeTotalMonthly − hoaFeeRecoverableMonthly − hoaFeeMaintenanceReserveMonthly
hoaFeeParkingNonRecoverableMonthly = hoaFeeParkingTotalMonthly − hoaFeeParkingRecoverableMonthly − hoaFeeParkingMaintenanceReserveMonthly
```

### Investment

```swift
totalPurchasePrice    = purchasePriceUnit + purchasePriceParking
closingCostsTotal     = landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts
closingCostsRatio     = closingCostsTotal / totalPurchasePrice
totalInvestment       = totalPurchasePrice + closingCostsTotal + renovationModernizationCosts
equityUsed            = totalInvestment − loanAmount
purchasePricePerSqm   = totalPurchasePrice / livingAreaSqm
totalInvestmentPerSqm = totalInvestment / livingAreaSqm
```

### Einnahmen & Leerstand

```swift
totalColdRentMonthly       = coldRentMonthly + parkingRentMonthly + otherIncomeMonthly
warmmieteMonthly           = coldRentMonthly + hoaFeeRecoverableMonthly + (propertyTaxAnnual / 12)
rentPerSqm                 = coldRentMonthly / livingAreaSqm
vacancyLossAnnual          = totalColdRentMonthly × 12 × vacancyRateAssumption
effectiveGrossIncomeYearly = totalColdRentMonthly × 12 − vacancyLossAnnual
```

### Finanzierung

```swift
remainingDebtNow              = AmortizationCalculator.remainingDebt(atMonth: monthsElapsed)
monthlyInterestPayment(m)     = AnnuityRow.interest für Monat m (aus Tilgungsplan)
monthlyAmortizationPayment(m) = AnnuityRow.principal für Monat m (aus Tilgungsplan)
fixedRateEndDate              = loanStartDate + fixedInterestPeriodYears Jahre
remainingDebtAtFixedRateEnd   = remainingDebt(atMonth: fixedRateEndDate)
interestAnnual(year)          = Σ AnnuityRow.interest für alle Monate in Jahr Y
// BUG: PropertyViewModel nutzt aktuell remainingDebtNow × interestRate (Näherung) — muss auf Tilgungsplan umgestellt werden
```

### AfA

```swift
afaBemessungsgrundlage = buildingValue + (closingCostsTotal × buildingValue / totalPurchasePrice) + renovationAfaEligible
depreciationYearly     = afaBemessungsgrundlage × depreciationRate  // anteilig im Erwerbsjahr
```

### KPIs

```swift
grossYield            = (coldRentMonthly + parkingRentMonthly) × 12 / totalPurchasePrice
netYield              = NOI / totalInvestment
capRate               = NOI / totalPurchasePrice
cashOnCashReturn      = cashflowAfterDebtYearly / equityContributed  // fallback: equityUsed wenn equityContributed = 0
dscrNOI               = NOI / (monthlyMortgage × 12)
ltvRatio              = remainingDebtNow / totalInvestment
mietmultiplikator     = totalPurchasePrice / ((coldRentMonthly + parkingRentMonthly) × 12)
NOI                   = effectiveGrossIncomeYearly − operatingCostsNonRecoverableYearly  // ohne Kredit
breakEvenRentMonthly  = operatingCostsNonRecoverableMonthly + monthlyMortgage
operatingExpenseRatio = (nonRecoverableYearly + recoverableYearly) / (totalColdRentMonthly × 12)
```

**Steuerliches Ergebnis & Cashflow** — vollständige Formeln mit Vermietet/Leerstand-Logik in `spec-steuer-tab.md` und `spec-cashflow-tab.md`.

---

## Felder entfernt (vs. vorherige Version)

| Feld | Grund |
|------|-------|
| `hasParking` | Ersetzt durch `parkingType != .nichtVorhanden` |
| `serviceChargeRecoverableMonthly` | In Hausgeld-Aufteilung integriert |
| `maintenanceReserveMonthly` | Umbenannt zu `hoaFeeMaintenanceReserveMonthly` (Teil des Hausgelds) |
| `landGuidelineValueSqm` | Nicht benötigt |
| `monthlyMortgageActual` | Ersetzt durch `monthlyMortgage` (direkt gespeichert, im Wizard editierbar) |
| `AcquisitionType.kaufUndRenovierung` | Entfernt |
| `AcquisitionType.neubau` | Entfernt |
| `ParkingType.keiner` | Ersetzt durch `.nichtVorhanden` als Default |
| `ParkingType.carport` | Entfernt |
| `ParkingType.doppelparker` | Entfernt |

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

---

## ExtraordinaryCost

Einmalige Ausgaben in einem bestimmten Monat. Verwaltet im Verlauf-Tab.

```swift
@Model class ExtraordinaryCost {
    var date: Date                      // Datum der Ausgabe
    var description: String             // z.B. "Vermietungsprovision", "WEG Sonderumlage"
    var amount: Double                  // Betrag (positiv gespeichert, als Ausgabe behandelt)
    var isDeductible: Bool              // steuerlich absetzbar (§9 EStG)?
    var notes: String?
    var property: Property
}
```

**Wirkung:**
- Immer: Cashflow-Abfluss im jeweiligen Monat
- Nur wenn `isDeductible = true`: reduziert steuerliches Ergebnis → erhöht Steuererstattung

---

## WizardState

Spiegelt alle `Property`-Felder exakt. Mapping in `AddPropertyWizard.saveProperty()`.

Zusatzfelder nur in WizardState:
```swift
var firstStatusDate: Date
var firstStatus: PropertyStatus
var firstStatusIncome: Double    // nur für .mietgarantie
var firstStatusNotes: String
```

---

## Migration

Alle neuen Felder: `= 0` / `= false` als SwiftData-Default — bestehende Daten bleiben intakt.

**Manuelle Nacharbeit durch Nutzer:**
- `propertyTaxAnnual` auf Wohnung-only-Anteil korrigieren
- `propertyTaxParkingAnnual` nachtragen wenn Stellplatz vorhanden
- Hausgeld-Aufteilung ergänzen wenn steuerlich relevant
- `equityContributed` nachtragen
