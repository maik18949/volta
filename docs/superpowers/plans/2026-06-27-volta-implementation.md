# Volta Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 8 feature branches (foundation → shell → 6 tabs) to bring Volta fully in line with the specs in `docs/specs/`.

**Architecture:** Each branch is independently reversible. Foundation must merge first; shell depends on foundation; the 6 tab branches are independent of each other after shell lands. Design = visual direction only — `docs/specs/*.md` and code are authoritative for field names, logic, and behavior.

**Tech Stack:** Swift 5.9, SwiftUI, SwiftData (iOS 17+), SF Symbols, SF Pro / SF Mono

**Design files (visual reference only):**
- `docs/specs/volta-ios-design-specification/project/Volta Hauptscreen.dc.html`
- `docs/specs/volta-ios-design-specification/project/Volta Detail.dc.html`
- `docs/specs/volta-ios-design-specification/project/Volta Setup.dc.html`

**SwiftData migration:** No production data to preserve — fresh app install on each test device is fine. No `VersionedSchema` migration needed; just delete and reinstall when schema changes.

**Files to delete in `shell` branch** (replaced by new implementations):
- `Volta/Volta/Views/Wizard/AddPropertyWizard.swift`
- `Volta/Volta/Views/Wizard/WizardState.swift`
- `Volta/Volta/Views/Wizard/WizardStepStammdaten.swift`
- `Volta/Volta/Views/Wizard/WizardStepObjektdaten.swift`
- `Volta/Volta/Views/Wizard/WizardStepKauf.swift`
- `Volta/Volta/Views/Wizard/WizardStepEinnahmen.swift`
- `Volta/Volta/Views/Wizard/WizardStepKosten.swift`
- `Volta/Volta/Views/Wizard/WizardStepFinanzierung.swift`
- `Volta/Volta/Views/Wizard/WizardStepAfA.swift`
- `Volta/Volta/Views/Wizard/WizardStepStatusOnboarding.swift`
- `Volta/Volta/Views/Property/SettingsTab.swift`

**Branch order:**
1. `foundation` — data model + calculators + design tokens
2. `shell` — Hauptscreen + PropertySetup sidebar + delete old wizard files
3. `tab/uebersicht`, `tab/cashflow`, `tab/steuer`, `tab/verlauf`, `tab/finanzierung`, `tab/immobiliendaten` — parallel after shell

---

## Branch 1: `foundation`

**Specs:** `spec-data-model.md`, `spec-calculations.md`, `spec-design-system.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Models/Property.swift` |
| Modify | `Volta/Volta/Models/StatusEntry.swift` |
| Create | `Volta/Volta/Models/PropertyPhoto.swift` |
| Modify | `Volta/Volta/Design/Color+App.swift` |
| Modify | `Volta/Volta/Design/Font+App.swift` |
| Create | `Volta/Volta/Design/AppBackground.swift` |
| Create | `Volta/Volta/Views/Components/GlassCard.swift` |
| Create | `Volta/Volta/Views/Components/SectionDivider.swift` |
| Create | `Volta/Volta/Views/Components/KPIChip.swift` |
| Create | `Volta/Volta/Views/Components/InfoBottomSheet.swift` |
| Modify | `Volta/Volta/Calculations/TaxCalculator.swift` |
| Modify | `Volta/Volta/Calculations/CashflowCalculator.swift` |
| Modify | `Volta/Volta/Calculations/KPICalculator.swift` |
| Modify | `Volta/VoltaTests/TaxCalculatorTests.swift` |
| Modify | `Volta/VoltaTests/CashflowCalculatorTests.swift` |
| Modify | `Volta/VoltaTests/KPICalculatorTests.swift` |

---

### Task 1.1 — Fix enums in Property.swift

**Files:** Modify `Volta/Volta/Models/Property.swift`

- [ ] **Step 1: Replace AcquisitionType** — remove `.kaufUndRenovierung` and `.neubau`

```swift
enum AcquisitionType: String, Codable, CaseIterable {
    case kauf      = "Kauf"
    case erbschaft = "Erbschaft"
    case schenkung = "Schenkung"
}
```

- [ ] **Step 2: Replace ParkingType** — `.keiner` → `.nichtVorhanden`, remove `.carport`, `.doppelparker`

```swift
enum ParkingType: String, Codable, CaseIterable {
    case nichtVorhanden   = "Nicht vorhanden"
    case tiefgarage       = "Tiefgarage"
    case aussenstellplatz = "Außenstellplatz"
    case garage           = "Garage"
}
```

- [ ] **Step 3: Add PropertyStatus enum** (before Property class)

```swift
enum PropertyStatus: String, Codable {
    case vermietet     = "Vermietet"
    case leerstand     = "Leerstand"
    case mietgarantie  = "Mietgarantie"
}
```

- [ ] **Step 4: Fix parkingType field** — change from `Optional<ParkingType>` to non-optional with default

```swift
var parkingType: ParkingType = .nichtVorhanden
```

- [ ] **Step 5: Run build** — confirm compile errors from removed cases. Fix any switch statements that referenced `.keiner`, `.carport`, `.doppelparker`, `.kaufUndRenovierung`, `.neubau` by replacing with appropriate new cases or adding `default:` branches.

- [ ] **Step 6: Commit**
```bash
git add Volta/Volta/Models/Property.swift
git commit -m "fix(model): align enums with spec — remove deprecated AcquisitionType/ParkingType cases"
```

---

### Task 1.2 — Add missing fields to Property.swift

**Files:** Modify `Volta/Volta/Models/Property.swift`

- [ ] **Step 1: Add missing Einnahmen fields** after `otherIncomeMonthly`:

```swift
var warmmieteMonthly: Double?             // Bruttomiete / Monat, optional, informativ
```

- [ ] **Step 2: Add missing Annahmen fields** after `rentMarketSqm`:

```swift
var currentMarketValue: Double?           // Aktueller Marktwert gesamt (manuell)
```

- [ ] **Step 3: Add missing Kosten-Wohnung fields** — replace `maintenanceReserveMonthly` with:

```swift
var isHoaUnitSplit: Bool = false
var hoaFeeMaintenanceReserveMonthly: Double = 0.0
var propertyTaxParkingAnnual: Double = 0.0
```

Remove `maintenanceReserveMonthly` and `serviceChargeRecoverableMonthly`.

- [ ] **Step 4: Add Kosten-Stellplatz fields** after `propertyTaxParkingAnnual`:

```swift
var hoaFeeParkingTotalMonthly: Double = 0.0
var isHoaParkingSplit: Bool = false
var hoaFeeParkingRecoverableMonthly: Double = 0.0
var hoaFeeParkingMaintenanceReserveMonthly: Double = 0.0
```

- [ ] **Step 5: Fix Finanzierung fields** — replace `monthlyMortgageActual: Double?` with:

```swift
var monthlyMortgage: Double = 0.0         // direkt gespeichert, editierbar
var equityContributed: Double = 0.0
var brokerCommissionAgreement: Double = 0.0
```

- [ ] **Step 6: Remove obsolete fields** — delete `landGuidelineValueSqm`, `rentGuarantee` relation. Keep `@Relationship` for `statusHistory` and `extraordinaryCosts`.

- [ ] **Step 7: Add sortOrder** for manual list ordering:

```swift
var sortOrder: Int = 0
```

- [ ] **Step 8: Run build**, fix all compilation errors from renamed/removed fields (PropertyViewModel, WizardState, CashflowCalculator, etc. will reference old field names — add `// TODO: update` stub or fix inline).

- [ ] **Step 9: Commit**
```bash
git add Volta/Volta/Models/Property.swift
git commit -m "feat(model): add missing fields per spec — warmmiete, equity, hoa splits, parking costs"
```

---

### Task 1.3 — Create PropertyPhoto model

**Files:** Create `Volta/Volta/Models/PropertyPhoto.swift`

- [ ] **Step 1: Write model**

```swift
import Foundation
import SwiftData

@Model
class PropertyPhoto {
    var filePath: String = ""
    var isCoverPhoto: Bool = false
    var sortOrder: Int = 0
    var createdAt: Date = Date()
    var property: Property?

    init(filePath: String, isCoverPhoto: Bool = false, sortOrder: Int = 0) {
        self.filePath = filePath
        self.isCoverPhoto = isCoverPhoto
        self.sortOrder = sortOrder
        self.createdAt = Date()
    }
}
```

- [ ] **Step 2: Add relation to Property.swift**

```swift
@Relationship(deleteRule: .cascade) var photos: [PropertyPhoto] = []
```

- [ ] **Step 3: Run build** — confirm no errors.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Models/PropertyPhoto.swift Volta/Volta/Models/Property.swift
git commit -m "feat(model): add PropertyPhoto model with cascade delete"
```

---

### Task 1.4 — Update StatusEntry model

**Files:** Modify `Volta/Volta/Models/StatusEntry.swift`

- [ ] **Step 1: Read current file**

Read `Volta/Volta/Models/StatusEntry.swift` to see current fields.

- [ ] **Step 2: Update to spec**

```swift
import Foundation
import SwiftData

@Model
class StatusEntry {
    var date: Date = Date()
    var status: PropertyStatus = .vermietet
    var incomeActualMonthly: Double?    // nur für .mietgarantie
    var notes: String = ""
    var createdAt: Date = Date()
    var property: Property?

    init(date: Date, status: PropertyStatus, incomeActualMonthly: Double? = nil, notes: String = "") {
        self.date = date
        self.status = status
        self.incomeActualMonthly = incomeActualMonthly
        self.notes = notes
        self.createdAt = Date()
    }
}
```

- [ ] **Step 3: Run build**, fix references to old StatusEntry fields.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Models/StatusEntry.swift
git commit -m "feat(model): update StatusEntry — use PropertyStatus enum, add incomeActualMonthly"
```

---

### Task 1.5 — Update Design Tokens

**Files:** Modify `Volta/Volta/Design/Color+App.swift`, `Volta/Volta/Design/Font+App.swift`

- [ ] **Step 1: Read both files** to see current state.

- [ ] **Step 2: Update Color+App.swift** to match spec exactly:

```swift
import SwiftUI

extension Color {
    // App background
    static let appGradientFrom = Color(hex: "#dce8f8")
    static let appGradientTo   = Color(hex: "#e8f0fb")

    // Accent
    static let appAccent       = Color(hex: "#3b82f6")
    static let appSectionLabel = Color(hex: "#1d4ed8")

    // Semantic
    static let appPositiveLarge = Color(hex: "#15803d")
    static let appPositiveRow   = Color(hex: "#059669")
    static let appNegative      = Color(hex: "#dc2626")

    // Text
    static let appPrimaryText   = Color(hex: "#0f172a")
    static let appSecondaryText = Color(hex: "#475569")
    static let appDimText       = Color(hex: "#94a3b8")

    // Cards
    static let appCardBackground = Color.white.opacity(0.80)
    static let appSumRowTint     = Color(hex: "#eff6ff").opacity(0.5)

    // Warning
    static let appWarning = Color(hex: "#D97706")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
```

- [ ] **Step 3: Create AppBackground.swift** for gradient background:

```swift
import SwiftUI

struct AppBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Color.appGradientFrom, Color.appGradientTo],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}
```

- [ ] **Step 4: Update Font+App.swift** — add missing roles per spec:

```swift
import SwiftUI

extension Font {
    static let appTabTitle     = Font.system(size: 20, weight: .bold)
    static let appSectionLabel = Font.system(size: 11, weight: .bold)
    static let appResultValue  = Font.system(size: 22, weight: .heavy)
    static let appRowLabel     = Font.system(size: 12, weight: .medium)
    static let appRowValue     = Font.system(size: 12, weight: .semibold).monospacedDigit()
    static let appColumnHeader = Font.system(size: 10, weight: .bold)
    static let appSubtext      = Font.system(size: 11, weight: .regular)
}
```

- [ ] **Step 5: Run build**, fix any references to removed/renamed tokens.

- [ ] **Step 6: Commit**
```bash
git add Volta/Volta/Design/
git commit -m "feat(design): align color tokens and typography with spec"
```

---

### Task 1.6 — Create shared UI components

**Files:** Create `GlassCard.swift`, `SectionDivider.swift`, `KPIChip.swift`, `InfoBottomSheet.swift`

- [ ] **Step 1: Create GlassCard.swift**

```swift
import SwiftUI

struct GlassCard<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(Color.white.opacity(0.95), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
    }
}
```

- [ ] **Step 2: Create SectionDivider.swift** (gradient blue line between sections):

```swift
import SwiftUI

struct SectionDivider: View {
    var body: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [Color.appAccent.opacity(0.35), Color.clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: 1.5)
            .cornerRadius(2)
    }
}
```

- [ ] **Step 3: Create KPIChip.swift** (colored dot + optional ⓘ):

```swift
import SwiftUI

enum KPIBenchmark {
    case good, ok, bad

    var color: Color {
        switch self {
        case .good: return Color.green
        case .ok:   return Color.orange
        case .bad:  return Color.red
        }
    }
}

struct KPIChip: View {
    let benchmark: KPIBenchmark

    var body: some View {
        Circle()
            .fill(benchmark.color)
            .frame(width: 8, height: 8)
    }
}
```

- [ ] **Step 4: Create InfoBottomSheet.swift**:

```swift
import SwiftUI

struct KPIInfo {
    let title: String
    let formula: String
    let explanation: String
    let benchmarks: [(label: String, range: String, benchmark: KPIBenchmark)]
}

struct InfoBottomSheet: View {
    let info: KPIInfo

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(info.title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color.appPrimaryText)

                Text(info.formula)
                    .font(.system(size: 13).monospaced())
                    .foregroundStyle(Color.appSecondaryText)

                Text(info.explanation)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.appPrimaryText)

                Text("BENCHMARK")
                    .font(.appSectionLabel)
                    .foregroundStyle(Color.appSectionLabel)

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(info.benchmarks, id: \.label) { item in
                        HStack(spacing: 8) {
                            KPIChip(benchmark: item.benchmark)
                            Text(item.label).font(.appRowLabel)
                            Text(item.range).font(.appRowValue)
                                .foregroundStyle(Color.appSecondaryText)
                        }
                    }
                }
            }
            .padding(20)
        }
        .presentationDetents([.medium])
        .background(Color.white.opacity(0.98))
    }
}
```

- [ ] **Step 5: Run build** — confirm all components compile.

- [ ] **Step 6: Commit**
```bash
git add Volta/Volta/Views/Components/GlassCard.swift \
        Volta/Volta/Views/Components/SectionDivider.swift \
        Volta/Volta/Views/Components/KPIChip.swift \
        Volta/Volta/Views/Components/InfoBottomSheet.swift \
        Volta/Volta/Design/AppBackground.swift
git commit -m "feat(design): add GlassCard, SectionDivider, KPIChip, InfoBottomSheet components"
```

---

### Task 1.7 — Rewrite TaxCalculator

**Files:** Modify `Volta/Volta/Calculations/TaxCalculator.swift`, `Volta/VoltaTests/TaxCalculatorTests.swift`

The current TaxCalculator is a stub. The spec (`spec-calculations.md`) defines a full status-aware, proration-based calculation.

- [ ] **Step 1: Write failing test for basic vermietet year**

In `TaxCalculatorTests.swift`:

```swift
func test_annualTaxableIncome_vermietet_basicYear() {
    // Given: simple property, fully vermietet all year, no leerstand
    let result = TaxCalculator.annualTaxableIncome(
        year: 2025,
        economicTransferDate: Calendar.current.date(from: DateComponents(year: 2024, month: 1, day: 1))!,
        loanStartDate: Calendar.current.date(from: DateComponents(year: 2024, month: 1, day: 1))!,
        loanAmount: 200_000,
        interestRate: 0.035,
        monthlyMortgage: 1_000,
        afaBemessungsgrundlage: 180_000,
        depreciationRate: 0.02,
        hoaFeeNonRecoverableMonthly: 100,
        hoaFeeRecoverableMonthly: 200,
        hoaFeeMaintenanceReserveMonthly: 50,
        hoaFeeParkingNonRecoverableMonthly: 0,
        hoaFeeParkingRecoverableMonthly: 0,
        propertyTaxAnnual: 600,
        propertyTaxParkingAnnual: 0,
        propertyManagementAnnual: 600,
        propertyInsuranceAnnual: 300,
        otherCostsMonthly: 0,
        coldRentMonthly: 1_200,
        parkingRentMonthly: 0,
        otherIncomeMonthly: 0,
        hasParking: false,
        statusEntries: [
            StatusEntry(date: Calendar.current.date(from: DateComponents(year: 2024, month: 1, day: 1))!, status: .vermietet)
        ],
        extraordinaryCosts: []
    )
    // Einnahmen: 1200 × 12 = 14400
    // Zinsen: approx 200000 × 0.035 = 7000 (simplified)
    // AfA: 180000 × 0.02 = 3600
    // Nicht-umlagef.: 100 × 12 = 1200
    // Verwaltung: 600
    // Versicherung: 300
    // Umlagef. (nur Leerstand): 0
    // Grundsteuer WE (nur Leerstand): 0
    // Ergebnis: 14400 - 7000 - 3600 - 1200 - 600 - 300 = 1700 (approx, interest is amortizing)
    XCTAssertTrue(result < 2000 && result > 1000, "Expected ~1700, got \(result)")
}
```

- [ ] **Step 2: Run test** — expect FAIL (method signature doesn't exist yet).

- [ ] **Step 3: Rewrite TaxCalculator.swift** with full spec-compliant implementation:

```swift
import Foundation

enum TaxCalculator {

    static func annualTaxableIncome(
        year: Int,
        economicTransferDate: Date,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyMortgage: Double,
        afaBemessungsgrundlage: Double,
        depreciationRate: Double,
        hoaFeeNonRecoverableMonthly: Double,
        hoaFeeRecoverableMonthly: Double,
        hoaFeeMaintenanceReserveMonthly: Double,
        hoaFeeParkingNonRecoverableMonthly: Double,
        hoaFeeParkingRecoverableMonthly: Double,
        propertyTaxAnnual: Double,
        propertyTaxParkingAnnual: Double,
        propertyManagementAnnual: Double,
        propertyInsuranceAnnual: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        otherIncomeMonthly: Double,
        hasParking: Bool,
        statusEntries: [StatusEntry],
        extraordinaryCosts: [ExtraordinaryCost]
    ) -> Double {
        let cal = Calendar.current
        guard let yearStart = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let yearEnd   = cal.date(from: DateComponents(year: year, month: 12, day: 31)) else { return 0 }

        // 1. Eigentumsmonate im Jahr
        let ownershipStart = max(economicTransferDate, yearStart)
        let ownershipMonths = monthsBetween(ownershipStart, yearEnd, cal: cal)
        guard ownershipMonths > 0 else { return 0 }

        // 2. Zinsen (amortisierend) für das Jahr
        let interestStart = max(loanStartDate, yearStart)
        let zinsenJahr = interestAnnual(
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyMortgage: monthlyMortgage,
            loanStartDate: loanStartDate,
            from: interestStart,
            to: yearEnd,
            cal: cal
        )

        // 3. AfA
        let isErwerbsjahr = cal.component(.year, from: economicTransferDate) == year
        let afaJahr: Double
        if isErwerbsjahr {
            let monthsFromTransfer = monthsBetween(economicTransferDate, yearEnd, cal: cal)
            afaJahr = afaBemessungsgrundlage * depreciationRate / 12.0 * Double(monthsFromTransfer)
        } else {
            afaJahr = afaBemessungsgrundlage * depreciationRate
        }

        // 4. Leerstandstage
        let daysInYear = Double(cal.range(of: .dayOfYear, in: .year, for: yearStart)?.count ?? 365)
        let leerstandsTage = leerstandDays(in: year, statusEntries: statusEntries, cal: cal)
        let leerstandsAnteil = leerstandsTage / daysInYear

        // 5. Einnahmen (Statusverlauf-basiert)
        var einnahmen = 0.0
        for month in 1...12 {
            guard let monthDate = cal.date(from: DateComponents(year: year, month: month, day: 1)),
                  monthDate >= ownershipStart else { continue }
            einnahmen += incomeForMonth(
                month: month, year: year,
                statusEntries: statusEntries,
                coldRentMonthly: coldRentMonthly,
                parkingRentMonthly: parkingRentMonthly,
                otherIncomeMonthly: otherIncomeMonthly,
                cal: cal
            )
        }

        // 6. Abzüge
        var abzuege = 0.0
        // Immer (× Eigentumsmonate)
        abzuege += hoaFeeNonRecoverableMonthly * Double(ownershipMonths)
        abzuege += (propertyManagementAnnual / 12.0) * Double(ownershipMonths)
        if propertyInsuranceAnnual > 0 {
            abzuege += (propertyInsuranceAnnual / 12.0) * Double(ownershipMonths)
        }
        if otherCostsMonthly > 0 {
            abzuege += otherCostsMonthly * Double(ownershipMonths)
        }
        // Stellplatz immer (Owner trägt)
        if hasParking {
            abzuege += hoaFeeParkingNonRecoverableMonthly * Double(ownershipMonths)
            abzuege += hoaFeeParkingRecoverableMonthly * Double(ownershipMonths)
            abzuege += propertyTaxParkingAnnual * (Double(ownershipMonths) / 12.0)
        }
        // Nur Leerstandsanteil (WE)
        abzuege += hoaFeeRecoverableMonthly * 12.0 * leerstandsAnteil
        abzuege += propertyTaxAnnual * leerstandsAnteil
        // Außergewöhnliche Kosten (nur absetzbar)
        abzuege += extraordinaryCosts
            .filter { cal.component(.year, from: $0.date) == year && $0.isDeductible }
            .reduce(0) { $0 + $1.amount }

        return einnahmen - zinsenJahr - afaJahr - abzuege
    }

    static func taxEffect(taxableIncome: Double, marginalTaxRate: Double) -> Double {
        max(0, -taxableIncome) * marginalTaxRate
    }

    // MARK: - Helpers

    static func incomeForMonth(
        month: Int, year: Int,
        statusEntries: [StatusEntry],
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        otherIncomeMonthly: Double,
        cal: Calendar
    ) -> Double {
        guard let monthStart = cal.date(from: DateComponents(year: year, month: month, day: 1)),
              let monthEnd   = cal.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart) else { return 0 }
        let daysInMonth = Double(cal.range(of: .day, in: .month, for: monthStart)?.count ?? 30)

        let sorted = statusEntries.sorted { $0.date < $1.date }
        var total = 0.0

        for (i, entry) in sorted.enumerated() {
            let nextDate = i + 1 < sorted.count ? sorted[i + 1].date : Date.distantFuture
            let segStart = max(entry.date, monthStart)
            let segEnd   = min(nextDate - 1, monthEnd)
            guard segStart <= segEnd else { continue }
            let days = Double(cal.dateComponents([.day], from: segStart, to: segEnd).day ?? 0) + 1
            let frac = days / daysInMonth
            switch entry.status {
            case .vermietet:
                total += (coldRentMonthly + parkingRentMonthly + otherIncomeMonthly) * frac
            case .mietgarantie:
                total += (entry.incomeActualMonthly ?? 0) * frac
            case .leerstand:
                break
            }
        }
        return total
    }

    static func leerstandDays(in year: Int, statusEntries: [StatusEntry], cal: Calendar) -> Double {
        guard let yearStart = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let yearEnd   = cal.date(from: DateComponents(year: year, month: 12, day: 31)) else { return 0 }
        let sorted = statusEntries.sorted { $0.date < $1.date }
        var days = 0.0
        for (i, entry) in sorted.enumerated() {
            guard entry.status == .leerstand || entry.status == .mietgarantie else { continue }
            let nextDate = i + 1 < sorted.count ? sorted[i + 1].date : Date.distantFuture
            let segStart = max(entry.date, yearStart)
            let segEnd   = min(nextDate - 1, yearEnd)
            guard segStart <= segEnd else { continue }
            days += Double(cal.dateComponents([.day], from: segStart, to: segEnd).day ?? 0) + 1
        }
        return days
    }

    private static func monthsBetween(_ from: Date, _ to: Date, cal: Calendar) -> Int {
        let comps = cal.dateComponents([.month], from: from, to: to)
        return max(0, (comps.month ?? 0) + 1)
    }

    private static func interestAnnual(
        loanAmount: Double,
        interestRate: Double,
        monthlyMortgage: Double,
        loanStartDate: Date,
        from: Date,
        to: Date,
        cal: Calendar
    ) -> Double {
        var restschuld = loanAmount
        var total = 0.0
        // Advance restschuld to `from`
        var cursor = loanStartDate
        while cursor < from {
            let zins = restschuld * interestRate / 12.0
            let tilgung = max(0, monthlyMortgage - zins)
            restschuld -= tilgung
            cursor = cal.date(byAdding: .month, value: 1, to: cursor) ?? cursor
        }
        // Sum interest from `from` to `to`
        cursor = from
        while cursor <= to {
            let zins = restschuld * interestRate / 12.0
            let tilgung = max(0, monthlyMortgage - zins)
            total += zins
            restschuld -= tilgung
            cursor = cal.date(byAdding: .month, value: 1, to: cursor) ?? cursor
        }
        return total
    }
}
```

- [ ] **Step 4: Run tests** — `CMD+U` in Xcode or `xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16'`

- [ ] **Step 5: Fix any failing tests** — update `TaxCalculatorTests.swift` assertions to match new API.

- [ ] **Step 6: Commit**
```bash
git add Volta/Volta/Calculations/TaxCalculator.swift Volta/VoltaTests/TaxCalculatorTests.swift
git commit -m "feat(calc): rewrite TaxCalculator — full status-aware, proration, leerstand logic"
```

---

### Task 1.8 — Update CashflowCalculator

**Files:** Modify `Volta/Volta/Calculations/CashflowCalculator.swift`

- [ ] **Step 1: Read current file**

Read `Volta/Volta/Calculations/CashflowCalculator.swift`.

- [ ] **Step 2: Write failing test** for cashflow with parking:

```swift
func test_cashflowBeforeTax_vermietet_withParking() {
    // coldRent=1000, parking=100, mortgage=800, hoaNonRec=120, hoaReserve=50
    // parking: hoaNonRec=30, hoaReserve=10, hoaRec=20, taxParking=5/mo
    let result = CashflowCalculator.cashflowBeforeTax(
        einnahmen: 1100,
        monthlyMortgage: 800,
        hoaFeeNonRecoverableMonthly: 120,
        hoaFeeMaintenanceReserveMonthly: 50,
        propertyInsuranceAnnual: 0,
        propertyManagementAnnual: 0,
        otherCostsMonthly: 0,
        ownerBorneRecoverableCosts: 0,   // vermietet
        hoaFeeParkingNonRecoverableMonthly: 30,
        hoaFeeParkingMaintenanceReserveMonthly: 10,
        hoaFeeParkingRecoverableMonthly: 20,
        propertyTaxParkingAnnual: 60,    // /12 = 5/mo
        hasParking: true,
        extraordinaryCostsMonth: 0
    )
    // 1100 - 800 - 120 - 50 - 30 - 10 - 20 - 5 = 65
    XCTAssertEqual(result, 65, accuracy: 0.01)
}
```

- [ ] **Step 3: Update CashflowCalculator** to match spec formula exactly (see `spec-calculations.md` → CashflowCalculator section). Signature must accept all cost components as parameters, not read from Property directly.

- [ ] **Step 4: Run tests** — verify pass.

- [ ] **Step 5: Commit**
```bash
git add Volta/Volta/Calculations/CashflowCalculator.swift Volta/VoltaTests/CashflowCalculatorTests.swift
git commit -m "feat(calc): update CashflowCalculator — full parking and status-aware formula"
```

---

### Task 1.9 — Update KPICalculator

**Files:** Modify `Volta/Volta/Calculations/KPICalculator.swift`, `Volta/VoltaTests/KPICalculatorTests.swift`

- [ ] **Step 1: Read current file** — `Volta/Volta/Calculations/KPICalculator.swift`.

- [ ] **Step 2: Add/fix these KPI functions** per `spec-calculations.md`:

```swift
// breakEvenRent — includes all owner-borne costs + mortgage
static func breakEvenRent(
    hoaFeeNonRecoverableMonthly: Double,
    hoaFeeMaintenanceReserveMonthly: Double,
    hoaFeeParkingNonRecoverableMonthly: Double,
    hoaFeeParkingRecoverableMonthly: Double,
    hoaFeeParkingMaintenanceReserveMonthly: Double,
    propertyTaxParkingAnnual: Double,
    propertyManagementAnnual: Double,
    propertyInsuranceAnnual: Double,
    otherCostsMonthly: Double,
    monthlyMortgage: Double,
    hasParking: Bool
) -> Double

// tatsächlicheLeerstandsquote
static func actualVacancyRate(statusEntries: [StatusEntry], economicTransferDate: Date) -> Double?

// wertsteigerung / wertsteigerungProzent
static func capitalGain(currentMarketValue: Double?, totalPurchasePrice: Double) -> (absolute: Double, percent: Double)?
```

- [ ] **Step 3: Write tests** for each new function.

- [ ] **Step 4: Run tests** — verify pass.

- [ ] **Step 5: Commit**
```bash
git add Volta/Volta/Calculations/KPICalculator.swift Volta/VoltaTests/KPICalculatorTests.swift
git commit -m "feat(calc): add breakEvenRent, actualVacancyRate, capitalGain to KPICalculator"
```

---

### Task 1.10 — Update PropertyViewModel

**Files:** Modify `Volta/Volta/ViewModels/PropertyViewModel.swift`

- [ ] **Step 1: Read current file**.

- [ ] **Step 2: Fix all broken references** from Property model changes (renamed fields, new fields). Add computed properties for:

```swift
var hoaFeeNonRecoverableMonthly: Double {
    property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly - property.hoaFeeMaintenanceReserveMonthly
}
var hoaFeeParkingNonRecoverableMonthly: Double {
    property.hoaFeeParkingTotalMonthly - property.hoaFeeParkingRecoverableMonthly - property.hoaFeeParkingMaintenanceReserveMonthly
}
var closingCostsTotal: Double {
    property.landTransferTax + property.notaryCosts + property.landRegistryCosts
    + property.agentFee + property.appraisalCosts + property.brokerCommissionAgreement
}
var totalPurchasePrice: Double { property.purchasePriceUnit + property.purchasePriceParking }
var totalInvestment: Double { totalPurchasePrice + closingCostsTotal + property.renovationModernizationCosts }
var equityUsed: Double { totalInvestment - property.loanAmount }
var afaBemessungsgrundlage: Double {
    property.buildingValue
    + (closingCostsTotal * property.buildingValue / max(1, totalPurchasePrice))
    + property.renovationAfaEligible
}
var hasParking: Bool { property.parkingType != .nichtVorhanden }
```

- [ ] **Step 3: Run build** — confirm no remaining compile errors in the foundation layer.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "fix(vm): update PropertyViewModel computed properties for new model fields"
```

---

## Branch 2: `shell`

**Specs:** `spec-hauptscreen.md`, `spec-property-setup.md`
**Prerequisite:** `foundation` merged

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Portfolio/PortfolioView.swift` |
| Modify | `Volta/Volta/Views/Portfolio/PropertyCard.swift` |
| Modify | `Volta/Volta/Views/Portfolio/PortfolioKPIView.swift` |
| Modify | `Volta/Volta/Views/Property/PropertyDetailView.swift` |
| Create | `Volta/Volta/Views/PropertySetup/PropertySetupView.swift` |
| Create | `Volta/Volta/Views/PropertySetup/PropertySetupState.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepStammdaten.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepObjektdaten.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepKauf.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepEinnahmen.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepKosten.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepFinanzierung.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepAfA.swift` |
| Create | `Volta/Volta/Views/PropertySetup/SetupStepStatus.swift` |
| Create | `Volta/Volta/Views/Components/PhotoGrid.swift` |
| Create | `Volta/Volta/Views/Components/HoaFeeSection.swift` |
| Modify | `Volta/Volta/Views/AppShellView.swift` |

---

### Task 2.1 — Redesign PortfolioView (Hauptscreen)

**Files:** Modify `Volta/Volta/Views/Portfolio/PortfolioView.swift`

- [ ] **Step 1: Read current file**.

- [ ] **Step 2: Implement layout per spec** — NavigationBar "Volta" + [+] + [⋮], Portfolio-Karte oben, scrollable list of PropertyCards, sort picker, swipe-to-delete with confirmation, empty state.

Key structure:
```swift
struct PortfolioView: View {
    @Environment(\.modelContext) private var ctx
    @Query private var properties: [Property]
    @State private var showAddProperty = false
    @State private var sortMode: SortMode = .date
    @State private var propertyToDelete: Property?

    enum SortMode { case date, az, manual }

    var sortedProperties: [Property] {
        switch sortMode {
        case .date: return properties.sorted { $0.economicTransferDate > $1.economicTransferDate }
        case .az:   return properties.sorted { $0.name < $1.name }
        case .manual: return properties.sorted { $0.sortOrder < $1.sortOrder }
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground()
                ScrollView {
                    VStack(spacing: 12) {
                        if !properties.isEmpty { PortfolioCard(properties: properties) }
                        sortPicker
                        ForEach(sortedProperties) { prop in
                            NavigationLink(destination: PropertyDetailView(property: prop)) {
                                PropertyCard(property: prop)
                            }
                            .swipeActions { deleteButton(prop) }
                        }
                        if properties.isEmpty { emptyState }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                }
            }
            .navigationTitle("Volta")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showAddProperty = true } label: { Image(systemName: "plus") }
                }
            }
            .navigationDestination(isPresented: $showAddProperty) {
                PropertySetupView()
            }
            .confirmationDialog(
                "\(propertyToDelete?.name ?? "") löschen?",
                isPresented: Binding(get: { propertyToDelete != nil }, set: { if !$0 { propertyToDelete = nil } }),
                titleVisibility: .visible
            ) {
                Button("Löschen", role: .destructive) {
                    if let p = propertyToDelete { ctx.delete(p); propertyToDelete = nil }
                }
                Button("Abbrechen", role: .cancel) { propertyToDelete = nil }
            } message: {
                Text("Diese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.")
            }
        }
    }
}
```

- [ ] **Step 3: Run build** — fix compilation errors.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Portfolio/PortfolioView.swift
git commit -m "feat(shell): redesign PortfolioView — Glass layout, sort, swipe-delete, empty state"
```

---

### Task 2.2 — Redesign PropertyCard and PortfolioCard

**Files:** Modify `Volta/Volta/Views/Portfolio/PropertyCard.swift`, `Volta/Volta/Views/Portfolio/PortfolioKPIView.swift`

- [ ] **Step 1: Rewrite PropertyCard.swift** per spec (cover image 160pt, name+status badge, address, 2×2 KPI grid, footer line):

```swift
struct PropertyCard: View {
    let property: Property
    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    var body: some View {
        GlassCard {
            VStack(spacing: 0) {
                coverImage
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(property.name).font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Color.appPrimaryText)
                        Spacer()
                        StatusBadge(status: property.statusHistory.sorted { $0.date < $1.date }.last?.status ?? .vermietet)
                    }
                    Text("\(property.address), \(property.city)")
                        .font(.appRowLabel).foregroundStyle(Color.appSecondaryText)

                    Divider().overlay(Color.black.opacity(0.06))

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        kpiCell(label: "Cashflow/Mon", value: Formatters.formatCurrencySigned(vm.cashflowAfterTaxCurrentMonth), isColored: true)
                        kpiCell(label: "Nettorendite", value: Formatters.formatPercent(vm.netYield))
                        kpiCell(label: "Kaufpreis/m²", value: Formatters.formatCurrencyRounded(vm.purchasePricePerSqm) + "/m²")
                        kpiCell(label: "Restschuld", value: vm.remainingDebt > 0 ? Formatters.formatCurrencyRounded(vm.remainingDebt) : "–")
                    }

                    Divider().overlay(Color.black.opacity(0.06))

                    HStack(spacing: 6) {
                        if let sqm = property.livingAreaSqm > 0 ? property.livingAreaSqm : nil {
                            Text("\(Formatters.formatArea(sqm)) m²").font(.appSubtext).foregroundStyle(Color.appDimText)
                            Text("·").foregroundStyle(Color.appDimText)
                        }
                        if let rooms = property.rooms {
                            Text("\(Formatters.formatRooms(rooms)) Zi").font(.appSubtext).foregroundStyle(Color.appDimText)
                            Text("·").foregroundStyle(Color.appDimText)
                        }
                        Text("seit \(Formatters.formatMonthYear(property.economicTransferDate))")
                            .font(.appSubtext).foregroundStyle(Color.appDimText)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
            }
        }
    }
}
```

- [ ] **Step 2: Rewrite PortfolioKPIView.swift → rename to PortfolioCard.swift** per spec (Glass Card, title "[N] Immobilien", 2×2 grid: Cashflow/Mon, Gesamtinvestment, Ø Nettorendite, Restschuld).

- [ ] **Step 3: Run build**.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Portfolio/PropertyCard.swift Volta/Volta/Views/Portfolio/PortfolioKPIView.swift
git commit -m "feat(shell): redesign PropertyCard and PortfolioCard per spec"
```

---

### Task 2.3 — Update PropertyDetailView tab order

**Files:** Modify `Volta/Volta/Views/Property/PropertyDetailView.swift`

Per spec the tab order is: `Übersicht | Cashflow | Steuer | Verlauf | Finanzierung | Immobiliendaten`

- [ ] **Step 1: Update tabs** — add `VerlaufTab` and `ImmobiliendatenTab` stubs, remove `SettingsTab`, reorder:

```swift
TabView(selection: $selectedTab) {
    OverviewTab(vm: vm)
        .tabItem { Label("Übersicht", systemImage: "house") }.tag(0)
    CashflowTab(vm: vm)
        .tabItem { Label("Cashflow", systemImage: "eurosign.circle") }.tag(1)
    TaxTab(vm: vm)
        .tabItem { Label("Steuer", systemImage: "percent") }.tag(2)
    VerlaufTab(property: property)
        .tabItem { Label("Verlauf", systemImage: "clock") }.tag(3)
    FinancingTab(vm: vm)
        .tabItem { Label("Finanzierung", systemImage: "chart.line.downtrend.xyaxis") }.tag(4)
    ImmobiliendatenTab(property: property)
        .tabItem { Label("Immobiliendaten", systemImage: "doc.text") }.tag(5)
}
```

- [ ] **Step 2: Create stub files** for `VerlaufTab.swift` and `ImmobiliendatenTab.swift` with `Text("Coming soon")`.

- [ ] **Step 3: Remove header** — the header in current PropertyDetailView (showing name/address/KPIs) gets replaced by the Übersicht-Tab header (cover photo). Strip `propertyHeader` from `PropertyDetailView`.

- [ ] **Step 4: Run build**.

- [ ] **Step 5: Commit**
```bash
git add Volta/Volta/Views/Property/
git commit -m "feat(shell): add Verlauf+Immobiliendaten tabs, reorder per spec, remove old header"
```

---

### Task 2.4 — Create PropertySetupState

**Files:** Create `Volta/Volta/Views/PropertySetup/PropertySetupState.swift`

- [ ] **Step 1: Write PropertySetupState** — mirrors all Property fields plus setup-only fields:

```swift
import Foundation
import SwiftUI

@Observable
class PropertySetupState {
    // Stammdaten
    var name = ""
    var address = ""
    var city = ""
    var state = ""
    var postalCode = ""
    var propertyType: PropertyType = .apartment
    var acquisitionType: AcquisitionType = .kauf
    var yearBuilt: String = ""
    var notes = ""

    // Objektdaten
    var livingAreaSqm = ""
    var rooms = ""
    var hasBalcony = false
    var hasTerrace = false
    var hasGarden = false
    var hasBasement = false
    var hasFittedKitchen = false
    var parkingType: ParkingType = .nichtVorhanden
    var heatingType: HeatingType? = nil
    var energyClass: EnergyClass? = nil
    var condition: PropertyCondition? = nil

    // Kauf
    var purchaseDate = Date()
    var economicTransferDate = Date()
    var purchasePriceUnit = ""
    var purchasePriceParking = ""
    var landTransferTax = ""
    var notaryCosts = ""
    var landRegistryCosts = ""
    var agentFee = ""
    var appraisalCosts = ""
    var renovationTotal = ""
    var renovationAfaEligible = ""

    // Einnahmen
    var coldRentMonthly = ""
    var warmmieteMonthly = ""
    var parkingRentMonthly = ""
    var otherIncomeMonthly = ""

    // Kosten
    var hoaFeeTotalMonthly = ""
    var isHoaUnitSplit = false
    var hoaFeeRecoverableMonthly = ""
    var hoaFeeMaintenanceReserveMonthly = ""
    var propertyTaxAnnual = ""
    var propertyManagementAnnual = ""
    var propertyInsuranceAnnual = ""
    var otherCostsMonthly = ""
    var hoaFeeParkingTotalMonthly = ""
    var isHoaParkingSplit = false
    var hoaFeeParkingRecoverableMonthly = ""
    var hoaFeeParkingMaintenanceReserveMonthly = ""
    var propertyTaxParkingAnnual = ""

    // Finanzierung
    var loanAmount = ""
    var interestRate = ""
    var amortizationRate = ""
    var fixedInterestPeriodYears = 10
    var loanStartDate = Date()
    var monthlyMortgage = ""
    var equityContributed = ""
    var brokerCommissionAgreement = ""

    // AfA & Steuer
    var buildingValue = ""
    var landValue = ""
    var depreciationRate = ""
    var marginalTaxRate = ""

    // Status-Onboarding
    var firstStatusDate = Date()
    var firstStatus: PropertyStatus = .vermietet
    var firstStatusIncome = ""
    var firstStatusNotes = ""

    var hasParking: Bool { parkingType != .nichtVorhanden }

    var requiresStatusOnboarding: Bool {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let transferStart = cal.startOfDay(for: economicTransferDate)
        return transferStart <= today
    }

    var canFinish: Bool {
        !name.isEmpty && !address.isEmpty && !city.isEmpty
        && (Double(purchasePriceUnit) ?? 0) > 0
        && (Double(coldRentMonthly) ?? 0) > 0
        && (Double(loanAmount) ?? 0) > 0
        && (Double(interestRate) ?? 0) > 0
        && (Double(amortizationRate) ?? 0) > 0
        && (Double(buildingValue) ?? 0) > 0
        && (Double(landValue) ?? 0) > 0
    }
}
```

- [ ] **Step 2: Run build** — confirm no errors.

- [ ] **Step 3: Commit**
```bash
git add Volta/Volta/Views/PropertySetup/PropertySetupState.swift
git commit -m "feat(setup): create PropertySetupState — mirrors Property fields for wizard"
```

---

### Task 2.5 — Create PropertySetupView (sidebar layout)

**Files:** Create `Volta/Volta/Views/PropertySetup/PropertySetupView.swift`

Per spec: NavigationStack push (not modal), sidebar left with step names, content right, Zurück/Weiter/Fertigstellen buttons.

- [ ] **Step 1: Write PropertySetupView skeleton**:

```swift
import SwiftUI
import SwiftData

struct PropertySetupView: View {
    @Environment(\.modelContext) private var ctx
    @Environment(\.dismiss) private var dismiss
    @State private var state = PropertySetupState()
    @State private var currentStep = 0
    @State private var visitedSteps: Set<Int> = [0]

    var steps: [String] {
        var s = ["Stammdaten", "Objektdaten", "Kauf", "Einnahmen", "Kosten", "Finanzierung", "AfA & Steuer"]
        if state.requiresStatusOnboarding { s.append("Status") }
        return s
    }

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Divider()
            VStack(spacing: 0) {
                stepContent
                Spacer()
                navigationButtons
                    .padding(16)
            }
        }
        .navigationTitle("Immobilie hinzufügen")
        .navigationBarBackButtonHidden(true)
        .background(Color.appGradientFrom.opacity(0.3))
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { i, name in
                Button {
                    visitedSteps.insert(i)
                    currentStep = i
                } label: {
                    HStack(spacing: 8) {
                        Circle().fill(i == currentStep ? Color.appAccent : Color.clear)
                            .frame(width: 6, height: 6)
                        Text(name)
                            .font(.system(size: 13, weight: i == currentStep ? .bold : .regular))
                            .foregroundStyle(i == currentStep ? Color.appAccent
                                           : visitedSteps.contains(i) ? Color.appPrimaryText
                                           : Color.appDimText)
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                }
            }
            Spacer()
        }
        .frame(width: 140)
        .background(Color.white.opacity(0.6))
    }

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case 0: SetupStepStammdaten(state: state)
        case 1: SetupStepObjektdaten(state: state)
        case 2: SetupStepKauf(state: state)
        case 3: SetupStepEinnahmen(state: state)
        case 4: SetupStepKosten(state: state)
        case 5: SetupStepFinanzierung(state: state)
        case 6: SetupStepAfA(state: state)
        case 7: SetupStepStatus(state: state)
        default: EmptyView()
        }
    }

    private var navigationButtons: some View {
        HStack {
            if currentStep > 0 {
                Button("Zurück") { currentStep -= 1 }
                    .buttonStyle(.bordered)
            }
            Spacer()
            if currentStep < steps.count - 1 {
                Button("Weiter") {
                    visitedSteps.insert(currentStep + 1)
                    currentStep += 1
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button("Fertigstellen") { saveAndDismiss() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!state.canFinish)
            }
        }
    }

    private func saveAndDismiss() {
        let p = Property()
        // Map all state fields to property
        p.name = state.name
        p.address = state.address
        p.city = state.city
        p.state = state.state
        p.postalCode = state.postalCode
        p.propertyType = state.propertyType
        p.acquisitionType = state.acquisitionType
        p.yearBuilt = Int(state.yearBuilt)
        p.notes = state.notes
        p.livingAreaSqm = Double(state.livingAreaSqm) ?? 0
        p.rooms = Double(state.rooms)
        p.hasBalcony = state.hasBalcony
        p.hasTerrace = state.hasTerrace
        p.hasGarden = state.hasGarden
        p.hasBasement = state.hasBasement
        p.hasFittedKitchen = state.hasFittedKitchen
        p.parkingType = state.parkingType
        p.heatingType = state.heatingType
        p.energyEfficiencyClass = state.energyClass
        p.condition = state.condition
        p.purchaseDate = state.purchaseDate
        p.economicTransferDate = state.economicTransferDate
        p.purchasePriceUnit = Double(state.purchasePriceUnit) ?? 0
        p.purchasePriceParking = Double(state.purchasePriceParking) ?? 0
        p.landTransferTax = Double(state.landTransferTax) ?? 0
        p.notaryCosts = Double(state.notaryCosts) ?? 0
        p.landRegistryCosts = Double(state.landRegistryCosts) ?? 0
        p.agentFee = Double(state.agentFee) ?? 0
        p.appraisalCosts = Double(state.appraisalCosts) ?? 0
        p.renovationModernizationCosts = Double(state.renovationTotal) ?? 0
        p.renovationAfaEligible = Double(state.renovationAfaEligible) ?? 0
        p.coldRentMonthly = Double(state.coldRentMonthly) ?? 0
        p.warmmieteMonthly = Double(state.warmmieteMonthly)
        p.parkingRentMonthly = Double(state.parkingRentMonthly) ?? 0
        p.otherIncomeMonthly = Double(state.otherIncomeMonthly) ?? 0
        p.hoaFeeTotalMonthly = Double(state.hoaFeeTotalMonthly) ?? 0
        p.isHoaUnitSplit = state.isHoaUnitSplit
        p.hoaFeeRecoverableMonthly = Double(state.hoaFeeRecoverableMonthly) ?? 0
        p.hoaFeeMaintenanceReserveMonthly = Double(state.hoaFeeMaintenanceReserveMonthly) ?? 0
        p.propertyTaxAnnual = Double(state.propertyTaxAnnual) ?? 0
        p.propertyManagementAnnual = Double(state.propertyManagementAnnual) ?? 0
        p.propertyInsuranceAnnual = Double(state.propertyInsuranceAnnual) ?? 0
        p.otherCostsMonthly = Double(state.otherCostsMonthly) ?? 0
        p.hoaFeeParkingTotalMonthly = Double(state.hoaFeeParkingTotalMonthly) ?? 0
        p.isHoaParkingSplit = state.isHoaParkingSplit
        p.hoaFeeParkingRecoverableMonthly = Double(state.hoaFeeParkingRecoverableMonthly) ?? 0
        p.hoaFeeParkingMaintenanceReserveMonthly = Double(state.hoaFeeParkingMaintenanceReserveMonthly) ?? 0
        p.propertyTaxParkingAnnual = Double(state.propertyTaxParkingAnnual) ?? 0
        p.loanAmount = Double(state.loanAmount) ?? 0
        p.interestRate = (Double(state.interestRate) ?? 0) / 100
        p.amortizationRate = (Double(state.amortizationRate) ?? 0) / 100
        p.fixedInterestPeriodYears = state.fixedInterestPeriodYears
        p.loanStartDate = state.loanStartDate
        let loan = p.loanAmount; let ir = p.interestRate; let ar = p.amortizationRate
        p.monthlyMortgage = Double(state.monthlyMortgage) ?? (loan * (ir + ar) / 12)
        p.equityContributed = Double(state.equityContributed) ?? 0
        p.brokerCommissionAgreement = Double(state.brokerCommissionAgreement) ?? 0
        p.buildingValue = Double(state.buildingValue) ?? 0
        p.landValue = Double(state.landValue) ?? 0
        p.depreciationRate = (Double(state.depreciationRate) ?? 2) / 100
        p.marginalTaxRate = (Double(state.marginalTaxRate) ?? 0) / 100

        ctx.insert(p)

        if state.requiresStatusOnboarding {
            let entry = StatusEntry(
                date: state.firstStatusDate,
                status: state.firstStatus,
                incomeActualMonthly: state.firstStatus == .mietgarantie ? Double(state.firstStatusIncome) : nil,
                notes: state.firstStatusNotes
            )
            entry.property = p
            ctx.insert(entry)
        }
        dismiss()
    }
}
```

- [ ] **Step 2: Create stub files** for all 8 step views (Stammdaten, Objektdaten, Kauf, Einnahmen, Kosten, Finanzierung, AfA, Status) — each with a `Text("Step N")` placeholder for now.

- [ ] **Step 3: Run build** — confirm no errors.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/PropertySetup/
git commit -m "feat(setup): create PropertySetupView — sidebar layout, save mapping, stub steps"
```

---

### Task 2.6 — Implement Setup Step Views

Each step view uses the `CurrencyField`, `PercentField`, existing picker components.

- [ ] **Step 1: Implement SetupStepStammdaten.swift** — fields: name, address, city, PLZ, Bundesland, Typ picker, Erwerb picker, Baujahr, Notizen. All from `PropertySetupState`.

- [ ] **Step 2: Implement SetupStepObjektdaten.swift** — Wohnfläche, Zimmer, toggles (Balkon/Terrasse/Garten/Keller/Küche), Stellplatz picker, Heizung/Energieklasse/Zustand/Renovierung pickers. Photo grid placeholder (wired in Task 2.7).

- [ ] **Step 3: Implement SetupStepKauf.swift** — Kaufdatum, Wirtschaftlicher Übergang (DatePicker), Kaufpreis WE (+ TE if parkingType != .nichtVorhanden), Nebenkosten fields, readonly Zusammenfassung.

- [ ] **Step 4: Implement SetupStepEinnahmen.swift** — Nettomiete, Bruttomiete (optional), Parkingmiete (conditional), Sonstige. Readonly Jahres-Summary. Live Bruttorendite display.

- [ ] **Step 5: Implement SetupStepKosten.swift** — HoaFeeSection WE (toggle Aufteilen), Grundsteuer, Verwaltung, Versicherung, Sonstige. HoaFeeSection TE (conditional on parkingType).

- [ ] **Step 6: Implement SetupStepFinanzierung.swift** — Darlehen, Zinssatz, Tilgung, Zinsbindung stepper, Start-Datum, Monatsrate (auto-filled). EK, Eigenprovision. Readonly Summary.

- [ ] **Step 7: Implement SetupStepAfA.swift** — Gebäudewert, Grundstückswert, AfA-Satz, Grenzsteuersatz. Warning if |Gebäude+Grund − Kaufpreis| > 5%. Readonly AfA-Summary.

- [ ] **Step 8: Implement SetupStepStatus.swift** — Datum, Status picker (Vermietet/Leerstand/Mietgarantie), Einnahme/Monat (conditional on Mietgarantie), Notizen.

- [ ] **Step 9: Extract HoaFeeSection** as reusable component (used in both Setup and Immobiliendaten Tab):

```swift
// Volta/Volta/Views/Components/HoaFeeSection.swift
struct HoaFeeSection: View {
    let title: String
    @Binding var total: String
    @Binding var isSplit: Bool
    @Binding var recoverable: String
    @Binding var maintenanceReserve: String
    let infoText: String?

    var nonRecoverable: Double {
        (Double(total) ?? 0) - (Double(recoverable) ?? 0) - (Double(maintenanceReserve) ?? 0)
    }
    var isValid: Bool { (Double(recoverable) ?? 0) + (Double(maintenanceReserve) ?? 0) <= (Double(total) ?? 0) }
    // ... view body with Toggle Aufteilen, conditional split fields, validation warning
}
```

- [ ] **Step 10: Run build** — resolve all compilation errors.

- [ ] **Step 11: Commit**
```bash
git add Volta/Volta/Views/PropertySetup/ Volta/Volta/Views/Components/HoaFeeSection.swift
git commit -m "feat(setup): implement all 8 setup step views and HoaFeeSection component"
```

---

### Task 2.7 — PhotoGrid component

**Files:** Create `Volta/Volta/Views/Components/PhotoGrid.swift`

- [ ] **Step 1: Write PhotoGrid** — 3-column grid, square thumbnails, cover star badge, add button, action sheet on tap:

```swift
import SwiftUI
import PhotosUI

struct PhotoGrid: View {
    @Binding var photos: [PropertyPhoto]  // or use PHPickerResult for setup flow
    let maxPhotos = 15

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 3), spacing: 2) {
            ForEach(photos.sorted { $0.sortOrder < $1.sortOrder }) { photo in
                photoCell(photo)
            }
            if photos.count < maxPhotos {
                addButton
            }
        }
    }
    // photoCell: loads image from filePath, shows ⭐ overlay if isCoverPhoto
    // addButton: dashed border, + symbol, triggers PHPickerViewController
    // tap action sheet: "Titelbild setzen" / "Löschen"
}
```

- [ ] **Step 2: Wire into SetupStepObjektdaten** and create a photo storage helper that saves images to the App Documents directory and returns a `filePath`.

- [ ] **Step 3: Run build**.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Components/PhotoGrid.swift
git commit -m "feat(shell): add PhotoGrid component — 3-col, cover badge, PHPicker integration"
```

---

## Branch 3: `tab/uebersicht`

**Spec:** `spec-overview-tab.md`
**Prerequisite:** `shell` merged

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/OverviewTab.swift` |
| Modify | `Volta/Volta/ViewModels/PropertyViewModel.swift` |

---

### Task 3.1 — Fixed KPI bar

- [ ] **Step 1: Add to PropertyViewModel** computed properties needed:

```swift
var cashflowAfterTaxCurrentMonth: Double { /* CashflowCalculator for current month */ }
var cashflowBeforeTaxCurrentMonth: Double { /* without tax effect */ }
var monthlyTaxRefund: Double { /* annualTaxEffect / ownershipMonths */ }
var netYield: Double { /* NOI / totalInvestment */ }
var cashOnCash: Double { /* cashflowAfterTaxYearly / equityContributed (fallback equityUsed) */ }
var dscr: Double { /* NOI / (monthlyMortgage × 12) */ }
```

- [ ] **Step 2: Write FixedKPIBar view** — white strip, 4 slots, always visible above scroll:

```swift
struct FixedKPIBar: View {
    let vm: PropertyViewModel

    var body: some View {
        HStack(spacing: 0) {
            kpiSlot(label: "CF NACH\nSTEUERN",
                    value: Formatters.formatCurrencySigned(vm.cashflowAfterTaxCurrentMonth),
                    subtext: "vor St.: \(Formatters.formatCurrencySigned(vm.cashflowBeforeTaxCurrentMonth))",
                    isColored: true)
            Divider().frame(height: 44)
            kpiSlot(label: "NETTO-\nRENDITE",
                    value: Formatters.formatPercent(vm.netYield),
                    subtext: "Brutto: \(Formatters.formatPercent(vm.grossYield))")
            Divider().frame(height: 44)
            kpiSlot(label: "CASH-ON-\nCASH",
                    value: Formatters.formatPercent(vm.cashOnCash),
                    subtext: nil)
            Divider().frame(height: 44)
            kpiSlotDSCR(vm: vm)
        }
        .frame(height: 60)
        .background(Color.white)
        .shadow(color: Color.black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}
```

- [ ] **Step 3: Integrate into OverviewTab** — KPI bar pinned above ScrollView.

- [ ] **Step 4: Run build**.

- [ ] **Step 5: Commit**
```bash
git add Volta/Volta/Views/Property/OverviewTab.swift Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "feat(overview): add fixed KPI bar — CF, Nettorendite, CoC, DSCR"
```

---

### Task 3.2 — Cover image header

- [ ] **Step 1: Add cover photo loading to PropertyViewModel**:

```swift
var coverPhotoPath: String? {
    let sorted = property.photos.sorted { $0.sortOrder < $1.sortOrder }
    return sorted.first(where: { $0.isCoverPhoto })?.filePath ?? sorted.first?.filePath
}
```

- [ ] **Step 2: Add header to OverviewTab** — full-width image 200pt, placeholder gradient + property type icon:

```swift
var headerImage: some View {
    Group {
        if let path = vm.coverPhotoPath,
           let uiImage = UIImage(contentsOfFile: path) {
            Image(uiImage: uiImage)
                .resizable().scaledToFill()
        } else {
            placeholderGradient
        }
    }
    .frame(height: 200)
    .clipped()
}
```

- [ ] **Step 3: Run build**.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Property/OverviewTab.swift
git commit -m "feat(overview): add cover photo header with placeholder gradient"
```

---

### Task 3.3 — Card 1 (Aktueller Stand)

- [ ] **Step 1: Build Aktueller Stand card** — status badge, since-date, cashflow line items:

```
AKTUELLER STAND

[Status-Badge]  seit [Datum letzter StatusEntry]

── Cashflow / Monat ──
Einnahmen               +X.XXX €
Kreditrate              −X.XXX €
Laufende Kosten         −XXX €
Cashflow vor Steuern    −XXX €   (fett)
Steuereffekt (Ø monatl.) +XXX €  (blau)
Cashflow nach Steuern   −XXX €   (fett, 22px, farbig)
```

Empty state if no StatusEntry: show "Noch kein Status vorhanden. [+ Ersten Status hinzufügen]" → navigates to Verlauf-Tab.

- [ ] **Step 2: Add cashflow breakdown to PropertyViewModel** — `einnahmenCurrentMonth`, `laufendeKostenCurrentMonth` (all non-mortgage costs summed).

- [ ] **Step 3: Run build**.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Property/OverviewTab.swift Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "feat(overview): Card 1 Aktueller Stand — cashflow breakdown, empty state"
```

---

### Task 3.4 — Card 2 (Rendite & Investment) with KPI chips and Info sheets

- [ ] **Step 1: Define KPIInfo constants** for all 7 KPIs (Bruttorendite, Nettorendite, CoC, Kaufpreisfaktor, DSCR, LTV, Leerstandsquote) — include formula, explanation, benchmark table. Place in `Volta/Volta/Utilities/BenchmarkContext.swift` or a new `KPIDefinitions.swift`.

- [ ] **Step 2: Build KPI rows** — label + value + KPIChip + ⓘ button:

```swift
func kpiRow(label: String, value: String, benchmark: KPIBenchmark, info: KPIInfo) -> some View {
    HStack {
        Text(label).font(.appRowLabel).foregroundStyle(Color.appSecondaryText)
        Spacer()
        Text(value).font(.appRowValue)
        KPIChip(benchmark: benchmark)
        Button { activeInfo = info } label: {
            Image(systemName: "info.circle")
                .font(.system(size: 14)).foregroundStyle(Color.appDimText)
        }
    }
}
```

- [ ] **Step 3: Build Investment section** — Gesamtinvestment, Eigenkapital, NOI/Jahr, Break-Even-Miete.

- [ ] **Step 4: Build Marktwert section** (conditional on `currentMarketValue != nil`).

- [ ] **Step 5: Wire `@State private var activeInfo: KPIInfo?`** and `.sheet(item: $activeInfo) { InfoBottomSheet(info: $0) }`.

- [ ] **Step 6: Run build**.

- [ ] **Step 7: Commit**
```bash
git add Volta/Volta/Views/Property/OverviewTab.swift Volta/Volta/Utilities/
git commit -m "feat(overview): Card 2 Rendite — KPI chips, info sheets, investment summary"
```

---

### Task 3.5 — Cards 3 & 4 (Finanzierung, Objekt)

- [ ] **Step 1: Build Card 3 (Finanzierung)** — Darlehensbetrag, Restschuld, Rate, Zinssatz, Tilgung, Zinsbindung bis (+ noch X Jahre). If loanAmount = 0: show "Keine Finanzierung erfasst."

- [ ] **Step 2: Build Card 4 (Objekt)** — full address, 2-column grid: Typ, Baujahr, Wohnfläche, Zimmer, Kaltmiete/m², Kaufpreis/m², Energieklasse, Zustand, Heizung, Stellplatz. Notizen section (only if notes non-empty).

- [ ] **Step 3: Run build**.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Property/OverviewTab.swift
git commit -m "feat(overview): Cards 3+4 — Finanzierung summary, Objekt details"
```

---

## Branch 4: `tab/verlauf`

**Spec:** `spec-verlauf-tab.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/VerlaufTab.swift` |
| Create | `Volta/Volta/Views/Property/StatusEntrySheet.swift` (modify existing) |
| Create | `Volta/Volta/Views/Property/ExtraordinaryCostSheet.swift` |

---

### Task 4.1 — Status entries feed

- [ ] **Step 1: Build combined feed** — merge StatusEntry + ExtraordinaryCost, sort descending by date (then createdAt):

```swift
enum FeedItem: Identifiable {
    case status(StatusEntry)
    case cost(ExtraordinaryCost)
    var id: String { ... }
    var date: Date { ... }
}
```

- [ ] **Step 2: Build StatusEntry row** — colored dot, badge, start date, end date + duration, mietgarantie amount if applicable.

- [ ] **Step 3: Build ExtraordinaryCost row** — €-icon, description, date, amount (red), absetzbar badge.

- [ ] **Step 4: Add [+ Status] and [+ Kosten] buttons** in toolbar.

- [ ] **Step 5: Empty state** — "Noch kein Statusverlauf. [+ Ersten Status hinzufügen]"

- [ ] **Step 6: Commit**
```bash
git add Volta/Volta/Views/Property/VerlaufTab.swift
git commit -m "feat(verlauf): combined feed — StatusEntry + ExtraordinaryCost, sorted feed"
```

---

### Task 4.2 — StatusEntry sheet (add/edit)

- [ ] **Step 1: Modify StatusEntrySheet.swift** — Datum, Status picker (Vermietet/Leerstand/Mietgarantie), Einnahme/Monat (conditional), Notizen. Validation: no duplicate dates, not before economicTransferDate.

- [ ] **Step 2: Support edit mode** — pre-populate fields from existing StatusEntry.

- [ ] **Step 3: Long-press or swipe on feed row** → edit/delete actions.

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Property/StatusEntrySheet.swift
git commit -m "feat(verlauf): StatusEntry add/edit sheet with validation"
```

---

### Task 4.3 — ExtraordinaryCost sheet

- [ ] **Step 1: Create ExtraordinaryCostSheet.swift** — Datum, Beschreibung, Betrag, Toggle "Steuerlich absetzbar" (default on), Notizen.

- [ ] **Step 2: Wire into VerlaufTab**.

- [ ] **Step 3: Commit**
```bash
git add Volta/Volta/Views/Property/ExtraordinaryCostSheet.swift Volta/Volta/Views/Property/VerlaufTab.swift
git commit -m "feat(verlauf): ExtraordinaryCost add/edit sheet"
```

---

## Branch 5: `tab/cashflow`

**Spec:** `spec-cashflow-tab.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/CashflowTab.swift` |
| Modify | `Volta/Volta/ViewModels/PropertyViewModel.swift` |

---

### Task 5.1 — Card 1 (Prognose-Monat)

- [ ] **Step 1: Add to PropertyViewModel** — `cashflowPrognoseVollvermietung()` and `cashflowPrognoseVollLeerstand()` returning all line items.

- [ ] **Step 2: Build Prognose card** — Segmented Control [Vollvermietung / Leerstand], all line items per spec (conditional rows for Leerstand/Stellplatz), Zusammenfassung. Toggle state persists via `@AppStorage`.

- [ ] **Step 3: Commit**
```bash
git add Volta/Volta/Views/Property/CashflowTab.swift
git commit -m "feat(cashflow): Card 1 Prognose-Monat — all line items, VV/Leerstand toggle"
```

---

### Task 5.2 — Card 2 (Jahrestabelle)

- [ ] **Step 1: Build year picker** — [← YYYY →], range from `economicTransferDate.year` to `currentYear + 1`.

- [ ] **Step 2: Build table** — rows per spec, columns Jan–Dez + Ø Mon + Total. Use `ScrollView(.horizontal)` only if needed; per spec all columns should fit.

- [ ] **Step 3: Color past months** normally, future months grayed/italic.

- [ ] **Step 4: ExtraordinaryCost rows** per month, Ø only if ≥ 2 entries in year.

- [ ] **Step 5: Steuereffekt** from current year TaxCalculator; for future years show ⚠ placeholder.

- [ ] **Step 6: Warnings** for !isHoaUnitSplit and !isHoaParkingSplit.

- [ ] **Step 7: Commit**
```bash
git add Volta/Volta/Views/Property/CashflowTab.swift Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "feat(cashflow): Card 2 Jahrestabelle — year picker, monthly columns, status-aware"
```

---

## Branch 6: `tab/steuer`

**Spec:** `spec-steuer-tab.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/TaxTab.swift` |
| Modify | `Volta/Volta/ViewModels/PropertyViewModel.swift` |

---

### Task 6.1 — Sektion 1 (Laufendes Jahr)

- [ ] **Step 1: Add to PropertyViewModel** — `annualTaxableIncomeCurrentYear` and all line-item contributions calling the new `TaxCalculator.annualTaxableIncome(...)`.

- [ ] **Step 2: Build Sektion 1** — [Ist] badge, subtitle (range description), all deduction rows per spec (conditional Stellplatz, conditional Gebäudeversicherung, conditional Sonstige, conditional AK), blue Gradient Divider, Steuerliches Ergebnis (fett), Steuereffekt/Mon (22px farbig).

- [ ] **Step 3: Commit**
```bash
git add Volta/Volta/Views/Property/TaxTab.swift
git commit -m "feat(steuer): Sektion 1 Laufendes Jahr — all deduction rows, hybrid Ist/Prognose"
```

---

### Task 6.2 — Sektion 2 (Prognose) + Warnungen

- [ ] **Step 1: Build Sektion 2** — Jahr-Picker (default = nächstes Jahr), [Vollvermietung/Leerstand] toggle, same row structure. Toggle and year stored in-memory (not persisted).

- [ ] **Step 2: Add warnings** — ⚠ if !isHoaUnitSplit, ⚠ if !isHoaParkingSplit.

- [ ] **Step 3: Commit**
```bash
git add Volta/Volta/Views/Property/TaxTab.swift
git commit -m "feat(steuer): Sektion 2 Prognose — year picker, VV/Leerstand toggle, warnings"
```

---

## Branch 7: `tab/finanzierung`

**Spec:** `spec-finanzierung-tab.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/FinancingTab.swift` |

---

### Task 7.1 — Finanzierungsübersicht + Tilgungsplan

- [ ] **Step 1: Build Sektion 1** — Darlehensbetrag, Restschuld (today), Rate, Zinssatz, Tilgung, Zinsbindung bis + noch X Jahre, Restschuld Zinsbindungsende.

- [ ] **Step 2: Build Sektion 2 (Tilgungsplan)** — yearly rows: Jahr, Restschuld Anfang, Zinsen, Tilgung, Rate, Restschuld Ende. Data from `AmortizationCalculator`. Highlight Zinsbindungsende row. Show ⚠ after that row.

- [ ] **Step 3: No-loan state** — "Keine Finanzierung erfasst."

- [ ] **Step 4: Commit**
```bash
git add Volta/Volta/Views/Property/FinancingTab.swift
git commit -m "feat(finanzierung): Übersicht + full Tilgungsplan, Zinsbindung highlight"
```

---

## Branch 8: `tab/immobiliendaten`

**Spec:** `spec-immobiliendaten-tab.md`

### File map

| Action | File |
|--------|------|
| Modify | `Volta/Volta/Views/Property/ImmobiliendatenTab.swift` |

---

### Task 8.1 — Sidebar + sections scaffold

- [ ] **Step 1: Build sidebar layout** — same as PropertySetupView but with 10 sections (Stammdaten, Objektdaten, Kauf, Einnahmen, Annahmen, Kosten, Finanzierung, AfA & Steuer, Gefahrenzone). Auto-save via `.onChange` on each field.

- [ ] **Step 2: Implement all sections** — reuse form content from Setup step views, but bound directly to `property` fields via `@Bindable`. No Weiter/Zurück buttons.

- [ ] **Step 3: Add Annahmen section** — Leerstandsquote, Marktmiete/m², Marktwert (/m² ↔ Gesamt switcher with in-memory mode toggle).

- [ ] **Step 4: Add Gefahrenzone** — red "Immobilie löschen" button → confirmation dialog → delete + dismiss.

- [ ] **Step 5: Commit**
```bash
git add Volta/Volta/Views/Property/ImmobiliendatenTab.swift
git commit -m "feat(immobiliendaten): full sidebar edit tab — auto-save, all sections, Gefahrenzone"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] spec-design-system → Branch 1 Tasks 1.5, 1.6
- [x] spec-data-model → Branch 1 Tasks 1.1–1.4
- [x] spec-calculations → Branch 1 Tasks 1.7–1.9
- [x] spec-hauptscreen → Branch 2 Tasks 2.1–2.2
- [x] spec-property-setup → Branch 2 Tasks 2.3–2.7
- [x] spec-overview-tab → Branch 3 Tasks 3.1–3.5
- [x] spec-verlauf-tab → Branch 4 Tasks 4.1–4.3
- [x] spec-cashflow-tab → Branch 5 Tasks 5.1–5.2
- [x] spec-steuer-tab → Branch 6 Tasks 6.1–6.2
- [x] spec-finanzierung-tab → Branch 7 Task 7.1
- [x] spec-immobiliendaten-tab → Branch 8 Tasks 8.1–8.4

**Known gaps to watch:**
- `PropertyViewModel` will need incremental updates as each tab branch adds computed props — each tab branch PR should include VM changes
- `WizardState.swift` / old `AddPropertyWizard.swift` should be deleted in the `shell` branch once `PropertySetupView` is wired up
- `SettingsTab.swift` can be deleted in `shell` branch — its content moves to `ImmobiliendatenTab`
- `SeedData.swift` will need updating after model changes in `foundation`
