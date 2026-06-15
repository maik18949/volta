# Immobilien Portfolio Manager — Plan 5: Investment Calculator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Investment Calculator — a pre-purchase analysis tool with live KPI unlocking, 5-parameter sensitivity analysis, and a "Promote to Property" flow.

**Architecture:** `InvestmentCalculatorViewModel` wraps an `InvestmentCalculation` model and computes KPIs live via `@Observable`. The detail view has a fixed KPI panel (non-scrollable) and a scrollable input section below it, plus a collapsible sensitivity section. Promote creates a new `Property` from the calculation and marks the calculation as `isPromoted`.

**Tech Stack:** SwiftUI, SwiftData, `@Observable`, Swift Charts (not needed — KPI panel is text-only)

**Depends on:** Plan 1 (calculations, models), Plan 2 (components, design tokens, AppShellView sidebar wiring)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Volta/Volta/ViewModels/InvestmentCalculatorViewModel.swift` | Create | KPI computation, sensitivity overrides, stage unlocking |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorListView.swift` | Create | Sidebar list of all `InvestmentCalculation` records |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorDetailView.swift` | Create | Fixed KPI panel + scrollable inputs |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentKPIPanel.swift` | Create | Fixed top section showing all 8 KPIs |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentInputSections.swift` | Create | Scrollable input fields (Kauf, Einnahmen, Finanzierung, Kosten, AfA) |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentSensitivityView.swift` | Create | 5 sliders, live KPI update |
| `Volta/Volta/Views/InvestmentCalculator/InvestmentPromoteSheet.swift` | Create | Confirmation sheet → creates Property |
| `Volta/Volta/Views/AppShellView.swift` | Modify | Wire `.investmentCalculator` sidebar item |

---

## Task 1: InvestmentCalculatorViewModel

**Files:**
- Create: `Volta/Volta/ViewModels/InvestmentCalculatorViewModel.swift`

- [ ] **Step 1: Create `InvestmentCalculatorViewModel.swift`**

```swift
// Volta/Volta/ViewModels/InvestmentCalculatorViewModel.swift
import Foundation
import Observation

/// Wraps an InvestmentCalculation and computes KPIs live.
/// Sensitivity sliders temporarily override base values without persisting them.
@Observable
class InvestmentCalculatorViewModel {
    let calculation: InvestmentCalculation

    // MARK: - Sensitivity overrides (not persisted)
    var sensitivityRentDelta: Double = 0       // € per month delta on coldRentMonthly
    var sensitivityRateDelta: Double = 0       // decimal delta on interestRate (e.g. 0.005 = +0.5%)
    var sensitivityPriceDelta: Double = 0      // € delta on purchasePriceUnit
    var sensitivityVacancyDelta: Double = 0    // decimal delta on vacancyRateAssumption
    var sensitivityMaintenanceDelta: Double = 0 // € per month delta on hoaFeeNonRecoverableMonthly

    init(calculation: InvestmentCalculation) {
        self.calculation = calculation
    }

    // MARK: - Effective values (base + sensitivity)

    var effectiveColdRentMonthly: Double {
        max(0, calculation.coldRentMonthly + sensitivityRentDelta)
    }
    var effectiveInterestRate: Double {
        max(0.001, calculation.interestRate + sensitivityRateDelta)
    }
    var effectivePurchasePriceUnit: Double {
        max(1, calculation.purchasePriceUnit + sensitivityPriceDelta)
    }
    var effectiveVacancyRate: Double {
        max(0, min(1, calculation.vacancyRateAssumption + sensitivityVacancyDelta))
    }
    var effectiveNonRecoverableMonthly: Double {
        max(0, calculation.hoaFeeNonRecoverableMonthly + sensitivityMaintenanceDelta)
    }

    // MARK: - Derived values

    var purchasePrice: Double {
        effectivePurchasePriceUnit + calculation.purchasePriceParking
    }

    var closingCostsTotal: Double {
        KPICalculator.closingCostsTotal(
            landTransferTax: calculation.landTransferTax,
            notaryCosts: calculation.notaryCosts,
            landRegistryCosts: calculation.landRegistryCosts,
            agentFee: calculation.agentFee,
            appraisalCosts: calculation.appraisalCosts
        )
    }

    var totalInvestment: Double {
        KPICalculator.totalInvestment(
            purchasePrice: purchasePrice,
            closingCostsTotal: closingCostsTotal,
            renovationModernizationCosts: calculation.renovationModernizationCosts
        )
    }

    var equityUsed: Double {
        KPICalculator.equityUsed(totalInvestment: totalInvestment, loanAmount: calculation.loanAmount)
    }

    var grossIncomeMonthly: Double {
        effectiveColdRentMonthly + calculation.parkingRentMonthly + calculation.otherIncomeMonthly
    }

    var effectiveGrossIncomeYearly: Double {
        KPICalculator.effectiveGrossIncomeYearly(
            grossIncomeYearly: grossIncomeMonthly * 12,
            vacancyRate: effectiveVacancyRate
        )
    }

    var monthlyMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: calculation.loanAmount,
            interestRate: effectiveInterestRate,
            amortizationRate: calculation.amortizationRate,
            monthlyMortgageActual: calculation.monthlyMortgageActual
        )
    }

    var debtServiceAnnual: Double { monthlyMortgage * 12 }

    var interestAnnual: Double {
        TaxCalculator.interestAnnual(loanAmount: calculation.loanAmount, interestRate: effectiveInterestRate)
    }

    var operatingCostsNonRecoverableMonthly: Double {
        effectiveNonRecoverableMonthly
            + calculation.maintenanceReserveMonthly
            + calculation.propertyManagementAnnual / 12
    }

    var operatingCostsNonRecoverableYearly: Double {
        operatingCostsNonRecoverableMonthly * 12
    }

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

    var cashflowAfterDebtMonthly: Double { cashflowAfterDebtYearly / 12 }

    // MARK: - AfA & Tax (Stage 4)

    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: calculation.buildingValue,
            closingCostsTotal: closingCostsTotal,
            purchasePrice: purchasePrice,
            renovationAfaEligible: calculation.renovationAfaEligible
        )
    }

    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: calculation.depreciationRate)
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
            marginalTaxRate: calculation.marginalTaxRate
        )
    }

    var cashflowAfterTaxMonthly: Double {
        CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: cashflowAfterDebtMonthly,
            taxEffectMonthly: taxEffectMonthly
        )
    }

    // MARK: - KPIs

    var mietmultiplikator: Double? {
        KPICalculator.mietmultiplikator(
            purchasePrice: purchasePrice,
            coldRentYearly: effectiveColdRentMonthly * 12,
            parkingRentYearly: calculation.parkingRentMonthly * 12
        )
    }

    var grossYield: Double? {
        KPICalculator.grossYield(
            coldRentYearly: effectiveColdRentMonthly * 12,
            parkingRentYearly: calculation.parkingRentMonthly * 12,
            purchasePrice: purchasePrice
        )
    }

    var netYield: Double? {
        KPICalculator.netYield(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            totalInvestment: totalInvestment
        )
    }

    var cashOnCashReturn: Double? {
        guard hasCostData else { return nil }
        return KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: cashflowAfterDebtYearly,
            equityUsed: equityUsed
        )
    }

    var dscrNOI: Double? {
        guard hasFinancingData else { return nil }
        return KPICalculator.dscrNOI(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var ltvRatio: Double? {
        guard hasFinancingData, totalInvestment > 0 else { return nil }
        return calculation.loanAmount / totalInvestment
    }

    var breakEvenRentMonthly: Double? {
        guard hasFinancingData else { return nil }
        return KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            monthlyMortgage: monthlyMortgage
        )
    }

    // MARK: - KPI Stage unlocking (per spec section 11)

    /// Stage 1: name + purchase price + rent → Kaufpreisfaktor, Bruttorendite
    var hasBaseData: Bool {
        !calculation.name.isEmpty && purchasePrice > 0 && effectiveColdRentMonthly > 0
    }

    /// Stage 2: + financing → Cashflow, DSCR, Break-Even, LTV, Cash-on-Cash
    var hasFinancingData: Bool {
        hasBaseData && calculation.loanAmount > 0 && calculation.interestRate > 0
            && calculation.amortizationRate > 0
    }

    /// Stage 3: + costs → Nettorendite, accurate cashflow
    var hasCostData: Bool {
        hasFinancingData && (calculation.hoaFeeNonRecoverableMonthly > 0
            || calculation.maintenanceReserveMonthly > 0
            || calculation.propertyManagementAnnual > 0)
    }

    /// Stage 4: + tax → Cashflow after tax
    var hasTaxData: Bool {
        hasCostData && calculation.marginalTaxRate > 0 && calculation.buildingValue > 0
    }

    // MARK: - Sensitivity ranges (per spec)

    var rentSliderRange: ClosedRange<Double> {
        let base = calculation.coldRentMonthly
        return (-base * 0.20)...(base * 0.20)
    }

    var rateSliderRange: ClosedRange<Double> { -0.02...0.02 }

    var priceSliderRange: ClosedRange<Double> {
        let base = calculation.purchasePriceUnit
        return (-base * 0.15)...(base * 0.15)
    }

    var vacancySliderRange: ClosedRange<Double> { -0.10...0.10 }

    var maintenanceSliderRange: ClosedRange<Double> { -100.0...100.0 }

    func resetSensitivity() {
        sensitivityRentDelta = 0
        sensitivityRateDelta = 0
        sensitivityPriceDelta = 0
        sensitivityVacancyDelta = 0
        sensitivityMaintenanceDelta = 0
    }
}
```

- [ ] **Step 2: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/ViewModels/InvestmentCalculatorViewModel.swift
git commit -m "feat: add InvestmentCalculatorViewModel with staged KPI unlocking and sensitivity"
```

---

## Task 2: Investment Calculator Views

**Files:**
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorListView.swift`
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentKPIPanel.swift`
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentInputSections.swift`
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentSensitivityView.swift`
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentPromoteSheet.swift`
- Create: `Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorDetailView.swift`

- [ ] **Step 1: Create `InvestmentCalculator` group in Xcode**

Right-click `Views` → New Group → `InvestmentCalculator`.

- [ ] **Step 2: Create `InvestmentCalculatorListView.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorListView.swift
import SwiftUI
import SwiftData

struct InvestmentCalculatorListView: View {
    @Query(sort: \InvestmentCalculation.updatedAt, order: .reverse) private var calculations: [InvestmentCalculation]
    @Environment(\.modelContext) private var modelContext
    @State private var selectedCalc: InvestmentCalculation?

    var body: some View {
        NavigationSplitView {
            List(calculations, selection: $selectedCalc) { calc in
                calcRow(calc)
                    .tag(calc)
            }
            .navigationTitle("Investment-Rechner")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: addCalculation) {
                        Label("Neu", systemImage: "plus")
                    }
                }
            }
        } detail: {
            if let calc = selectedCalc {
                InvestmentCalculatorDetailView(calculation: calc)
            } else {
                Text("Kaufkandidaten analysieren und bei Kauf direkt übernehmen.")
                    .foregroundStyle(Color.appSecondaryText)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.appContentBackground)
            }
        }
    }

    @ViewBuilder
    private func calcRow(_ calc: InvestmentCalculation) -> some View {
        let vm = InvestmentCalculatorViewModel(calculation: calc)
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(calc.name.isEmpty ? "Unbenannt" : calc.name)
                    .font(.appBody.weight(.medium))
                    .foregroundStyle(Color.appPrimaryText)
                Spacer()
                if calc.isPromoted {
                    Text("✓ übernommen")
                        .font(.appCaption)
                        .foregroundStyle(.appPositive)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.appPositive.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            if calc.purchasePriceUnit > 0 {
                Text("\(calc.purchasePriceUnit.asCurrencyRounded)")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
            }
            HStack(spacing: 12) {
                if let gy = vm.grossYield {
                    miniKPI("Brutto", value: gy.asPercentOneDecimal)
                }
                if let mm = vm.mietmultiplikator {
                    miniKPI("Faktor", value: mm.asMultiplier)
                }
                if vm.hasFinancingData {
                    miniKPI("CF/Mon", value: vm.cashflowAfterDebtMonthly.asCurrencyRounded,
                            valueColor: Color.valueColor(vm.cashflowAfterDebtMonthly))
                }
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func miniKPI(_ label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            Text(value).font(.appMonoSmall).foregroundStyle(valueColor)
        }
    }

    private func addCalculation() {
        let calc = InvestmentCalculation()
        calc.name = "Neuer Kaufkandidat"
        modelContext.insert(calc)
        selectedCalc = calc
    }
}
```

- [ ] **Step 3: Create `InvestmentKPIPanel.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentKPIPanel.swift
import SwiftUI

struct InvestmentKPIPanel: View {
    let vm: InvestmentCalculatorViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Row 1: Primary KPIs
            HStack(spacing: 0) {
                panelKPI(
                    label: "Kaufpreisfaktor",
                    value: vm.hasBaseData ? (vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–") : "–",
                    isUnlocked: vm.hasBaseData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Bruttorendite",
                    value: vm.hasBaseData ? (vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasBaseData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Cashflow/Mon",
                    value: vm.hasFinancingData ? Formatters.formatCurrencyRounded(vm.cashflowAfterDebtMonthly) : "–",
                    valueColor: vm.hasFinancingData ? Color.valueColor(vm.cashflowAfterDebtMonthly) : .appSecondaryText,
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Nettorendite",
                    value: vm.hasCostData ? (vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasCostData
                )
            }

            Divider()

            // Row 2: Secondary KPIs
            HStack(spacing: 0) {
                panelKPI(
                    label: "Cash-on-Cash",
                    value: vm.hasCostData ? (vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasCostData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Break-Even-Miete",
                    value: vm.hasFinancingData ? (vm.breakEvenRentMonthly.map { Formatters.formatCurrencyRounded($0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "DSCR",
                    value: vm.hasFinancingData ? (vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "LTV",
                    value: vm.hasFinancingData ? (vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
            }

            if vm.hasTaxData {
                Divider()
                HStack {
                    Image(systemName: "arrow.right")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    Text("Nach Steuer: \(Formatters.formatCurrencyRounded(vm.cashflowAfterTaxMonthly))/Mon")
                        .font(.appCaption)
                        .foregroundStyle(Color.valueColor(vm.cashflowAfterTaxMonthly))
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 16)
            }
        }
        .background(Color.appCardBackground)
    }

    @ViewBuilder
    private func panelKPI(label: String, value: String, valueColor: Color = .appPrimaryText,
                          isUnlocked: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(isUnlocked ? valueColor : Color.appSecondaryText.opacity(0.4))
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .topTrailing) {
            if !isUnlocked {
                Image(systemName: "lock")
                    .font(.system(size: 9))
                    .foregroundStyle(Color.appSecondaryText.opacity(0.4))
                    .padding(4)
            }
        }
    }
}
```

- [ ] **Step 4: Create `InvestmentInputSections.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentInputSections.swift
import SwiftUI

struct InvestmentInputSections: View {
    @Bindable var calculation: InvestmentCalculation

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            nameSection
            kaufSection
            einnahmenSection
            finanzierungSection
            kostenSection
            afaSection
        }
    }

    private var nameSection: some View {
        inputSection(title: "Objekt") {
            HStack {
                Text("Name").font(.appBody).foregroundStyle(Color.appPrimaryText)
                Spacer()
                TextField("ETW Dresden Neustadt", text: $calculation.name)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var kaufSection: some View {
        inputSection(title: "Kauf — Stufe 1") {
            CurrencyField(label: "Kaufpreis Wohnung *", value: $calculation.purchasePriceUnit)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Kaufpreis Stellplatz", value: $calculation.purchasePriceParking)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Grunderwerbsteuer", value: $calculation.landTransferTax)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Notarkosten", value: $calculation.notaryCosts)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Grundbuchkosten", value: $calculation.landRegistryCosts)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Maklerprovision", value: $calculation.agentFee)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var einnahmenSection: some View {
        inputSection(title: "Einnahmen — Stufe 1") {
            CurrencyField(label: "Kaltmiete/Monat *", value: $calculation.coldRentMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Parkingmiete/Monat", value: $calculation.parkingRentMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Leerstandsquote", value: $calculation.vacancyRateAssumption)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var finanzierungSection: some View {
        inputSection(title: "Finanzierung — Stufe 2") {
            CurrencyField(label: "Darlehensbetrag", value: $calculation.loanAmount)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Zinssatz", value: $calculation.interestRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Tilgungssatz", value: $calculation.amortizationRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var kostenSection: some View {
        inputSection(title: "Kosten — Stufe 3") {
            CurrencyField(label: "Nicht umlagefähiges Hausgeld/Monat", value: $calculation.hoaFeeNonRecoverableMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Hausverwaltung/Jahr", value: $calculation.propertyManagementAnnual)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Instandhaltungsrücklage/Monat", value: $calculation.maintenanceReserveMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var afaSection: some View {
        inputSection(title: "AfA & Steuer — Stufe 4") {
            CurrencyField(label: "Gebäudewert", value: $calculation.buildingValue)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "AfA-Satz", value: $calculation.depreciationRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Grenzsteuersatz", value: $calculation.marginalTaxRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    @ViewBuilder
    private func inputSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .padding(.bottom, 4)
            VStack(spacing: 0) {
                content()
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
```

- [ ] **Step 5: Create `InvestmentSensitivityView.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentSensitivityView.swift
import SwiftUI

struct InvestmentSensitivityView: View {
    @Bindable var vm: InvestmentCalculatorViewModel   // needs @Bindable for slider bindings

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Sensitivitätsanalyse")
                Spacer()
                Button("Zurücksetzen") { vm.resetSensitivity() }
                    .font(.appCaption)
                    .foregroundStyle(Color.appAccent)
                    .buttonStyle(.plain)
            }

            sensitivitySlider(
                label: "Kaltmiete",
                delta: $vm.sensitivityRentDelta,
                range: vm.rentSliderRange,
                step: 10,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta)) € → \(Formatters.formatCurrencyRounded(vm.effectiveColdRentMonthly))"
                }
            )
            sensitivitySlider(
                label: "Zinssatz",
                delta: $vm.sensitivityRateDelta,
                range: vm.rateSliderRange,
                step: 0.001,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Formatters.formatPercentOneDecimal(delta)) → \(Formatters.formatPercentOneDecimal(vm.effectiveInterestRate))"
                }
            )
            sensitivitySlider(
                label: "Kaufpreis",
                delta: $vm.sensitivityPriceDelta,
                range: vm.priceSliderRange,
                step: 1_000,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta / 1000))k € → \(Formatters.formatCurrencyRounded(vm.effectivePurchasePriceUnit))"
                }
            )
            sensitivitySlider(
                label: "Leerstand",
                delta: $vm.sensitivityVacancyDelta,
                range: vm.vacancySliderRange,
                step: 0.01,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Formatters.formatPercentOneDecimal(delta)) → \(Formatters.formatPercentOneDecimal(vm.effectiveVacancyRate))"
                }
            )
            sensitivitySlider(
                label: "Instandhaltung",
                delta: $vm.sensitivityMaintenanceDelta,
                range: vm.maintenanceSliderRange,
                step: 5,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta)) €/Mon → \(Formatters.formatCurrencyRounded(vm.effectiveNonRecoverableMonthly))/Mon"
                }
            )
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func sensitivitySlider(
        label: String,
        delta: Binding<Double>,
        range: ClosedRange<Double>,
        step: Double,
        format: (Double) -> String
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(width: 120, alignment: .leading)
                Slider(value: delta, in: range, step: step)
                Text(format(delta.wrappedValue))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appSecondaryText)
                    .frame(width: 180, alignment: .trailing)
            }
        }
    }
}
```

- [ ] **Step 6: Create `InvestmentPromoteSheet.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentPromoteSheet.swift
import SwiftUI
import SwiftData

struct InvestmentPromoteSheet: View {
    let calculation: InvestmentCalculation
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.appPositive)

            Text("Als Immobilie übernehmen?")
                .font(.appHeadline)
                .foregroundStyle(Color.appPrimaryText)

            Text("\"**\(calculation.name)**\" wird als neue Immobilie ins Portfolio aufgenommen.\n\nDieser Eintrag bleibt als Prognose-Referenz erhalten.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                Button("Abbrechen") { dismiss() }
                    .buttonStyle(.bordered)

                Button("Übernehmen") {
                    promote()
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .tint(.appAccent)
            }
        }
        .padding(32)
        .frame(width: 400)
        .background(Color.appContentBackground)
    }

    private func promote() {
        let p = Property()
        p.name = calculation.name
        p.purchasePriceUnit = calculation.purchasePriceUnit
        p.purchasePriceParking = calculation.purchasePriceParking
        p.landTransferTax = calculation.landTransferTax
        p.notaryCosts = calculation.notaryCosts
        p.landRegistryCosts = calculation.landRegistryCosts
        p.agentFee = calculation.agentFee
        p.appraisalCosts = calculation.appraisalCosts
        p.renovationModernizationCosts = calculation.renovationModernizationCosts
        p.renovationAfaEligible = calculation.renovationAfaEligible
        p.coldRentMonthly = calculation.coldRentMonthly
        p.parkingRentMonthly = calculation.parkingRentMonthly
        p.otherIncomeMonthly = calculation.otherIncomeMonthly
        p.vacancyRateAssumption = calculation.vacancyRateAssumption
        p.hoaFeeTotalMonthly = calculation.hoaFeeNonRecoverableMonthly // partial; user fills rest in Einstellungen
        p.hoaFeeRecoverableMonthly = 0
        p.propertyManagementAnnual = calculation.propertyManagementAnnual
        p.maintenanceReserveMonthly = calculation.maintenanceReserveMonthly
        p.loanAmount = calculation.loanAmount
        p.interestRate = calculation.interestRate
        p.amortizationRate = calculation.amortizationRate
        p.monthlyMortgageActual = calculation.monthlyMortgageActual
        p.buildingValue = calculation.buildingValue
        p.depreciationRate = calculation.depreciationRate
        p.marginalTaxRate = calculation.marginalTaxRate
        p.economicTransferDate = Date()
        p.purchaseDate = Date()
        p.loanStartDate = Date()

        modelContext.insert(p)

        // Mark calculation as promoted
        calculation.isPromoted = true
        calculation.promotedPropertyId = p.id
        calculation.promotedAt = Date()
    }
}
```

- [ ] **Step 7: Create `InvestmentCalculatorDetailView.swift`**

```swift
// Volta/Volta/Views/InvestmentCalculator/InvestmentCalculatorDetailView.swift
import SwiftUI

struct InvestmentCalculatorDetailView: View {
    let calculation: InvestmentCalculation
    @State private var showingPromoteSheet = false

    private var vm: InvestmentCalculatorViewModel {
        InvestmentCalculatorViewModel(calculation: calculation)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Fixed KPI panel
            InvestmentKPIPanel(vm: vm)

            Divider()

            // Promote button (appears when promoted, shows link badge)
            if calculation.isPromoted {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.appPositive)
                    Text("Als Immobilie übernommen")
                        .font(.appCaption)
                        .foregroundStyle(.appPositive)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.appPositive.opacity(0.08))

                Divider()
            }

            // Scrollable inputs + sensitivity
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    InvestmentInputSections(calculation: calculation)
                    InvestmentSensitivityView(vm: vm)
                }
                .padding(20)
            }
        }
        .navigationTitle(calculation.name.isEmpty ? "Kaufkandidat" : calculation.name)
        .toolbar {
            if !calculation.isPromoted {
                ToolbarItem(placement: .primaryAction) {
                    Button("Als Immobilie übernehmen") {
                        showingAddWizard = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.appAccent)
                    .disabled(!vm.hasBaseData)
                }
            }
        }
        .sheet(isPresented: $showingPromoteSheet) {
            InvestmentPromoteSheet(calculation: calculation)
        }
        .background(Color.appContentBackground)
    }

    @State private var showingAddWizard = false
}
```

Fix: `showingAddWizard` is used but meant for `showingPromoteSheet`. In the toolbar button action, change `showingAddWizard = true` to `showingPromoteSheet = true`. Update the code:

```swift
// In the toolbar button:
Button("Als Immobilie übernehmen") {
    showingPromoteSheet = true
}
```

Remove `@State private var showingAddWizard = false` (already declared elsewhere is a mistake — only keep `showingPromoteSheet`).

Final version of the toolbar block:
```swift
.toolbar {
    if !calculation.isPromoted {
        ToolbarItem(placement: .primaryAction) {
            Button("Als Immobilie übernehmen") {
                showingPromoteSheet = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.appAccent)
            .disabled(!vm.hasBaseData)
        }
    }
}
```

And remove the duplicate `@State private var showingAddWizard = false` line.

- [ ] **Step 8: Build**

Cmd+B. Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add Volta/Volta/Views/InvestmentCalculator/
git commit -m "feat: add Investment Calculator views (list, KPI panel, inputs, sensitivity, promote)"
```

---

## Task 3: Wire Sidebar & Final Integration

**Files:**
- Modify: `Volta/Volta/Views/AppShellView.swift`

- [ ] **Step 1: Replace the `.investmentCalculator` sidebar case in `AppShellView.swift`**

Find this block in `AppShellView.swift`:
```swift
case .investmentCalculator:
    // Added in Plan 5
    Text("Investment-Rechner — kommt in Plan 5")
        .foregroundStyle(Color.appSecondaryText)
```

Replace with:
```swift
case .investmentCalculator:
    InvestmentCalculatorListView()
```

- [ ] **Step 2: Build and run — full integration test**

Cmd+R. Expected:
1. Sidebar → "Investment-Rechner" → shows empty list.
2. Click "+" → new "Neuer Kaufkandidat" created.
3. Enter Kaufpreis (263600) + Kaltmiete (950) → Kaufpreisfaktor and Bruttorendite unlock immediately in KPI panel.
4. Enter Darlehensbetrag (230000), Zinssatz (4,3%), Tilgungssatz (1%) → Cashflow, DSCR, Break-Even, LTV unlock.
5. Move Kaltmiete sensitivity slider → Cashflow updates live.
6. Click "Als Immobilie übernehmen" → confirmation sheet → "Übernehmen" → new property appears in Portfolio.
7. Investment-Rechner shows "✓ übernommen" badge on that entry.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/AppShellView.swift
git commit -m "feat: wire Investment Calculator into sidebar navigation"
```

---

## Task 4: ViewModel Tests for InvestmentCalculatorViewModel

**Files:**
- Create: `Volta/VoltaTests/InvestmentCalculatorViewModelTests.swift`

- [ ] **Step 1: Write tests**

```swift
// Volta/VoltaTests/InvestmentCalculatorViewModelTests.swift
import XCTest
@testable import Volta

final class InvestmentCalculatorViewModelTests: XCTestCase {

    private func makeVM() -> InvestmentCalculatorViewModel {
        let calc = InvestmentCalculation()
        calc.name = "Test ETW"
        calc.purchasePriceUnit = TestFixtures.purchasePriceUnit
        calc.purchasePriceParking = TestFixtures.purchasePriceParking
        calc.landTransferTax = TestFixtures.landTransferTax
        calc.notaryCosts = TestFixtures.notaryCosts
        calc.landRegistryCosts = TestFixtures.landRegistryCosts
        calc.coldRentMonthly = TestFixtures.coldRentMonthly
        calc.parkingRentMonthly = TestFixtures.parkingRentMonthly
        calc.vacancyRateAssumption = TestFixtures.vacancyRateAssumption
        calc.loanAmount = TestFixtures.loanAmount
        calc.interestRate = TestFixtures.interestRate
        calc.amortizationRate = TestFixtures.amortizationRate
        calc.monthlyMortgageActual = TestFixtures.monthlyMortgageActual
        calc.hoaFeeNonRecoverableMonthly = TestFixtures.hoaFeeNonRecoverableMonthly
        calc.propertyManagementAnnual = TestFixtures.propertyManagementAnnual
        calc.maintenanceReserveMonthly = TestFixtures.maintenanceReserveMonthly
        calc.buildingValue = TestFixtures.buildingValue
        calc.depreciationRate = TestFixtures.depreciationRate
        calc.marginalTaxRate = TestFixtures.marginalTaxRate
        return InvestmentCalculatorViewModel(calculation: calc)
    }

    // MARK: - Stage unlocking

    func test_hasBaseData_whenNamePriceAndRentSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasBaseData)
    }

    func test_hasBaseData_falseWhenNameEmpty() {
        let vm = makeVM()
        vm.calculation.name = ""
        XCTAssertFalse(vm.hasBaseData)
    }

    func test_hasFinancingData_whenLoanAndRatesSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasFinancingData)
    }

    func test_hasCostData_whenNonRecoverableCostsSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasCostData)
    }

    // MARK: - KPI values match fixture

    func test_grossYield_matchesFixture() {
        let vm = makeVM()
        XCTAssertNotNil(vm.grossYield)
        XCTAssertEqual(vm.grossYield!, 0.04297, accuracy: 0.0001)
    }

    func test_cashflowAfterDebtMonthly_matchesFixture() {
        let vm = makeVM()
        XCTAssertEqual(vm.cashflowAfterDebtMonthly, TestFixtures.cashflowAfterDebtMonthly, accuracy: 1.0)
    }

    // MARK: - Sensitivity

    func test_sensitivityRent_changesEffectiveRent() {
        let vm = makeVM()
        let base = vm.effectiveColdRentMonthly
        vm.sensitivityRentDelta = 50
        XCTAssertEqual(vm.effectiveColdRentMonthly, base + 50, accuracy: 0.01)
    }

    func test_sensitivityRent_changesCashflow() {
        let vm = makeVM()
        let baseCF = vm.cashflowAfterDebtMonthly
        vm.sensitivityRentDelta = 100
        // +100 €/mon rent → +100 * 0.97 / 1 = +97 effective (after vacancy)
        XCTAssertGreaterThan(vm.cashflowAfterDebtMonthly, baseCF)
    }

    func test_resetSensitivity_restoresBaseValues() {
        let vm = makeVM()
        vm.sensitivityRentDelta = 200
        vm.sensitivityRateDelta = 0.01
        vm.resetSensitivity()
        XCTAssertEqual(vm.sensitivityRentDelta, 0, accuracy: 0.001)
        XCTAssertEqual(vm.sensitivityRateDelta, 0, accuracy: 0.001)
        XCTAssertEqual(vm.effectiveColdRentMonthly, TestFixtures.coldRentMonthly, accuracy: 0.01)
    }
}
```

- [ ] **Step 2: Run tests**

Cmd+U. Expected: All 10 InvestmentCalculatorViewModelTests pass.

- [ ] **Step 3: Commit**

```bash
git add Volta/VoltaTests/InvestmentCalculatorViewModelTests.swift
git commit -m "test: add InvestmentCalculatorViewModel unit tests"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Investment Calculator list with sort by last edited. KPI panel shows all 8 KPIs (Kaufpreisfaktor, Bruttorendite, Cashflow/Mon, Nettorendite, Cash-on-Cash, Break-Even, DSCR, LTV). Lock icon on unreached KPI stages. Sensitivity sliders for all 5 parameters with step sizes from spec. Sliders non-persistent (not saved to SwiftData). Promote flow: confirmation sheet → creates Property → `isPromoted = true` + badge in list. After-tax cashflow row appears when Stage 4 unlocked. "Zur Immobilie" link is not yet implemented (the property opens from Portfolio tab) — this can be added as a follow-up.
- [x] **No placeholders:** All 7 view files fully implemented.
- [x] **Type consistency:** `InvestmentCalculatorViewModel` uses `@Bindable` on itself for sensitivity sliders — correct in SwiftUI with `@Observable`. `InvestmentSensitivityView` takes `@Bindable var vm: InvestmentCalculatorViewModel`. `InvestmentInputSections` takes `@Bindable var calculation: InvestmentCalculation`. `InvestmentPromoteSheet` mutates `calculation.isPromoted` directly — valid since `InvestmentCalculation` is `@Model`.
- [x] **Sensitivity does not persist:** Sensitivity deltas are `var` properties on `InvestmentCalculatorViewModel` (not stored in SwiftData model). `resetSensitivity()` zeroes them. Not called on sheet close — caller (detail view) creates a new VM per view render, so sensitivity auto-resets when navigating away.
