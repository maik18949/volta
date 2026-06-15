# Immobilien Portfolio Manager — Plan 1: Foundation & Calculations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data models, utilities, and pure-Swift calculation layer — fully unit-tested — with no UI.

**Architecture:** SwiftData `@Model` classes hold all data. Pure-Swift `struct` calculators in `Calculations/` receive plain `Double`/`Date` inputs and return results — no SwiftData, no SwiftUI, fully testable. Utilities provide shared formatters and extensions used everywhere else.

**Tech Stack:** Swift 5.9+, SwiftData, XCTest, Foundation

---

> **Xcode note:** Every new `.swift` file must be added to the **Volta** app target (or VoltaTests target for test files). After creating a file on disk, drag it into Xcode's Project Navigator and confirm it is checked for the correct target. Alternatively, use File → New File in Xcode directly.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Volta/Volta/VoltaApp.swift` | Modify | Replace Item.self with real models, add error dialog |
| `Volta/Volta/Item.swift` | Delete | Default Xcode template — not needed |
| `Volta/Volta/ContentView.swift` | Delete | Replaced in Plan 2 |
| `Volta/Volta/Models/Property.swift` | Create | Main SwiftData entity |
| `Volta/Volta/Models/StatusEntry.swift` | Create | Status history entries |
| `Volta/Volta/Models/ExtraordinaryCost.swift` | Create | One-off costs |
| `Volta/Volta/Models/RentGuarantee.swift` | Create | Rent guarantee data |
| `Volta/Volta/Models/InvestmentCalculation.swift` | Create | Pre-purchase calculator entity |
| `Volta/Volta/Utilities/Formatters.swift` | Create | Shared EUR/% formatters (singleton) |
| `Volta/Volta/Utilities/Extensions+Date.swift` | Create | firstDayOfMonth, monthsBetween |
| `Volta/Volta/Utilities/Extensions+Double.swift` | Create | .asCurrency, .asPercent convenience |
| `Volta/Volta/Calculations/KPICalculator.swift` | Create | Yield, DSCR, LTV, CoC, Mietmultiplikator |
| `Volta/Volta/Calculations/CashflowCalculator.swift` | Create | Monthly cashflow by status |
| `Volta/Volta/Calculations/DepreciationCalculator.swift` | Create | AfA basis, yearly/monthly depreciation |
| `Volta/Volta/Calculations/AmortizationCalculator.swift` | Create | Remaining debt, amortization schedule |
| `Volta/Volta/Calculations/TaxCalculator.swift` | Create | V+V taxable income, tax effect |
| `Volta/Volta/Utilities/BenchmarkContext.swift` | Create | KPI thresholds + context strings |
| `Volta/VoltaTests/TestFixtures.swift` | Create | Dresdner ETW — shared test data |
| `Volta/VoltaTests/KPICalculatorTests.swift` | Create | Unit tests for KPICalculator |
| `Volta/VoltaTests/CashflowCalculatorTests.swift` | Create | Unit tests for CashflowCalculator |
| `Volta/VoltaTests/DepreciationCalculatorTests.swift` | Create | Unit tests for DepreciationCalculator |
| `Volta/VoltaTests/AmortizationCalculatorTests.swift` | Create | Unit tests for AmortizationCalculator |
| `Volta/VoltaTests/TaxCalculatorTests.swift` | Create | Unit tests for TaxCalculator |

---

## Task 1: SwiftData Models & Enums

**Files:**
- Delete: `Volta/Volta/Item.swift`
- Delete: `Volta/Volta/ContentView.swift`
- Create: `Volta/Volta/Models/Property.swift`
- Create: `Volta/Volta/Models/StatusEntry.swift`
- Create: `Volta/Volta/Models/ExtraordinaryCost.swift`
- Create: `Volta/Volta/Models/RentGuarantee.swift`
- Create: `Volta/Volta/Models/InvestmentCalculation.swift`

- [ ] **Step 1: Delete the default Xcode template files**

In Xcode Project Navigator: right-click `Item.swift` → Delete → Move to Trash.
Right-click `ContentView.swift` → Delete → Move to Trash.

- [ ] **Step 2: Create `Volta/Volta/Models/Property.swift`**

In Xcode: right-click on the `Volta/Volta` group → New Group → name it `Models`. Then right-click `Models` → New File → Swift File → `Property.swift`.

```swift
import Foundation
import SwiftData

// MARK: - Enums

enum PropertyType: String, Codable, CaseIterable {
    case apartment = "Apartment"
    case einfamilienhaus = "Einfamilienhaus"
    case mehrfamilienhaus = "Mehrfamilienhaus"
    case gewerbe = "Gewerbe"
    case grundstuck = "Grundstück"
    case sonstiges = "Sonstiges"
}

enum AcquisitionType: String, Codable, CaseIterable {
    case kauf = "Kauf"
    case erbschaft = "Erbschaft"
    case schenkung = "Schenkung"
    case kaufUndRenovierung = "Kauf_und_Renovierung"
    case neubau = "Neubau"
}

enum ParkingType: String, Codable, CaseIterable {
    case keiner = "Keiner"
    case tiefgarage = "Tiefgarage"
    case aussenstellplatz = "Außenstellplatz"
    case carport = "Carport"
    case doppelparker = "Doppelparker"
    case garage = "Garage"
}

enum HeatingType: String, Codable, CaseIterable {
    case fernwarme = "Fernwärme"
    case gas = "Gas"
    case ol = "Öl"
    case warmepumpe = "Wärmepumpe"
    case pellet = "Pellet"
    case elektro = "Elektro"
    case sonstiges = "Sonstiges"
}

enum EnergyClass: String, Codable, CaseIterable {
    case aPlusPlus = "A+"
    case a = "A"
    case b = "B"
    case c = "C"
    case d = "D"
    case e = "E"
    case f = "F"
    case g = "G"
    case h = "H"
}

enum PropertyCondition: String, Codable, CaseIterable {
    case neubau = "Neubau"
    case erstbezug = "Erstbezug"
    case gepflegt = "Gepflegt"
    case renovierungsbedurftig = "Renovierungsbedürftig"
    case sanierungsbedurftig = "Sanierungsbedürftig"
}

// MARK: - Property Model

@Model
class Property {
    // Stammdaten
    var id: UUID = UUID()
    var name: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var propertyType: PropertyType = PropertyType.apartment
    var acquisitionType: AcquisitionType = AcquisitionType.kauf
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
    var economicTransferDate: Date = Date()
    var purchasePriceUnit: Double = 0.0
    var purchasePriceParking: Double = 0.0
    var landTransferTax: Double = 0.0
    var notaryCosts: Double = 0.0
    var landRegistryCosts: Double = 0.0
    var agentFee: Double = 0.0
    var appraisalCosts: Double = 0.0
    var renovationModernizationCosts: Double = 0.0
    var renovationAfaEligible: Double = 0.0

    // Einnahmen (Prognose)
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var serviceChargeRecoverableMonthly: Double = 0.0
    var vacancyRateAssumption: Double = 0.03
    var rentMarketSqm: Double?

    // Kosten
    var hoaFeeTotalMonthly: Double = 0.0
    var hoaFeeRecoverableMonthly: Double = 0.0
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
    var monthlyMortgageActual: Double?
    var remainingDebtCurrent: Double?

    // AfA & Steuer
    var landValue: Double = 0.0
    var buildingValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0
    var landGuidelineValueSqm: Double?

    // Relationen
    @Relationship(deleteRule: .cascade) var rentGuarantee: RentGuarantee?
    @Relationship(deleteRule: .cascade) var statusHistory: [StatusEntry] = []
    @Relationship(deleteRule: .cascade) var extraordinaryCosts: [ExtraordinaryCost] = []

    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    init() {}
}
```

- [ ] **Step 3: Create `Volta/Volta/Models/StatusEntry.swift`**

```swift
import Foundation
import SwiftData

enum PropertyStatus: String, Codable, CaseIterable {
    case vermietet = "Vermietet"
    case leerstandMietgarantie = "Leerstand + Mietgarantie"
    case leerstand = "Leerstand"
    case eigennutzung = "Eigennutzung"
    case renovierung = "Renovierung"
}

@Model
class StatusEntry {
    var id: UUID = UUID()
    var property: Property?
    var statusFrom: Date = Date()
    var status: PropertyStatus = PropertyStatus.vermietet
    var incomeActualMonthly: Double = 0.0
    var notes: String?

    init(statusFrom: Date, status: PropertyStatus, incomeActualMonthly: Double, notes: String? = nil) {
        self.statusFrom = statusFrom
        self.status = status
        self.incomeActualMonthly = incomeActualMonthly
        self.notes = notes
    }
}
```

- [ ] **Step 4: Create `Volta/Volta/Models/ExtraordinaryCost.swift`**

```swift
import Foundation
import SwiftData

enum ExtraordinaryCostCategory: String, Codable, CaseIterable {
    case sonderumlage = "Sonderumlage"
    case reparatur = "Reparatur"
    case gutachter = "Gutachter"
    case rechtskosten = "Rechtskosten"
    case sonstiges = "Sonstiges"
}

@Model
class ExtraordinaryCost {
    var id: UUID = UUID()
    var property: Property?
    var costMonth: Date = Date()
    var amount: Double = 0.0
    var category: ExtraordinaryCostCategory = ExtraordinaryCostCategory.sonstiges
    var descriptionText: String?

    init(costMonth: Date, amount: Double, category: ExtraordinaryCostCategory, descriptionText: String? = nil) {
        self.costMonth = costMonth.firstDayOfMonth
        self.amount = amount
        self.category = category
        self.descriptionText = descriptionText
    }
}
```

- [ ] **Step 5: Create `Volta/Volta/Models/RentGuarantee.swift`**

```swift
import Foundation
import SwiftData

@Model
class RentGuarantee {
    var id: UUID = UUID()
    var property: Property?
    var guaranteeProvider: String = ""
    var guaranteeAmountMonthly: Double = 0.0
    var guaranteeStartDate: Date = Date()
    var guaranteeEndDate: Date = Date()
    var guaranteeNotes: String = ""

    init(guaranteeProvider: String, guaranteeAmountMonthly: Double,
         guaranteeStartDate: Date, guaranteeEndDate: Date, guaranteeNotes: String = "") {
        self.guaranteeProvider = guaranteeProvider
        self.guaranteeAmountMonthly = guaranteeAmountMonthly
        self.guaranteeStartDate = guaranteeStartDate
        self.guaranteeEndDate = guaranteeEndDate
        self.guaranteeNotes = guaranteeNotes
    }
}
```

- [ ] **Step 6: Create `Volta/Volta/Models/InvestmentCalculation.swift`**

```swift
import Foundation
import SwiftData

@Model
class InvestmentCalculation {
    var id: UUID = UUID()
    var name: String = ""

    // Kauf
    var purchasePriceUnit: Double = 0.0
    var purchasePriceParking: Double = 0.0
    var landTransferTax: Double = 0.0
    var notaryCosts: Double = 0.0
    var landRegistryCosts: Double = 0.0
    var agentFee: Double = 0.0
    var appraisalCosts: Double = 0.0
    var renovationModernizationCosts: Double = 0.0
    var renovationAfaEligible: Double = 0.0

    // Einnahmen
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var vacancyRateAssumption: Double = 0.03

    // Kosten
    var hoaFeeNonRecoverableMonthly: Double = 0.0
    var propertyManagementAnnual: Double = 0.0
    var maintenanceReserveMonthly: Double = 0.0

    // Finanzierung
    var loanAmount: Double = 0.0
    var interestRate: Double = 0.0
    var amortizationRate: Double = 0.0
    var monthlyMortgageActual: Double?

    // AfA & Steuer
    var buildingValue: Double = 0.0
    var landValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0

    // Promote
    var promotedPropertyId: UUID?
    var isPromoted: Bool = false
    var promotedAt: Date?
    var notes: String = ""

    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    init() {}
}
```

- [ ] **Step 7: Build the project to verify models compile**

In Xcode: Product → Build (Cmd+B).
Expected: Build succeeds (0 errors). You will see warnings about `ContentView` not existing — that's expected until Plan 2.

Actually: since we deleted `ContentView.swift`, `VoltaApp.swift` will fail to compile. We'll fix that in Task 2.

- [ ] **Step 8: Commit**

```bash
git add Volta/Volta/Models/
git commit -m "feat: add SwiftData models and enums"
```

---

## Task 2: Update App Entry Point

**Files:**
- Modify: `Volta/Volta/VoltaApp.swift`

- [ ] **Step 1: Replace `VoltaApp.swift` with a version using real models**

```swift
import SwiftUI
import SwiftData
import OSLog

private let logger = Logger(subsystem: "com.volta.ImmobilienPortfolio", category: "persistence")

@main
struct VoltaApp: App {
    var sharedModelContainer: ModelContainer

    init() {
        let schema = Schema([
            Property.self,
            StatusEntry.self,
            ExtraordinaryCost.self,
            RentGuarantee.self,
            InvestmentCalculation.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            sharedModelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            logger.error("ModelContainer init failed: \(error.localizedDescription)")
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            // ContentView is added in Plan 2.
            // Temporary placeholder:
            Text("Immobilien Portfolio Manager")
                .frame(minWidth: 900, minHeight: 600)
        }
        .modelContainer(sharedModelContainer)
    }
}
```

- [ ] **Step 2: Build the project**

In Xcode: Cmd+B.
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/VoltaApp.swift
git commit -m "feat: wire real SwiftData models into ModelContainer"
```

---

## Task 3: Utilities — Formatters & Extensions

**Files:**
- Create: `Volta/Volta/Utilities/Formatters.swift`
- Create: `Volta/Volta/Utilities/Extensions+Date.swift`
- Create: `Volta/Volta/Utilities/Extensions+Double.swift`

- [ ] **Step 1: Create group and `Formatters.swift`**

In Xcode: right-click `Volta/Volta` → New Group → `Utilities`.

```swift
// Volta/Volta/Utilities/Formatters.swift
import Foundation

/// Shared formatter instances. Always use these — never call .formatted() directly in Views.
enum Formatters {
    static let currency: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    static let currencyRounded: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 0
        return f
    }()

    static let percent: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 2
        return f
    }()

    static let percentOneDecimal: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 1
        return f
    }()

    static let multiplier: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 1
        f.positiveSuffix = "×"
        return f
    }()

    static func formatCurrency(_ value: Double) -> String {
        currency.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatCurrencyRounded(_ value: Double) -> String {
        currencyRounded.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatPercent(_ value: Double) -> String {
        percent.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatPercentOneDecimal(_ value: Double) -> String {
        percentOneDecimal.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatMultiplier(_ value: Double) -> String {
        multiplier.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatOptionalCurrency(_ value: Double?) -> String {
        guard let value else { return "–" }
        return formatCurrency(value)
    }

    static func formatOptionalPercent(_ value: Double?) -> String {
        guard let value else { return "–" }
        return formatPercent(value)
    }
}
```

- [ ] **Step 2: Create `Extensions+Date.swift`**

```swift
// Volta/Volta/Utilities/Extensions+Date.swift
import Foundation

extension Date {
    /// Returns a Date set to the first day of this date's month, at midnight UTC.
    var firstDayOfMonth: Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let components = cal.dateComponents([.year, .month], from: self)
        return cal.date(from: components) ?? self
    }

    /// Number of complete calendar months between self and another date.
    /// Returns nil if other < self.
    func monthsBetween(_ other: Date) -> Int? {
        guard other >= self else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let components = cal.dateComponents([.month], from: self.firstDayOfMonth, to: other.firstDayOfMonth)
        return components.month
    }

    /// Returns the month (1–12) of this date.
    var month: Int {
        Calendar.current.component(.month, from: self)
    }

    /// Returns the year of this date.
    var year: Int {
        Calendar.current.component(.year, from: self)
    }

    /// Returns a Date by adding `months` calendar months.
    func addingMonths(_ months: Int) -> Date {
        Calendar.current.date(byAdding: .month, value: months, to: self) ?? self
    }

    /// Returns a Date for the first day of a given year and month (UTC).
    static func firstDay(year: Int, month: Int) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = 1
        return cal.date(from: comps) ?? Date()
    }

    /// Remaining months in the calendar year after this date's month (inclusive of this month).
    var remainingMonthsInYear: Int {
        13 - self.month
    }
}
```

- [ ] **Step 3: Create `Extensions+Double.swift`**

```swift
// Volta/Volta/Utilities/Extensions+Double.swift
import Foundation

extension Double {
    var asCurrency: String { Formatters.formatCurrency(self) }
    var asCurrencyRounded: String { Formatters.formatCurrencyRounded(self) }
    var asPercent: String { Formatters.formatPercent(self) }
    var asPercentOneDecimal: String { Formatters.formatPercentOneDecimal(self) }
    var asMultiplier: String { Formatters.formatMultiplier(self) }
}
```

- [ ] **Step 4: Build to confirm compilation**

Cmd+B. Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Utilities/
git commit -m "feat: add Formatters, Date and Double extensions"
```

---

## Task 4: Test Fixture — Dresdner ETW

**Files:**
- Create: `Volta/VoltaTests/TestFixtures.swift`

This file defines all known values for the "ETW Dresden Neustadt" reference property. Every calculator test uses it.

- [ ] **Step 1: Create `Volta/VoltaTests/TestFixtures.swift`**

In Xcode: click on the `VoltaTests` group → New File → Swift File → `TestFixtures.swift`. Make sure it's added to the **VoltaTests** target only.

```swift
// Volta/VoltaTests/TestFixtures.swift
import Foundation
@testable import Volta

/// Single shared fixture for all calculator tests.
/// Source: "ETW Dresden Neustadt" — all values manually verified.
enum TestFixtures {
    // MARK: - Raw Input Values

    static let purchasePriceUnit: Double = 263_600.0
    static let purchasePriceParking: Double = 15_000.0
    static let purchasePrice: Double = 278_600.0         // unit + parking

    static let landTransferTax: Double = 15_323.0
    static let notaryCosts: Double = 3_631.96
    static let landRegistryCosts: Double = 1_180.0
    static let agentFee: Double = 0.0
    static let appraisalCosts: Double = 0.0
    static let closingCostsTotal: Double = 20_134.96     // sum of above 5
    static let renovationModernizationCosts: Double = 0.0
    static let renovationAfaEligible: Double = 0.0
    static let totalInvestment: Double = 298_734.96      // purchasePrice + closingCosts + renovation

    static let coldRentMonthly: Double = 950.0
    static let parkingRentMonthly: Double = 48.0
    static let coldRentYearly: Double = 11_400.0
    static let parkingRentYearly: Double = 576.0
    static let vacancyRateAssumption: Double = 0.03
    static let effectiveGrossIncomeYearly: Double = 11_616.72  // (cold+parking)*12*(1-0.03)

    static let hoaFeeTotalMonthly: Double = 417.0
    static let hoaFeeRecoverableMonthly: Double = 292.0
    static let hoaFeeNonRecoverableMonthly: Double = 125.0     // total - recoverable
    static let propertyTaxAnnual: Double = 205.0
    static let propertyTaxMonthly: Double = 17.0833333         // 205/12
    static let propertyManagementAnnual: Double = 396.0
    static let propertyManagementMonthly: Double = 33.0        // 396/12
    static let maintenanceReserveMonthly: Double = 34.76
    static let propertyInsuranceAnnual: Double = 0.0
    // operatingCostsNonRecoverableMonthly = 125 + 34.76 + 33.0 = 192.76
    static let operatingCostsNonRecoverableMonthly: Double = 192.76
    static let operatingCostsNonRecoverableYearly: Double = 2_313.12
    // operatingCostsRecoverableMonthly = 292 + 17.0833 + 0 = 309.0833
    static let operatingCostsRecoverableMonthly: Double = 309.0833333

    static let netOperatingIncomeYearly: Double = 9_303.60     // effective - nonRecovYearly

    static let loanAmount: Double = 230_000.0
    static let interestRate: Double = 0.043
    static let amortizationRate: Double = 0.01
    static let monthlyMortgageActual: Double = 1_242.85
    static let debtServiceAnnual: Double = 14_914.20           // mortgage * 12
    static let interestAnnual: Double = 9_890.0                // loanAmount * interestRate
    static let equityUsed: Double = 68_734.96                  // totalInvestment - loanAmount
    static let cashflowAfterDebtYearly: Double = -5_610.60    // NOI - debtService
    static let cashflowAfterDebtMonthly: Double = -467.55

    static let loanStartDate: Date = Date.firstDay(year: 2025, month: 10)
    static let economicTransferDate: Date = Date.firstDay(year: 2026, month: 2)

    static let landValue: Double = 50_600.0
    static let buildingValue: Double = 228_000.0
    static let depreciationRate: Double = 0.0384
    static let marginalTaxRate: Double = 0.42
    // buildingShareRatio = 228000 / 278600 = 0.818376...
    // afaBasis = 228000 + (20134.96 * 0.818376) + 0 = 244_477.97
    static let afaBasis: Double = 244_477.97
    // depreciationYearly = afaBasis * 0.0384 = 9_387.95
    static let depreciationYearly: Double = 9_387.95
    static let depreciationMonthly: Double = 782.33

    // taxableIncomeVV = 11616.72 - 2313.12 - 9890 - 9387.95 = -9974.35
    static let taxableIncomeVV: Double = -9_974.35
    // taxEffectYearly = 9974.35 * 0.42 = 4189.23
    static let taxEffectYearly: Double = 4_189.23
    static let taxEffectMonthly: Double = 349.10
}
```

- [ ] **Step 2: Build VoltaTests to confirm it compiles**

Cmd+B. Expected: 0 errors. (Tests themselves don't run until Cmd+U.)

- [ ] **Step 3: Commit**

```bash
git add Volta/VoltaTests/TestFixtures.swift
git commit -m "test: add Dresdner ETW test fixture"
```

---

## Task 5: KPICalculator (TDD)

**Files:**
- Create: `Volta/VoltaTests/KPICalculatorTests.swift`
- Create: `Volta/Volta/Calculations/KPICalculator.swift`

- [ ] **Step 1: Create `Volta/Volta/Calculations/` group in Xcode**

Right-click `Volta/Volta` → New Group → `Calculations`.

- [ ] **Step 2: Write failing tests — `Volta/VoltaTests/KPICalculatorTests.swift`**

```swift
import XCTest
@testable import Volta

final class KPICalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_grossYield() {
        let result = KPICalculator.grossYield(
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.04297, accuracy: 0.0001)
    }

    func test_grossYield_zeroPurchasePrice_returnsNil() {
        let result = KPICalculator.grossYield(
            coldRentYearly: 11_400, parkingRentYearly: 576, purchasePrice: 0)
        XCTAssertNil(result)
    }

    func test_netYield() {
        let result = KPICalculator.netYield(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            totalInvestment: f.totalInvestment
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03114, accuracy: 0.0001)
    }

    func test_netYield_zeroInvestment_returnsNil() {
        let result = KPICalculator.netYield(netOperatingIncomeYearly: 9_303, totalInvestment: 0)
        XCTAssertNil(result)
    }

    func test_capRate() {
        let result = KPICalculator.capRate(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03339, accuracy: 0.0001)
    }

    func test_cashOnCashReturn() {
        let result = KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: f.cashflowAfterDebtYearly,
            equityUsed: f.equityUsed
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, -0.08163, accuracy: 0.0001)
    }

    func test_cashOnCashReturn_zeroEquity_returnsNil() {
        let result = KPICalculator.cashOnCashReturn(cashflowAfterDebtYearly: -5_000, equityUsed: 0)
        XCTAssertNil(result)
    }

    func test_dscrNOI() {
        let result = KPICalculator.dscrNOI(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            debtServiceAnnual: f.debtServiceAnnual
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.6238, accuracy: 0.001)
    }

    func test_dscrNOI_zeroDebtService_returnsNil() {
        let result = KPICalculator.dscrNOI(netOperatingIncomeYearly: 9_000, debtServiceAnnual: 0)
        XCTAssertNil(result)
    }

    func test_mietmultiplikator() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: f.purchasePrice,
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 23.26, accuracy: 0.01)
    }

    func test_mietmultiplikator_zeroRent_returnsNil() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: 278_600, coldRentYearly: 0, parkingRentYearly: 0)
        XCTAssertNil(result)
    }

    func test_breakEvenRentMonthly() {
        let result = KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            monthlyMortgage: f.monthlyMortgageActual
        )
        XCTAssertEqual(result, 1_435.61, accuracy: 0.01)
    }
}
```

- [ ] **Step 3: Run tests — expect failure**

Cmd+U. Expected: Build failure — `KPICalculator` not found.

- [ ] **Step 4: Implement `Volta/Volta/Calculations/KPICalculator.swift`**

```swift
// Volta/Volta/Calculations/KPICalculator.swift
import Foundation

/// Pure Swift — no SwiftUI, no SwiftData. All inputs are plain Doubles.
enum KPICalculator {

    /// Bruttorendite = (Kaltmiete jährlich + Parkingmiete jährlich) / Kaufpreis
    static func grossYield(coldRentYearly: Double, parkingRentYearly: Double, purchasePrice: Double) -> Double? {
        guard purchasePrice > 0 else { return nil }
        return (coldRentYearly + parkingRentYearly) / purchasePrice
    }

    /// Nettorendite = NOI / Gesamtinvestment
    static func netYield(netOperatingIncomeYearly: Double, totalInvestment: Double) -> Double? {
        guard totalInvestment > 0 else { return nil }
        return netOperatingIncomeYearly / totalInvestment
    }

    /// Cap Rate = NOI / Kaufpreis (ohne Nebenkosten)
    static func capRate(netOperatingIncomeYearly: Double, purchasePrice: Double) -> Double? {
        guard purchasePrice > 0 else { return nil }
        return netOperatingIncomeYearly / purchasePrice
    }

    /// Cash-on-Cash Return = Cashflow nach Schuldendienst / eingesetztes EK
    static func cashOnCashReturn(cashflowAfterDebtYearly: Double, equityUsed: Double) -> Double? {
        guard equityUsed > 0 else { return nil }
        return cashflowAfterDebtYearly / equityUsed
    }

    /// DSCR (NOI-basiert) = NOI / jährlicher Schuldendienst
    static func dscrNOI(netOperatingIncomeYearly: Double, debtServiceAnnual: Double) -> Double? {
        guard debtServiceAnnual > 0 else { return nil }
        return netOperatingIncomeYearly / debtServiceAnnual
    }

    /// Mietmultiplikator = Kaufpreis / Jahreskaltmiete (inkl. Parking)
    static func mietmultiplikator(purchasePrice: Double, coldRentYearly: Double, parkingRentYearly: Double) -> Double? {
        let totalRent = coldRentYearly + parkingRentYearly
        guard totalRent > 0 else { return nil }
        return purchasePrice / totalRent
    }

    /// Break-Even-Miete = nicht-umlagefähige Kosten + Kreditrate
    static func breakEvenRentMonthly(operatingCostsNonRecoverableMonthly: Double, monthlyMortgage: Double) -> Double {
        operatingCostsNonRecoverableMonthly + monthlyMortgage
    }

    // MARK: - Intermediate helpers (used by ViewModels)

    /// Effektives Bruttoeinkommen = Bruttomiete * (1 - Leerstandsquote)
    static func effectiveGrossIncomeYearly(grossIncomeYearly: Double, vacancyRate: Double) -> Double {
        grossIncomeYearly * (1.0 - vacancyRate)
    }

    /// NOI = effektives Bruttoeinkommen - nicht-umlagefähige Kosten
    static func netOperatingIncomeYearly(effectiveGrossIncomeYearly: Double,
                                          operatingCostsNonRecoverableYearly: Double) -> Double {
        effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly
    }

    /// Cashflow nach Schuldendienst (jährlich)
    static func cashflowAfterDebtYearly(netOperatingIncomeYearly: Double, debtServiceAnnual: Double) -> Double {
        netOperatingIncomeYearly - debtServiceAnnual
    }

    /// Eingesetztes Eigenkapital = Gesamtinvestment - Darlehen
    static func equityUsed(totalInvestment: Double, loanAmount: Double) -> Double {
        totalInvestment - loanAmount
    }

    /// Nicht-umlagefähige Betriebskosten monatlich
    static func operatingCostsNonRecoverableMonthly(hoaFeeNonRecoverable: Double,
                                                      maintenanceReserve: Double,
                                                      propertyManagementMonthly: Double,
                                                      otherCostsMonthly: Double) -> Double {
        hoaFeeNonRecoverable + maintenanceReserve + propertyManagementMonthly + otherCostsMonthly
    }

    /// Umlagefähige Kosten monatlich (Mieter zahlt bei Vermietung)
    static func operatingCostsRecoverableMonthly(hoaFeeRecoverable: Double,
                                                   propertyTaxMonthly: Double,
                                                   propertyInsuranceMonthly: Double) -> Double {
        hoaFeeRecoverable + propertyTaxMonthly + propertyInsuranceMonthly
    }

    /// Gesamtinvestment = Kaufpreis + Kaufnebenkosten + Renovierung
    static func totalInvestment(purchasePrice: Double, closingCostsTotal: Double,
                                 renovationModernizationCosts: Double) -> Double {
        purchasePrice + closingCostsTotal + renovationModernizationCosts
    }

    /// Kaufnebenkosten gesamt
    static func closingCostsTotal(landTransferTax: Double, notaryCosts: Double,
                                   landRegistryCosts: Double, agentFee: Double,
                                   appraisalCosts: Double) -> Double {
        landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts
    }

    /// LTV = Restschuld / Gesamtinvestment
    static func ltvRatio(remainingDebt: Double, totalInvestment: Double) -> Double? {
        guard totalInvestment > 0 else { return nil }
        return remainingDebt / totalInvestment
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

Cmd+U. Expected: All 11 KPICalculatorTests pass.

- [ ] **Step 6: Commit**

```bash
git add Volta/Volta/Calculations/KPICalculator.swift Volta/VoltaTests/KPICalculatorTests.swift
git commit -m "feat: add KPICalculator with full unit tests"
```

---

## Task 6: CashflowCalculator (TDD)

**Files:**
- Create: `Volta/VoltaTests/CashflowCalculatorTests.swift`
- Create: `Volta/Volta/Calculations/CashflowCalculator.swift`

- [ ] **Step 1: Write failing tests**

```swift
// Volta/VoltaTests/CashflowCalculatorTests.swift
import XCTest
@testable import Volta

final class CashflowCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    // MARK: - ownerBorneRecoverableCosts

    func test_ownerBorneRecoverable_vermietet_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_ownerBorneRecoverable_leerstand_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstand,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        // 292 + 205/12 + 0 = 309.0833
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_mietgarantie_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstandMietgarantie,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_eigennutzung_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .eigennutzung,
            hoaFeeRecoverableMonthly: 292, propertyTaxMonthly: 17.08, propertyInsuranceMonthly: 0)
        XCTAssertEqual(result, 309.08, accuracy: 0.01)
    }

    // MARK: - cashflowBeforeTax

    func test_cashflowBeforeTax_vermietet() {
        // income=950, mortgage=1242.85, nonRecov=192.76, ownerRecov=0, extraordinary=0
        // expected: 950 - 1242.85 - 192.76 = -485.61
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: 0.0,
            extraordinaryCostsThisMonth: 0.0
        )
        XCTAssertEqual(result, -485.61, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_leerstand() {
        // income=0, mortgage=1242.85, nonRecov=192.76, ownerRecov=309.08, extraordinary=0
        // expected: 0 - 1242.85 - 192.76 - 309.08 = -1744.69
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 0.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: f.operatingCostsRecoverableMonthly,
            extraordinaryCostsThisMonth: 0.0
        )
        XCTAssertEqual(result, -1744.69, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_withExtraordinaryCost() {
        // Same as vermietet but with 500 € one-off cost
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: 0.0,
            extraordinaryCostsThisMonth: 500.0
        )
        XCTAssertEqual(result, -985.61, accuracy: 0.01)
    }

    func test_cashflowAfterTax() {
        let result = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: -485.61,
            taxEffectMonthly: f.taxEffectMonthly
        )
        // -485.61 + 349.10 = -136.51
        XCTAssertEqual(result, -136.51, accuracy: 0.01)
    }
}
```

- [ ] **Step 2: Run — expect build failure**

Cmd+U. Expected: Build fails — `CashflowCalculator` not found.

- [ ] **Step 3: Implement `CashflowCalculator.swift`**

```swift
// Volta/Volta/Calculations/CashflowCalculator.swift
import Foundation

enum CashflowCalculator {

    /// Umlagefähige Kosten die der Eigentümer trägt, abhängig vom Status.
    /// Bei Vermietung zahlt der Mieter — Eigentümer trägt 0.
    /// Bei Leerstand/Eigennutzung/Renovierung trägt der Eigentümer die vollen umlagefähigen Kosten.
    static func ownerBorneRecoverableCosts(
        status: PropertyStatus,
        hoaFeeRecoverableMonthly: Double,
        propertyTaxMonthly: Double,
        propertyInsuranceMonthly: Double
    ) -> Double {
        switch status {
        case .vermietet:
            return 0.0
        case .leerstandMietgarantie, .leerstand, .eigennutzung, .renovierung:
            return hoaFeeRecoverableMonthly + propertyTaxMonthly + propertyInsuranceMonthly
        }
    }

    /// Cashflow vor Steuer für einen Monat.
    static func cashflowBeforeTax(
        incomeActualMonthly: Double,
        monthlyMortgage: Double,
        operatingCostsNonRecoverableMonthly: Double,
        ownerBorneRecoverableMonthly: Double,
        extraordinaryCostsThisMonth: Double
    ) -> Double {
        incomeActualMonthly
            - monthlyMortgage
            - operatingCostsNonRecoverableMonthly
            - ownerBorneRecoverableMonthly
            - extraordinaryCostsThisMonth
    }

    /// Cashflow nach Steuer = vor Steuer + monatlicher Steuereffekt.
    /// taxEffectMonthly ist positiv wenn Verlust (Steuererstattung).
    static func cashflowAfterTax(cashflowBeforeTax: Double, taxEffectMonthly: Double) -> Double {
        cashflowBeforeTax + taxEffectMonthly
    }

    /// Effektives monatliches Bruttoeinkommen (Prognose).
    static func effectiveGrossIncomeMonthly(grossIncomeMonthly: Double, vacancyRate: Double) -> Double {
        grossIncomeMonthly * (1.0 - vacancyRate)
    }

    /// Prognose-Cashflow nach Schuldendienst (Soll-Wert, monatlich).
    static func cashflowAfterDebtMonthly(
        effectiveGrossIncomeMonthly: Double,
        operatingCostsNonRecoverableMonthly: Double,
        monthlyMortgage: Double
    ) -> Double {
        effectiveGrossIncomeMonthly - operatingCostsNonRecoverableMonthly - monthlyMortgage
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

Cmd+U. Expected: All 7 CashflowCalculatorTests pass.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Calculations/CashflowCalculator.swift Volta/VoltaTests/CashflowCalculatorTests.swift
git commit -m "feat: add CashflowCalculator with unit tests"
```

---

## Task 7: DepreciationCalculator (TDD)

**Files:**
- Create: `Volta/VoltaTests/DepreciationCalculatorTests.swift`
- Create: `Volta/Volta/Calculations/DepreciationCalculator.swift`

- [ ] **Step 1: Write failing tests**

```swift
// Volta/VoltaTests/DepreciationCalculatorTests.swift
import XCTest
@testable import Volta

final class DepreciationCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_afaBasis() {
        // buildingValue + (closingCosts * buildingShare) + renovationAfaEligible
        // = 228000 + (20134.96 * 228000/278600) + 0 = 244477.97
        let result = DepreciationCalculator.afaBasis(
            buildingValue: f.buildingValue,
            closingCostsTotal: f.closingCostsTotal,
            purchasePrice: f.purchasePrice,
            renovationAfaEligible: f.renovationAfaEligible
        )
        XCTAssertEqual(result, f.afaBasis, accuracy: 0.10)
    }

    func test_afaBasis_zeroBuilding() {
        // Grundstück ohne Gebäude → AfA-Basis = 0
        let result = DepreciationCalculator.afaBasis(
            buildingValue: 0, closingCostsTotal: 20_000, purchasePrice: 100_000, renovationAfaEligible: 0)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_afaBasis_withRenovation() {
        // buildingValue=200000, closing=10000, purchasePrice=250000, renovation=15000
        // buildingShare = 200000/250000 = 0.8
        // afaBasis = 200000 + (10000 * 0.8) + 15000 = 223000
        let result = DepreciationCalculator.afaBasis(
            buildingValue: 200_000, closingCostsTotal: 10_000, purchasePrice: 250_000, renovationAfaEligible: 15_000)
        XCTAssertEqual(result, 223_000.0, accuracy: 0.01)
    }

    func test_depreciationYearly() {
        let result = DepreciationCalculator.depreciationYearly(afaBasis: f.afaBasis, rate: f.depreciationRate)
        XCTAssertEqual(result, f.depreciationYearly, accuracy: 0.10)
    }

    func test_depreciationMonthly() {
        let result = DepreciationCalculator.depreciationMonthly(afaBasis: f.afaBasis, rate: f.depreciationRate)
        XCTAssertEqual(result, f.depreciationMonthly, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_february() {
        // economicTransferDate = 2026-02-01 → 11 months remaining (Feb–Dec)
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis,
            rate: f.depreciationRate,
            economicTransferDate: f.economicTransferDate
        )
        // 9387.95 / 12 * 11 = 8605.62
        XCTAssertEqual(result, 8_605.62, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_january() {
        // Jan → 12 months → same as full year
        let janDate = Date.firstDay(year: 2026, month: 1)
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis, rate: f.depreciationRate, economicTransferDate: janDate)
        XCTAssertEqual(result, f.depreciationYearly, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_december() {
        // Dec → 1 month
        let decDate = Date.firstDay(year: 2026, month: 12)
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis, rate: f.depreciationRate, economicTransferDate: decDate)
        XCTAssertEqual(result, f.depreciationMonthly * 1, accuracy: 0.10)
    }
}
```

- [ ] **Step 2: Run — expect build failure**

Cmd+U. Expected: Build fails — `DepreciationCalculator` not found.

- [ ] **Step 3: Implement `DepreciationCalculator.swift`**

```swift
// Volta/Volta/Calculations/DepreciationCalculator.swift
import Foundation

enum DepreciationCalculator {

    /// AfA-Basis = Gebäudewert + (Nebenkosten × Gebäudeanteil) + aktivierungspflichtige Renovierung
    /// Gebäudewert und Grundstückswert kommen aus dem Regierungs-Excel (Sachwertverfahren).
    static func afaBasis(
        buildingValue: Double,
        closingCostsTotal: Double,
        purchasePrice: Double,
        renovationAfaEligible: Double
    ) -> Double {
        guard purchasePrice > 0 else { return 0.0 }
        let buildingShareRatio = buildingValue / purchasePrice
        return buildingValue + (closingCostsTotal * buildingShareRatio) + renovationAfaEligible
    }

    /// Jährliche AfA
    static func depreciationYearly(afaBasis: Double, rate: Double) -> Double {
        afaBasis * rate
    }

    /// Monatliche AfA
    static func depreciationMonthly(afaBasis: Double, rate: Double) -> Double {
        depreciationYearly(afaBasis: afaBasis, rate: rate) / 12.0
    }

    /// AfA im Erwerbsjahr: anteilig ab erstem vollen Monat nach wirtschaftlichem Übergang.
    /// economicTransferDate bestimmt den AfA-Beginn (erster voller Monat zählt vollständig).
    static func depreciationProratedInAcquisitionYear(
        afaBasis: Double,
        rate: Double,
        economicTransferDate: Date
    ) -> Double {
        let monthsRemaining = economicTransferDate.remainingMonthsInYear
        return depreciationMonthly(afaBasis: afaBasis, rate: rate) * Double(monthsRemaining)
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

Cmd+U. Expected: All 7 DepreciationCalculatorTests pass.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Calculations/DepreciationCalculator.swift Volta/VoltaTests/DepreciationCalculatorTests.swift
git commit -m "feat: add DepreciationCalculator (AfA-Basis, Jahres-AfA, anteilige AfA)"
```

---

## Task 8: AmortizationCalculator (TDD)

**Files:**
- Create: `Volta/VoltaTests/AmortizationCalculatorTests.swift`
- Create: `Volta/Volta/Calculations/AmortizationCalculator.swift`

- [ ] **Step 1: Write failing tests**

```swift
// Volta/VoltaTests/AmortizationCalculatorTests.swift
import XCTest
@testable import Volta

final class AmortizationCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_monthlyMortgageCalc() {
        // interest component: 230000 * 0.043/12 = 824.17
        // principal component: 230000 * 0.01/12 = 191.67
        // total calc: 1015.83 — but actual override is 1242.85
        let result = AmortizationCalculator.monthlyMortgageCalc(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate
        )
        XCTAssertEqual(result, 1_015.83, accuracy: 0.10)
    }

    func test_effectiveMonthlyMortgage_usesActualWhenProvided() {
        let result = AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate,
            monthlyMortgageActual: f.monthlyMortgageActual
        )
        XCTAssertEqual(result, f.monthlyMortgageActual, accuracy: 0.001)
    }

    func test_effectiveMonthlyMortgage_fallsBackToCalcWhenNil() {
        let result = AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate,
            monthlyMortgageActual: nil
        )
        XCTAssertEqual(result, 1_015.83, accuracy: 0.10)
    }

    func test_remainingDebt_atMonthZero() {
        let result = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            atMonth: 0
        )
        XCTAssertEqual(result, f.loanAmount, accuracy: 0.01)
    }

    func test_remainingDebt_atMonth1() {
        // after 1 payment: 230000 * (1 + 0.043/12) - 1242.85
        // = 230000 * 1.003583 - 1242.85 = 230824.17 - 1242.85 = 229581.32
        let result = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            atMonth: 1
        )
        XCTAssertEqual(result, 229_581.32, accuracy: 1.0)
    }

    func test_remainingDebt_decreasesOverTime() {
        let r0 = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount, interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual, atMonth: 0)
        let r12 = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount, interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual, atMonth: 12)
        XCTAssertLessThan(r12, r0)
    }

    func test_amortizationSchedule_firstRowIsLoanStart() {
        let schedule = AmortizationCalculator.amortizationSchedule(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            loanStartDate: f.loanStartDate,
            months: 12
        )
        XCTAssertEqual(schedule.count, 12)
        XCTAssertEqual(schedule[0].remainingDebt, f.loanAmount, accuracy: 1.0)
    }

    func test_amortizationSchedule_interestPlusPrincipalEqualsPayment() {
        let schedule = AmortizationCalculator.amortizationSchedule(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            loanStartDate: f.loanStartDate,
            months: 6
        )
        for row in schedule {
            XCTAssertEqual(row.interest + row.principal, row.payment, accuracy: 0.01)
        }
    }
}
```

- [ ] **Step 2: Run — expect build failure**

Cmd+U. Expected: Build fails.

- [ ] **Step 3: Implement `AmortizationCalculator.swift`**

```swift
// Volta/Volta/Calculations/AmortizationCalculator.swift
import Foundation

enum AmortizationCalculator {

    struct AnnuityRow: Identifiable {
        let id: Int         // month index (1-based)
        let date: Date
        let interest: Double
        let principal: Double
        let payment: Double
        let remainingDebt: Double
    }

    /// Berechnete monatliche Rate (Zins + Tilgung) — kann durch monthlyMortgageActual überschrieben werden.
    static func monthlyMortgageCalc(loanAmount: Double, interestRate: Double, amortizationRate: Double) -> Double {
        let interestMonthly = loanAmount * (interestRate / 12.0)
        let principalMonthly = loanAmount * (amortizationRate / 12.0)
        return interestMonthly + principalMonthly
    }

    /// Effektive monatliche Rate: nimmt `monthlyMortgageActual` wenn gesetzt, sonst berechnet.
    static func effectiveMonthlyMortgage(
        loanAmount: Double,
        interestRate: Double,
        amortizationRate: Double,
        monthlyMortgageActual: Double?
    ) -> Double {
        if let actual = monthlyMortgageActual, actual > 0 {
            return actual
        }
        return monthlyMortgageCalc(loanAmount: loanAmount, interestRate: interestRate, amortizationRate: amortizationRate)
    }

    /// Dynamische Restschuld nach t Monaten (Annuitätenformel).
    /// t = 0 gibt das Ausgangsdarlehen zurück.
    static func remainingDebt(
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        atMonth t: Int
    ) -> Double {
        guard t > 0 else { return loanAmount }
        let r = interestRate / 12.0
        guard r > 0 else {
            // Zero-interest edge case
            return loanAmount - monthlyPayment * Double(t)
        }
        let factor = pow(1.0 + r, Double(t))
        return loanAmount * factor - monthlyPayment * (factor - 1.0) / r
    }

    /// Tilgungsplan als Array von AnnuityRow, beginnend ab loanStartDate.
    static func amortizationSchedule(
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        loanStartDate: Date,
        months: Int
    ) -> [AnnuityRow] {
        let r = interestRate / 12.0
        var rows: [AnnuityRow] = []
        var currentDebt = loanAmount

        for t in 1...max(1, months) {
            let interest = currentDebt * r
            let principal = monthlyPayment - interest
            currentDebt -= principal
            let date = loanStartDate.addingMonths(t - 1)
            rows.append(AnnuityRow(
                id: t,
                date: date,
                interest: interest,
                principal: max(0, principal),
                payment: monthlyPayment,
                remainingDebt: max(0, currentDebt)
            ))
        }
        return rows
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

Cmd+U. Expected: All 8 AmortizationCalculatorTests pass.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Calculations/AmortizationCalculator.swift Volta/VoltaTests/AmortizationCalculatorTests.swift
git commit -m "feat: add AmortizationCalculator with remaining debt and schedule"
```

---

## Task 9: TaxCalculator (TDD)

**Files:**
- Create: `Volta/VoltaTests/TaxCalculatorTests.swift`
- Create: `Volta/Volta/Calculations/TaxCalculator.swift`

- [ ] **Step 1: Write failing tests**

```swift
// Volta/VoltaTests/TaxCalculatorTests.swift
import XCTest
@testable import Volta

final class TaxCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_taxableIncomeVV() {
        // 11616.72 - 2313.12 - 9890.0 - 9387.95 = -9974.35
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertEqual(result, f.taxableIncomeVV, accuracy: 1.0)
    }

    func test_taxableIncomeVV_isNegativeForTypicalHighLeverageProperty() {
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertLessThan(result, 0)
    }

    func test_taxEffectYearly_negativeTaxableIncome_isPositive() {
        // Loss → refund → positive effect
        let result = TaxCalculator.taxEffectYearly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectYearly, accuracy: 1.0)
        XCTAssertGreaterThan(result, 0)
    }

    func test_taxEffectYearly_positiveTaxableIncome_isNegative() {
        // Profit → tax due → negative cashflow effect
        let result = TaxCalculator.taxEffectYearly(taxableIncomeVV: 5_000, marginalTaxRate: 0.42)
        XCTAssertEqual(result, -2_100.0, accuracy: 0.01)
    }

    func test_taxEffectMonthly() {
        let result = TaxCalculator.taxEffectMonthly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectMonthly, accuracy: 0.10)
    }

    func test_taxEffectMonthly_zeroMarginalRate() {
        let result = TaxCalculator.taxEffectMonthly(taxableIncomeVV: -10_000, marginalTaxRate: 0.0)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }
}
```

- [ ] **Step 2: Run — expect build failure**

Cmd+U. Expected: Build fails.

- [ ] **Step 3: Implement `TaxCalculator.swift`**

```swift
// Volta/Volta/Calculations/TaxCalculator.swift
import Foundation

enum TaxCalculator {

    /// Zu versteuerndes V+V-Ergebnis (vereinfacht, ohne Progression).
    /// Negativ = Verlust = Verrechnung mit anderen Einkünften → Steuererstattung.
    static func taxableIncomeVV(
        effectiveGrossIncomeYearly: Double,
        operatingCostsNonRecoverableYearly: Double,
        interestAnnual: Double,
        depreciationYearly: Double
    ) -> Double {
        effectiveGrossIncomeYearly
            - operatingCostsNonRecoverableYearly
            - interestAnnual
            - depreciationYearly
    }

    /// Steuereffekt jährlich: negatives Ergebnis × Grenzsteuersatz × (−1)
    /// Positiver Rückgabewert = Steuererstattung (erhöht Cashflow).
    /// Negativer Rückgabewert = Steuerzahlung (senkt Cashflow).
    static func taxEffectYearly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxableIncomeVV * marginalTaxRate * -1.0
    }

    /// Monatlicher Steuereffekt = jährlicher Effekt / 12.
    static func taxEffectMonthly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxEffectYearly(taxableIncomeVV: taxableIncomeVV, marginalTaxRate: marginalTaxRate) / 12.0
    }

    /// Jahresinteressen (für Werbungskosten-Berechnung).
    static func interestAnnual(loanAmount: Double, interestRate: Double) -> Double {
        loanAmount * interestRate
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

Cmd+U. Expected: All 6 TaxCalculatorTests pass.

- [ ] **Step 5: Final full test run**

Cmd+U. Expected: All tests pass (6 KPI + 7 Cashflow + 7 Depreciation + 8 Amortization + 6 Tax = 34 tests total).

- [ ] **Step 6: Commit**

```bash
git add Volta/Volta/Calculations/TaxCalculator.swift Volta/VoltaTests/TaxCalculatorTests.swift
git commit -m "feat: add TaxCalculator (V+V Ergebnis, Steuereffekt)"
```

---

## Task 10: BenchmarkContext

**Files:**
- Create: `Volta/Volta/Utilities/BenchmarkContext.swift`

This file provides the rating labels and context strings shown in `KPICardWithContext`. All thresholds are from `docs/superpowers/specs/2026-06-14-kpi-benchmarks.md`.

- [ ] **Step 1: Create `BenchmarkContext.swift`**

```swift
// Volta/Volta/Utilities/BenchmarkContext.swift
import Foundation

enum BenchmarkRating: String {
    case sehrGut = "Sehr gut"
    case gut = "Gut"
    case okay = "Okay"
    case schlecht = "Schlecht"
    case kritisch = "Kritisch"
    case neutral = "–"
}

struct BenchmarkResult {
    let rating: BenchmarkRating
    let context: String
}

enum BenchmarkContext {

    // MARK: - Bruttorendite

    static func grossYield(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.035:
            rating = .schlecht
            context = "Unter 3,5% — bei Finanzierungskosten von 4%+ oft nicht kostendeckend."
        case 0.035..<0.045:
            rating = .okay
            context = "3,5–4,5% — A-Lagen strukturell bedingt, kein Qualitätsmerkmal."
        case 0.045..<0.06:
            rating = .gut
            context = "4,5–6,0% — solide Bruttorendite im aktuellen Zinsumfeld."
        default:
            rating = .sehrGut
            context = "Über 6,0% — überdurchschnittlich. Risiken (Lage, Substanz) prüfen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Nettorendite

    static func netYield(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.02:
            rating = .schlecht
            context = "Unter 2,0% — bei 4% Zinsen wirtschaftlich kritisch."
        case 0.02..<0.03:
            rating = .okay
            context = "2,0–3,0% — Faustregel: Nettorendite ≈ Bruttorendite minus 1,5–2,5 Prozentpunkte."
        case 0.03..<0.045:
            rating = .gut
            context = "3,0–4,5% — gute Nettorendite im aktuellen Markt."
        default:
            rating = .sehrGut
            context = "Über 4,5% — sehr gut. Auf Altbau-Instandhaltungsrisiken achten."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Mietmultiplikator

    static func mietmultiplikator(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<17:
            rating = .sehrGut
            context = "Unter 17 — günstiger Einstieg. C-Lagen mit Strukturrisiken prüfen."
        case 17..<22:
            rating = .gut
            context = "17–22 — B-Lagen typisch. Gute Ausgangsbasis."
        case 22..<28:
            rating = .okay
            context = "22–28 — A-Lagen Standard 2024. Cashflow oft negativ."
        default:
            rating = .schlecht
            context = "Über 28 — A-Lagen-Peak-Niveau. Bei 4%+ Zinsen kaum tragfähig."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Cash-on-Cash Return

    static func cashOnCash(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0:
            rating = .schlecht
            context = "Negativ — laufender Eigenkapitalverzehr. In A-Lagen mit Wertsteigerungspotenzial tolerierbar."
        case 0..<0.03:
            rating = .okay
            context = "0–3% — bei hohem Hebel in A/B-Städten realistisch. Stark eigenkapitalabhängig."
        case 0.03..<0.06:
            rating = .gut
            context = "3–6% — guter Cash-on-Cash. Tilgung baut zusätzlich EK auf."
        default:
            rating = .sehrGut
            context = "Über 6% — sehr gut. Niedrigen Kaufpreisfaktor oder viel EK eingesetzt."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - DSCR

    static func dscr(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.85:
            rating = .schlecht
            context = "Unter 0,85 — kritisches Refinanzierungsrisiko. NOI deckt Schuldendienst bei weitem nicht."
        case 0.85..<1.0:
            rating = .okay
            context = "0,85–1,0 — bei aktuellen Zinsen in A/B-Lagen strukturell normal. Einkommensnachweis entscheidend."
        case 1.0..<1.25:
            rating = .gut
            context = "1,0–1,25 — NOI deckt Schuldendienst. Banken fordern 1,2–1,5 für optimale Konditionen."
        default:
            rating = .sehrGut
            context = "Über 1,25 — sehr komfortabel. Spielraum für Zinsanstieg bei Prolongation."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - LTV

    static func ltv(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.60:
            rating = .sehrGut
            context = "Unter 60% — Pfandbrief-Beleihungsgrenze. Beste Zinskonditionen."
        case 0.60..<0.75:
            rating = .gut
            context = "60–75% — solide Beleihung. Guter Puffer für Wertkorrektur."
        case 0.75..<0.85:
            rating = .okay
            context = "75–85% — üblich bei Vollfinanzierung. Zinszuschlag ca. +1,3% gegenüber <60%."
        default:
            rating = .schlecht
            context = "Über 85% — hohes Refinanzierungsrisiko. Nebenkosten immer aus EK finanzieren."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Cashflow pro Monat

    static func cashflowMonthly(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<(-300):
            rating = .kritisch
            context = "Unter −300 €/Monat — kritisch. Belastung nicht durch Steuereffekt kompensierbar."
        case (-300)..<(-100):
            rating = .okay
            context = "−300 bis −100 €/Monat — in A-Lagen bei hohem Grenzsteuersatz tolerierbar. Tilgung zählt als EK-Aufbau."
        case (-100)..<100:
            rating = .gut
            context = "−100 bis +100 €/Monat — näherungsweise Breakeven. Gute Ausgangsposition."
        default:
            rating = .sehrGut
            context = "Über +100 €/Monat — positiver Cashflow. Selten in A-Städten mit aktuellen Zinsen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Leerstandsquote

    static func vacancyRate(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.02:
            rating = .sehrGut
            context = "Unter 2% — Markt-Leerstand Westdeutschland 2024. Angespannter Wohnungsmarkt."
        case 0.02..<0.05:
            rating = .gut
            context = "2–5% — konservative Planung inkl. Mieterwechsel und Zahlungsverzug."
        case 0.05..<0.08:
            rating = .okay
            context = "5–8% — erhöhtes Mietausfallrisiko. Lageanalyse empfohlen."
        default:
            rating = .schlecht
            context = "Über 8% — strukturschwache Region oder Objektmängel. Prüfen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }
}
```

- [ ] **Step 2: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Utilities/BenchmarkContext.swift
git commit -m "feat: add BenchmarkContext with KPI thresholds and context strings"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 5 models defined. All 5 calculators implemented with TDD. Formatters, Date/Double extensions, BenchmarkContext all covered.
- [x] **No placeholders:** All code is complete. No TBD or TODO in plan steps.
- [x] **Type consistency:** `PropertyStatus` defined in `StatusEntry.swift` used in `CashflowCalculator`. `Date.firstDay(year:month:)` defined in `Extensions+Date.swift` and used in `TestFixtures`. `AnnuityRow.id` is `Int` throughout.
- [x] **iCloud CloudKit compatibility:** All `@Model` classes have default values on all non-optional stored properties, per CLAUDEvolta.md requirement.
- [x] **`ExtraordinaryCost.init`** normalizes `costMonth` via `.firstDayOfMonth` — requires `Extensions+Date.swift` to exist first (Task 3 before Task 1 in terms of dependency — note: Swift compiles all files together so this is fine at runtime, but add `Extensions+Date.swift` to target before building models).
