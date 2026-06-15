# Immobilien Portfolio Manager — Plan 2: App Shell & Portfolio Views

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the navigable app shell with sidebar, the portfolio overview grid, aggregated portfolio KPIs, all reusable UI components, and debug seed data — producing a running app you can click around in.

**Architecture:** `NavigationSplitView` with a fixed-width sidebar and full-width detail column. Design tokens live in a `Color+App.swift` extension so every view uses named semantic colors. Reusable components in `Components/` have no business logic — they render whatever values they receive. `PropertyViewModel` and `PortfolioViewModel` (both `@Observable`) supply computed KPIs from the calculation layer; Views only read from them.

**Tech Stack:** SwiftUI, SwiftData (`@Query`), `@Observable`, Swift Charts (LTV Donut in Portfolio header)

**Depends on:** Plan 1 (models, calculators, utilities must exist)

---

> **Xcode note:** Every new `.swift` file must be added to the **Volta** app target. Create groups in Xcode Project Navigator first, then add files into them.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Volta/Volta/VoltaApp.swift` | Modify | Replace placeholder Text with `AppShellView` |
| `Volta/Volta/Design/Color+App.swift` | Create | Semantic color tokens (accent, status, backgrounds) |
| `Volta/Volta/Design/Font+App.swift` | Create | Named text styles (display, headline, body, caption, mono) |
| `Volta/Volta/ViewModels/PropertyViewModel.swift` | Create | KPIs + cashflow for a single Property |
| `Volta/Volta/ViewModels/PortfolioViewModel.swift` | Create | Aggregated portfolio KPIs across all properties |
| `Volta/Volta/Views/Components/KPICard.swift` | Create | Label + value card, no benchmark |
| `Volta/Volta/Views/Components/KPICardWithContext.swift` | Create | KPI card + rating badge + context text |
| `Volta/Volta/Views/Components/StatusBadge.swift` | Create | Coloured chip: Vermietet / Leerstand / etc. |
| `Volta/Volta/Views/Components/SollIstRow.swift` | Create | Side-by-side Soll/Ist comparison row |
| `Volta/Volta/Views/Components/CurrencyField.swift` | Create | EUR text input with live formatting |
| `Volta/Volta/Views/Components/PercentField.swift` | Create | Percent text input (stored as decimal, displayed as %) |
| `Volta/Volta/Views/Components/SectionHeader.swift` | Create | Bold section divider label |
| `Volta/Volta/Views/AppShellView.swift` | Create | Root NavigationSplitView |
| `Volta/Volta/Views/Portfolio/PortfolioView.swift` | Create | Property grid + "Add" button |
| `Volta/Volta/Views/Portfolio/PortfolioKPIView.swift` | Create | Aggregated KPI bar at top of portfolio |
| `Volta/Volta/Views/Portfolio/PropertyCard.swift` | Create | Single property card in the grid |
| `Volta/Volta/Views/EmptyStateView.swift` | Create | Empty state shown when no properties exist |
| `Volta/Volta/Utilities/SeedData.swift` | Create | Debug-only Dresdner ETW seeding |

---

## Task 1: Design Tokens

**Files:**
- Create: `Volta/Volta/Design/Color+App.swift`
- Create: `Volta/Volta/Design/Font+App.swift`

- [ ] **Step 1: Create `Design` group in Xcode**

Right-click `Volta/Volta` in Project Navigator → New Group → `Design`.

- [ ] **Step 2: Create `Color+App.swift`**

```swift
// Volta/Volta/Design/Color+App.swift
import SwiftUI

extension Color {
    // MARK: - Accent
    static let appAccent = Color(hex: "#2563EB")

    // MARK: - Status / Value colours
    static let appPositive = Color(hex: "#16A34A")   // Positiver Wert
    static let appNegative = Color(hex: "#DC2626")   // Negativer Wert

    // MARK: - Backgrounds
    static let appContentBackground = Color(
        light: Color(hex: "#FFFFFF"),
        dark: Color(hex: "#111827")
    )
    static let appCardBackground = Color(
        light: Color(hex: "#F5F5F5"),
        dark: Color(hex: "#1F2937")
    )
    static let appSidebarBackground = Color(
        light: Color(hex: "#F5F5F5"),
        dark: Color(hex: "#0D1117")
    )

    // MARK: - Text
    static let appPrimaryText = Color(
        light: Color(hex: "#111827"),
        dark: Color(hex: "#F9FAFB")
    )
    static let appSecondaryText = Color(
        light: Color(hex: "#6B7280"),
        dark: Color(hex: "#9CA3AF")
    )
}

// MARK: - Hex init
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }

    /// Creates a color that adapts to light/dark mode.
    init(light: Color, dark: Color) {
        self.init(NSColor(name: nil, dynamicProvider: { appearance in
            appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
                ? NSColor(dark)
                : NSColor(light)
        }))
    }
}

// MARK: - Value colouring helper
extension Color {
    /// Returns .appPositive for >= 0, .appNegative for < 0.
    static func valueColor(_ value: Double) -> Color {
        value >= 0 ? .appPositive : .appNegative
    }
}
```

- [ ] **Step 3: Create `Font+App.swift`**

```swift
// Volta/Volta/Design/Font+App.swift
import SwiftUI

extension Font {
    /// 28pt Semibold — dominant single number (Kaufpreis, Gesamtinvestment)
    static let appDisplay = Font.system(size: 28, weight: .semibold, design: .default)

    /// 17pt Semibold — KPI labels, tab titles
    static let appHeadline = Font.system(size: 17, weight: .semibold, design: .default)

    /// 13pt Regular — body text, descriptions
    static let appBody = Font.system(size: 13, weight: .regular, design: .default)

    /// 11pt Regular — benchmark hints, dates
    static let appCaption = Font.system(size: 11, weight: .regular, design: .default)

    /// 13pt Mono — all numbers (alignment in tables)
    static let appMono = Font.system(size: 13, weight: .regular, design: .monospaced)

    /// 11pt Mono — small numbers in tables
    static let appMonoSmall = Font.system(size: 11, weight: .regular, design: .monospaced)
}
```

- [ ] **Step 4: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Design/
git commit -m "feat: add design tokens (Color+App, Font+App)"
```

---

## Task 2: ViewModels

**Files:**
- Create: `Volta/Volta/ViewModels/PropertyViewModel.swift`
- Create: `Volta/Volta/ViewModels/PortfolioViewModel.swift`

- [ ] **Step 1: Create `ViewModels` group in Xcode**

Right-click `Volta/Volta` → New Group → `ViewModels`.

- [ ] **Step 2: Create `PropertyViewModel.swift`**

```swift
// Volta/Volta/ViewModels/PropertyViewModel.swift
import Foundation
import Observation

@Observable
class PropertyViewModel {
    let property: Property

    init(property: Property) {
        self.property = property
    }

    // MARK: - Kauf / Preis

    var purchasePrice: Double {
        property.purchasePriceUnit + property.purchasePriceParking
    }

    var closingCostsTotal: Double {
        KPICalculator.closingCostsTotal(
            landTransferTax: property.landTransferTax,
            notaryCosts: property.notaryCosts,
            landRegistryCosts: property.landRegistryCosts,
            agentFee: property.agentFee,
            appraisalCosts: property.appraisalCosts
        )
    }

    var totalInvestment: Double {
        KPICalculator.totalInvestment(
            purchasePrice: purchasePrice,
            closingCostsTotal: closingCostsTotal,
            renovationModernizationCosts: property.renovationModernizationCosts
        )
    }

    var equityUsed: Double {
        KPICalculator.equityUsed(totalInvestment: totalInvestment, loanAmount: property.loanAmount)
    }

    // MARK: - Einnahmen

    var grossIncomeMonthly: Double {
        property.coldRentMonthly + property.parkingRentMonthly + property.otherIncomeMonthly
    }

    var grossIncomeYearly: Double { grossIncomeMonthly * 12 }

    var effectiveGrossIncomeYearly: Double {
        KPICalculator.effectiveGrossIncomeYearly(
            grossIncomeYearly: grossIncomeYearly,
            vacancyRate: property.vacancyRateAssumption
        )
    }

    // MARK: - Kosten

    var hoaFeeNonRecoverableMonthly: Double {
        property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly
    }

    var propertyTaxMonthly: Double { property.propertyTaxAnnual / 12.0 }

    var propertyManagementMonthly: Double { property.propertyManagementAnnual / 12.0 }

    var propertyInsuranceMonthly: Double { property.propertyInsuranceAnnual / 12.0 }

    var operatingCostsNonRecoverableMonthly: Double {
        KPICalculator.operatingCostsNonRecoverableMonthly(
            hoaFeeNonRecoverable: hoaFeeNonRecoverableMonthly,
            maintenanceReserve: property.maintenanceReserveMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly
        )
    }

    var operatingCostsNonRecoverableYearly: Double {
        operatingCostsNonRecoverableMonthly * 12.0
    }

    var operatingCostsRecoverableMonthly: Double {
        KPICalculator.operatingCostsRecoverableMonthly(
            hoaFeeRecoverable: property.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: propertyTaxMonthly,
            propertyInsuranceMonthly: propertyInsuranceMonthly
        )
    }

    // MARK: - Finanzierung

    var monthlyMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            amortizationRate: property.amortizationRate,
            monthlyMortgageActual: property.monthlyMortgageActual
        )
    }

    var debtServiceAnnual: Double { monthlyMortgage * 12.0 }

    var interestAnnual: Double {
        TaxCalculator.interestAnnual(loanAmount: property.loanAmount, interestRate: property.interestRate)
    }

    var remainingDebtNow: Double {
        guard let monthsElapsed = property.loanStartDate.monthsBetween(Date()) else {
            return property.loanAmount
        }
        return AmortizationCalculator.remainingDebt(
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            atMonth: monthsElapsed
        )
    }

    // MARK: - AfA & Steuer

    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: property.buildingValue,
            closingCostsTotal: closingCostsTotal,
            purchasePrice: purchasePrice,
            renovationAfaEligible: property.renovationAfaEligible
        )
    }

    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: property.depreciationRate)
    }

    var depreciationMonthly: Double {
        DepreciationCalculator.depreciationMonthly(afaBasis: afaBasis, rate: property.depreciationRate)
    }

    var taxableIncomeVV: Double {
        TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: operatingCostsNonRecoverableYearly,
            interestAnnual: interestAnnual,
            depreciationYearly: depreciationYearly
        )
    }

    var taxEffectMonthly: Double {
        TaxCalculator.taxEffectMonthly(
            taxableIncomeVV: taxableIncomeVV,
            marginalTaxRate: property.marginalTaxRate
        )
    }

    // MARK: - KPIs (Prognose)

    var netOperatingIncomeYearly: Double {
        KPICalculator.netOperatingIncomeYearly(
            effectiveGrossIncomeYearly: effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: operatingCostsNonRecoverableYearly
        )
    }

    var cashflowAfterDebtYearly: Double {
        KPICalculator.cashflowAfterDebtYearly(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var cashflowAfterDebtMonthly: Double { cashflowAfterDebtYearly / 12.0 }

    var cashflowAfterTaxMonthly: Double {
        CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: cashflowAfterDebtMonthly,
            taxEffectMonthly: taxEffectMonthly
        )
    }

    var grossYield: Double? {
        KPICalculator.grossYield(
            coldRentYearly: property.coldRentMonthly * 12,
            parkingRentYearly: property.parkingRentMonthly * 12,
            purchasePrice: purchasePrice
        )
    }

    var netYield: Double? {
        KPICalculator.netYield(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            totalInvestment: totalInvestment
        )
    }

    var capRate: Double? {
        KPICalculator.capRate(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            purchasePrice: purchasePrice
        )
    }

    var cashOnCashReturn: Double? {
        KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: cashflowAfterDebtYearly,
            equityUsed: equityUsed
        )
    }

    var dscrNOI: Double? {
        KPICalculator.dscrNOI(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var mietmultiplikator: Double? {
        KPICalculator.mietmultiplikator(
            purchasePrice: purchasePrice,
            coldRentYearly: property.coldRentMonthly * 12,
            parkingRentYearly: property.parkingRentMonthly * 12
        )
    }

    var ltvRatio: Double? {
        KPICalculator.ltvRatio(remainingDebt: remainingDebtNow, totalInvestment: totalInvestment)
    }

    var breakEvenRentMonthly: Double {
        KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            monthlyMortgage: monthlyMortgage
        )
    }

    // MARK: - Statushistorie

    /// Aktiver Status für einen gegebenen Monat (erster Tag des Monats).
    func activeStatus(for month: Date) -> StatusEntry? {
        let monthStart = month.firstDayOfMonth
        return property.statusHistory
            .filter { $0.statusFrom.firstDayOfMonth <= monthStart }
            .sorted { $0.statusFrom < $1.statusFrom }
            .last
    }

    /// Aktueller Status (heute).
    var currentStatus: StatusEntry? { activeStatus(for: Date()) }

    // MARK: - Realität-KPIs

    /// Tatsächlicher Cashflow (nach Steuer) für einen Monat.
    func cashflowActual(for month: Date) -> (beforeTax: Double, afterTax: Double)? {
        guard let status = activeStatus(for: month),
              month.firstDayOfMonth >= property.economicTransferDate.firstDayOfMonth else {
            return nil
        }
        let ownerRecoverable = CashflowCalculator.ownerBorneRecoverableCosts(
            status: status.status,
            hoaFeeRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: propertyTaxMonthly,
            propertyInsuranceMonthly: propertyInsuranceMonthly
        )
        let monthStart = month.firstDayOfMonth
        let extraordinary = property.extraordinaryCosts
            .filter { $0.costMonth.firstDayOfMonth == monthStart }
            .reduce(0) { $0 + $1.amount }

        let beforeTax = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: status.incomeActualMonthly,
            monthlyMortgage: monthlyMortgage,
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: ownerRecoverable,
            extraordinaryCostsThisMonth: extraordinary
        )
        let afterTax = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: beforeTax,
            taxEffectMonthly: taxEffectMonthly
        )
        return (beforeTax, afterTax)
    }
}
```

- [ ] **Step 3: Create `PortfolioViewModel.swift`**

```swift
// Volta/Volta/ViewModels/PortfolioViewModel.swift
import Foundation
import Observation

@Observable
class PortfolioViewModel {
    private let viewModels: [PropertyViewModel]

    init(properties: [Property]) {
        self.viewModels = properties.map { PropertyViewModel(property: $0) }
    }

    var totalInvestment: Double {
        viewModels.reduce(0) { $0 + $1.totalInvestment }
    }

    var totalDebt: Double {
        viewModels.reduce(0) { $0 + $1.remainingDebtNow }
    }

    var portfolioLTV: Double? {
        guard totalInvestment > 0 else { return nil }
        return totalDebt / totalInvestment
    }

    var portfolioGrossIncomeYearly: Double {
        viewModels.reduce(0) { $0 + $1.grossIncomeYearly }
    }

    var portfolioNOIYearly: Double {
        viewModels.reduce(0) { $0 + $1.netOperatingIncomeYearly }
    }

    var portfolioNetYield: Double? {
        guard totalInvestment > 0 else { return nil }
        return portfolioNOIYearly / totalInvestment
    }

    var portfolioCashflowMonthly: Double {
        viewModels.reduce(0) { $0 + $1.cashflowAfterDebtMonthly }
    }

    var portfolioEquityTotal: Double {
        viewModels.reduce(0) { $0 + $1.equityUsed }
    }

    var portfolioCashOnCash: Double? {
        guard portfolioEquityTotal > 0 else { return nil }
        let totalCashflowYearly = viewModels.reduce(0) { $0 + $1.cashflowAfterDebtYearly }
        return totalCashflowYearly / portfolioEquityTotal
    }
}
```

- [ ] **Step 4: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/ViewModels/
git commit -m "feat: add PropertyViewModel and PortfolioViewModel"
```

---

## Task 3: Reusable UI Components

**Files:**
- Create: `Volta/Volta/Views/Components/KPICard.swift`
- Create: `Volta/Volta/Views/Components/KPICardWithContext.swift`
- Create: `Volta/Volta/Views/Components/StatusBadge.swift`
- Create: `Volta/Volta/Views/Components/SollIstRow.swift`
- Create: `Volta/Volta/Views/Components/CurrencyField.swift`
- Create: `Volta/Volta/Views/Components/PercentField.swift`
- Create: `Volta/Volta/Views/Components/SectionHeader.swift`

- [ ] **Step 1: Create `Views/Components` groups in Xcode**

Right-click `Volta/Volta` → New Group → `Views`. Right-click `Views` → New Group → `Components`.

- [ ] **Step 2: Create `KPICard.swift`**

```swift
// Volta/Volta/Views/Components/KPICard.swift
import SwiftUI

/// Simple KPI card — label above, value below. No benchmark context.
struct KPICard: View {
    let label: String
    let value: String
    var valueColor: Color = .appPrimaryText
    var width: CGFloat = 160

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appDisplay)
                .foregroundStyle(valueColor)
                .fontDesign(.monospaced)
        }
        .padding(12)
        .frame(width: width, alignment: .leading)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    HStack {
        KPICard(label: "Bruttorendite", value: "4,3 %", valueColor: .appPositive)
        KPICard(label: "Cashflow/Mon", value: "−487 €", valueColor: .appNegative)
    }
    .padding()
}
```

- [ ] **Step 3: Create `KPICardWithContext.swift`**

```swift
// Volta/Volta/Views/Components/KPICardWithContext.swift
import SwiftUI

/// KPI card with rating badge and benchmark context string below the value.
struct KPICardWithContext: View {
    let label: String
    let value: String
    let benchmark: BenchmarkResult
    var width: CGFloat = 200

    private var ratingColor: Color {
        switch benchmark.rating {
        case .sehrGut: return .appPositive
        case .gut:     return Color(hex: "#65A30D")   // lime-600
        case .okay:    return Color(hex: "#D97706")   // amber-600
        case .schlecht, .kritisch: return .appNegative
        case .neutral: return .appSecondaryText
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)

            Text(value)
                .font(.appDisplay)
                .foregroundStyle(Color.appPrimaryText)
                .fontDesign(.monospaced)

            HStack(spacing: 4) {
                Text(benchmark.rating.rawValue)
                    .font(.appCaption)
                    .fontWeight(.medium)
                    .foregroundStyle(ratingColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ratingColor.opacity(0.12))
                    .clipShape(Capsule())
            }

            Text(benchmark.context)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .italic()
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(width: width, alignment: .leading)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    KPICardWithContext(
        label: "Bruttorendite",
        value: "4,3 %",
        benchmark: BenchmarkContext.grossYield(0.043),
        width: 220
    )
    .padding()
}
```

- [ ] **Step 4: Create `StatusBadge.swift`**

```swift
// Volta/Volta/Views/Components/StatusBadge.swift
import SwiftUI

struct StatusBadge: View {
    let status: PropertyStatus

    private var label: String { status.rawValue }

    private var color: Color {
        switch status {
        case .vermietet:             return .appPositive
        case .leerstandMietgarantie: return Color(hex: "#D97706")
        case .leerstand:             return .appNegative
        case .eigennutzung:          return .appAccent
        case .renovierung:           return Color(hex: "#7C3AED")
        }
    }

    var body: some View {
        Text(label)
            .font(.appCaption)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

#Preview {
    VStack(spacing: 8) {
        StatusBadge(status: .vermietet)
        StatusBadge(status: .leerstand)
        StatusBadge(status: .leerstandMietgarantie)
        StatusBadge(status: .eigennutzung)
        StatusBadge(status: .renovierung)
    }.padding()
}
```

- [ ] **Step 5: Create `SollIstRow.swift`**

```swift
// Volta/Volta/Views/Components/SollIstRow.swift
import SwiftUI

/// A row showing a label, Soll value, and Ist value side by side.
/// Highlights deviation when Ist differs significantly from Soll.
struct SollIstRow: View {
    let label: String
    let soll: String
    let ist: String
    var deviation: Double? = nil        // Optional: positive = above target

    private var deviationColor: Color {
        guard let d = deviation else { return .clear }
        return d >= 0 ? .appPositive : .appNegative
    }

    var body: some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)

            Spacer()

            Text(soll)
                .font(.appMono)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 100, alignment: .trailing)

            Text(ist)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
                .frame(width: 100, alignment: .trailing)

            if let d = deviation {
                Text(d >= 0 ? "+\(Formatters.formatCurrency(d))" : Formatters.formatCurrency(d))
                    .font(.appMonoSmall)
                    .foregroundStyle(deviationColor)
                    .frame(width: 80, alignment: .trailing)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    VStack {
        SollIstRow(label: "Mieteinnahmen", soll: "950,00 €", ist: "950,00 €", deviation: 0)
        SollIstRow(label: "Cashflow", soll: "−487,55 €", ist: "−485,61 €", deviation: 1.94)
        SollIstRow(label: "Leerstand", soll: "0,00 €", ist: "−1.744,69 €", deviation: -1744.69)
    }
    .padding()
}
```

- [ ] **Step 6: Create `CurrencyField.swift`**

```swift
// Volta/Volta/Views/Components/CurrencyField.swift
import SwiftUI

/// EUR input field. Stores value as Double; displays with EUR formatting.
/// Editing shows raw number; on commit or focus-loss reformats.
struct CurrencyField: View {
    let label: String
    @Binding var value: Double
    var isRequired: Bool = false

    @State private var text: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack {
            Text(label + (isRequired ? " *" : ""))
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            TextField("0,00 €", text: $text)
                .font(.appMono)
                .multilineTextAlignment(.trailing)
                .frame(width: 130)
                .focused($isFocused)
                .onChange(of: isFocused) { _, focused in
                    if focused {
                        // Show raw number for editing
                        text = value == 0 ? "" : String(format: "%.2f", value)
                    } else {
                        commitValue()
                    }
                }
        }
        .onAppear {
            text = value == 0 ? "" : Formatters.formatCurrency(value)
        }
    }

    private func commitValue() {
        // Parse: strip EUR symbol, thousand separators, replace comma with dot
        let cleaned = text
            .replacingOccurrences(of: "€", with: "")
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ".", with: "")  // de_DE thousands sep
            .replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        value = Double(cleaned) ?? value
        text = value == 0 ? "" : Formatters.formatCurrency(value)
    }
}
```

- [ ] **Step 7: Create `PercentField.swift`**

```swift
// Volta/Volta/Views/Components/PercentField.swift
import SwiftUI

/// Percent input. Value stored as decimal (0.043 = 4,3%).
/// User types "4,3" or "4.3" — stored as 0.043.
struct PercentField: View {
    let label: String
    @Binding var value: Double   // stored as decimal, e.g. 0.043
    var isRequired: Bool = false

    @State private var text: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack {
            Text(label + (isRequired ? " *" : ""))
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            TextField("0,00 %", text: $text)
                .font(.appMono)
                .multilineTextAlignment(.trailing)
                .frame(width: 100)
                .focused($isFocused)
                .onChange(of: isFocused) { _, focused in
                    if focused {
                        let displayValue = value * 100
                        text = displayValue == 0 ? "" : String(format: "%.2f", displayValue)
                    } else {
                        commitValue()
                    }
                }
        }
        .onAppear {
            let displayValue = value * 100
            text = displayValue == 0 ? "" : Formatters.formatPercentOneDecimal(value)
        }
    }

    private func commitValue() {
        let cleaned = text
            .replacingOccurrences(of: "%", with: "")
            .replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        if let parsed = Double(cleaned) {
            value = parsed / 100.0
        }
        let displayValue = value * 100
        text = displayValue == 0 ? "" : Formatters.formatPercentOneDecimal(value)
    }
}
```

- [ ] **Step 8: Create `SectionHeader.swift`**

```swift
// Volta/Volta/Views/Components/SectionHeader.swift
import SwiftUI

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.appHeadline)
            .foregroundStyle(Color.appPrimaryText)
            .padding(.top, 8)
            .padding(.bottom, 2)
    }
}
```

- [ ] **Step 9: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add Volta/Volta/Views/Components/
git commit -m "feat: add reusable UI components (KPICard, StatusBadge, SollIstRow, CurrencyField, PercentField)"
```

---

## Task 4: Debug Seed Data

**Files:**
- Create: `Volta/Volta/Utilities/SeedData.swift`

- [ ] **Step 1: Create `SeedData.swift`**

This file is excluded from Release builds via `#if DEBUG`. It inserts the Dresdner ETW so you can see the app with real data immediately.

```swift
// Volta/Volta/Utilities/SeedData.swift
#if DEBUG
import Foundation
import SwiftData

enum SeedData {
    static func insertDresdnerETW(into context: ModelContext) {
        let p = Property()
        p.name = "ETW Dresden Neustadt"
        p.address = "Johann-Meyer-Straße 7b"
        p.city = "Dresden"
        p.state = "Sachsen"
        p.postalCode = "01097"
        p.propertyType = .apartment
        p.acquisitionType = .kauf
        p.yearBuilt = 1998
        p.livingAreaSqm = 63.18
        p.rooms = 2.5
        p.hasBalcony = true
        p.parkingType = .tiefgarage
        p.parkingCount = 1

        // Kauf
        p.purchaseDate = Date.firstDay(year: 2025, month: 9)
        p.economicTransferDate = Date.firstDay(year: 2026, month: 2)
        p.purchasePriceUnit = 263_600
        p.purchasePriceParking = 15_000
        p.landTransferTax = 15_323
        p.notaryCosts = 3_631.96
        p.landRegistryCosts = 1_180
        p.agentFee = 0
        p.appraisalCosts = 0
        p.renovationModernizationCosts = 0
        p.renovationAfaEligible = 0

        // Einnahmen
        p.coldRentMonthly = 950
        p.parkingRentMonthly = 48
        p.otherIncomeMonthly = 0
        p.serviceChargeRecoverableMonthly = 292
        p.vacancyRateAssumption = 0.03
        p.rentMarketSqm = 13.50

        // Kosten
        p.hoaFeeTotalMonthly = 417
        p.hoaFeeRecoverableMonthly = 292
        p.propertyTaxAnnual = 205
        p.propertyManagementAnnual = 396
        p.maintenanceReserveMonthly = 34.76
        p.propertyInsuranceAnnual = 0
        p.otherCostsMonthly = 0

        // Finanzierung
        p.loanAmount = 230_000
        p.interestRate = 0.043
        p.amortizationRate = 0.01
        p.fixedInterestPeriodYears = 10
        p.loanStartDate = Date.firstDay(year: 2025, month: 10)
        p.monthlyMortgageActual = 1_242.85

        // AfA & Steuer
        p.landValue = 50_600
        p.buildingValue = 228_000
        p.depreciationRate = 0.0384
        p.marginalTaxRate = 0.42

        // Mietgarantie
        let guarantee = RentGuarantee(
            guaranteeProvider: "Cosona Asset GmbH",
            guaranteeAmountMonthly: 998,
            guaranteeStartDate: Date.firstDay(year: 2026, month: 2),
            guaranteeEndDate: Date.firstDay(year: 2026, month: 7),
            guaranteeNotes: "Private Vereinbarung"
        )
        guarantee.property = p
        p.rentGuarantee = guarantee

        // Statushistorie
        let statusMietgarantie = StatusEntry(
            statusFrom: Date.firstDay(year: 2026, month: 2),
            status: .leerstandMietgarantie,
            incomeActualMonthly: 998,
            notes: "Mietgarantie Cosona"
        )
        statusMietgarantie.property = p
        p.statusHistory = [statusMietgarantie]

        context.insert(p)
        try? context.save()
    }
}
#endif
```

- [ ] **Step 2: Update `VoltaApp.swift` to call seed on empty store**

Replace the WindowGroup body in `VoltaApp.swift`:

```swift
var body: some Scene {
    WindowGroup {
        AppShellView()
            .frame(minWidth: 900, minHeight: 600)
            .onAppear {
                #if DEBUG
                seedIfEmpty()
                #endif
            }
    }
    .modelContainer(sharedModelContainer)
}

#if DEBUG
private func seedIfEmpty() {
    let context = sharedModelContainer.mainContext
    let descriptor = FetchDescriptor<Property>()
    let count = (try? context.fetchCount(descriptor)) ?? 0
    if count == 0 {
        SeedData.insertDresdnerETW(into: context)
    }
}
#endif
```

Note: `AppShellView` is created in Task 5 below. Build will fail until then — that's expected.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Utilities/SeedData.swift Volta/Volta/VoltaApp.swift
git commit -m "feat: add debug seed data (Dresdner ETW)"
```

---

## Task 5: App Shell & Portfolio Views

**Files:**
- Create: `Volta/Volta/Views/AppShellView.swift`
- Create: `Volta/Volta/Views/EmptyStateView.swift`
- Create: `Volta/Volta/Views/Portfolio/PortfolioView.swift`
- Create: `Volta/Volta/Views/Portfolio/PortfolioKPIView.swift`
- Create: `Volta/Volta/Views/Portfolio/PropertyCard.swift`

- [ ] **Step 1: Create `Views/Portfolio` group in Xcode**

Right-click `Views` → New Group → `Portfolio`.

- [ ] **Step 2: Create `EmptyStateView.swift`**

```swift
// Volta/Volta/Views/EmptyStateView.swift
import SwiftUI

struct EmptyStateView: View {
    let onAddProperty: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "building.2")
                .font(.system(size: 60))
                .foregroundStyle(Color.appSecondaryText)

            Text("Noch keine Immobilien")
                .font(.appHeadline)
                .foregroundStyle(Color.appPrimaryText)

            Text("Füge deine erste Immobilie hinzu\num Rendite, Cashflow und Steuereffekt\nim Blick zu behalten.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
                .multilineTextAlignment(.center)

            Button(action: onAddProperty) {
                Label("Erste Immobilie hinzufügen", systemImage: "plus")
                    .font(.appBody.weight(.medium))
            }
            .buttonStyle(.borderedProminent)
            .tint(.appAccent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appContentBackground)
    }
}

#Preview {
    EmptyStateView(onAddProperty: {})
}
```

- [ ] **Step 3: Create `PropertyCard.swift`**

```swift
// Volta/Volta/Views/Portfolio/PropertyCard.swift
import SwiftUI

struct PropertyCard: View {
    let vm: PropertyViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(vm.property.name)
                        .font(.appHeadline)
                        .foregroundStyle(Color.appPrimaryText)
                        .lineLimit(1)
                    Text("\(vm.property.city) · \(Formatters.formatCurrencyRounded(vm.purchasePrice))")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }
                Spacer()
                if let status = vm.currentStatus {
                    StatusBadge(status: status.status)
                }
            }

            Divider()

            // KPI Grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                cardKPI(label: "Bruttorendite", value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
                cardKPI(label: "Kaufpreisfaktor", value: vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–")
                cardKPI(label: "Cashflow/Mon", value: Formatters.formatCurrencyRounded(vm.cashflowAfterDebtMonthly),
                        valueColor: Color.valueColor(vm.cashflowAfterDebtMonthly))
                cardKPI(label: "Nettorendite", value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            }
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }

    @ViewBuilder
    private func cardKPI(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(valueColor)
        }
    }
}
```

- [ ] **Step 4: Create `PortfolioKPIView.swift`**

```swift
// Volta/Volta/Views/Portfolio/PortfolioKPIView.swift
import SwiftUI

struct PortfolioKPIView: View {
    let vm: PortfolioViewModel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                KPICard(
                    label: "Gesamt LTV",
                    value: vm.portfolioLTV.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    valueColor: vm.portfolioLTV.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText,
                    width: 150
                )
                KPICard(
                    label: "Portfolio-Rendite",
                    value: vm.portfolioNetYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    width: 150
                )
                KPICard(
                    label: "Cashflow/Mon",
                    value: Formatters.formatCurrencyRounded(vm.portfolioCashflowMonthly),
                    valueColor: Color.valueColor(vm.portfolioCashflowMonthly),
                    width: 150
                )
                KPICard(
                    label: "Cash-on-Cash",
                    value: vm.portfolioCashOnCash.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    width: 150
                )
                KPICard(
                    label: "Gesamtinvestment",
                    value: Formatters.formatCurrencyRounded(vm.totalInvestment),
                    width: 160
                )
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
        }
        .background(Color.appCardBackground.opacity(0.5))
    }
}
```

- [ ] **Step 5: Create `PortfolioView.swift`**

```swift
// Volta/Volta/Views/Portfolio/PortfolioView.swift
import SwiftUI
import SwiftData

struct PortfolioView: View {
    @Query(sort: \Property.createdAt, order: .reverse) private var properties: [Property]
    @State private var showingAddWizard = false
    @State private var selectedProperty: Property?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(spacing: 0) {
            if properties.isEmpty {
                EmptyStateView(onAddProperty: { showingAddWizard = true })
            } else {
                let portfolioVM = PortfolioViewModel(properties: properties)

                PortfolioKPIView(vm: portfolioVM)

                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(properties) { property in
                            let vm = PropertyViewModel(property: property)
                            PropertyCard(vm: vm)
                                .onTapGesture { selectedProperty = property }
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.appAccent, lineWidth: selectedProperty?.id == property.id ? 2 : 0)
                                )
                        }
                    }
                    .padding(24)
                }
            }
        }
        .navigationTitle("Portfolio")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showingAddWizard = true }) {
                    Label("Immobilie hinzufügen", systemImage: "plus")
                }
                .tint(.appAccent)
            }
        }
        // AddPropertyWizard sheet is added in Plan 4
        // PropertyDetailView navigation is added in Plan 3
    }
}
```

- [ ] **Step 6: Create `AppShellView.swift`**

```swift
// Volta/Volta/Views/AppShellView.swift
import SwiftUI

enum SidebarItem: String, CaseIterable, Identifiable {
    case portfolio = "Portfolio"
    case investmentCalculator = "Investment-Rechner"
    case settings = "Einstellungen"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .portfolio:            return "building.2"
        case .investmentCalculator: return "chart.bar.doc.horizontal"
        case .settings:             return "gear"
        }
    }
}

struct AppShellView: View {
    @State private var selectedItem: SidebarItem = .portfolio

    var body: some View {
        NavigationSplitView(columnVisibility: .constant(.all)) {
            List(SidebarItem.allCases, selection: $selectedItem) { item in
                Label(item.rawValue, systemImage: item.icon)
                    .tag(item)
            }
            .navigationSplitViewColumnWidth(min: 160, ideal: 180, max: 220)
            .navigationTitle("Volta")
        } detail: {
            switch selectedItem {
            case .portfolio:
                NavigationStack {
                    PortfolioView()
                }
            case .investmentCalculator:
                // Added in Plan 5
                Text("Investment-Rechner — kommt in Plan 5")
                    .foregroundStyle(Color.appSecondaryText)
            case .settings:
                // Added in Plan 3 (SettingsTab covers property settings;
                // app-level settings: dark/light mode toggle)
                Text("Einstellungen")
                    .foregroundStyle(Color.appSecondaryText)
            }
        }
    }
}

#Preview {
    AppShellView()
        .modelContainer(for: Property.self, inMemory: true)
}
```

- [ ] **Step 7: Build and run**

Cmd+B then Cmd+R. Expected:
- App launches.
- Sidebar shows Portfolio / Investment-Rechner / Einstellungen.
- Dresdner ETW appears as a card in the portfolio grid (debug seed).
- Portfolio KPI bar shows LTV, Rendite, Cashflow.

- [ ] **Step 8: Commit**

```bash
git add Volta/Volta/Views/
git commit -m "feat: add app shell, portfolio view with KPI bar, property cards, empty state"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Design tokens match `2026-06-14-design.md` (colors, font sizes, shadow, radius). Portfolio KPI bar shows all 5 aggregated KPIs. Property cards show 4 KPIs. Sidebar has all 3 entries. Empty state with CTA button. Debug seed data populated.
- [x] **No placeholders:** All views have full SwiftUI implementation.
- [x] **Type consistency:** `PropertyViewModel` exposes `grossYield: Double?` and views use `.map { }` to handle nil. `PortfolioViewModel` initialized with `[Property]` and creates `[PropertyViewModel]` internally. `BenchmarkResult` returned by `BenchmarkContext` functions used in `KPICardWithContext`.
- [x] **`Color.valueColor(_:)`** defined in `Color+App.swift` and used in `PropertyCard` and `PortfolioKPIView`.
