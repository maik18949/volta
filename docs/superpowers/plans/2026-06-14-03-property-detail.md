# Immobilien Portfolio Manager — Plan 3: Property Detail Views

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five-tab property detail view (Übersicht, Cashflow, Steuer, Finanzierung, Einstellungen) so users can see all KPIs and edit a property's master data.

**Architecture:** `PropertyDetailView` is a `TabView` container. Each tab is its own `View` file that receives a `PropertyViewModel` and, where editing is needed, the raw `Property` model directly. Charts use Swift Charts. The Finanzierung tab renders the full amortization table plus an LTV-over-time line chart.

**Tech Stack:** SwiftUI, Swift Charts, SwiftData (direct model mutation in Einstellungen tab)

**Depends on:** Plan 1 (calculations), Plan 2 (PropertyViewModel, components, design tokens)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Volta/Volta/Views/Property/PropertyDetailView.swift` | Create | TabView container, property header |
| `Volta/Volta/Views/Property/OverviewTab.swift` | Create | Static KPIs + property info |
| `Volta/Volta/Views/Property/CashflowTab.swift` | Create | Soll/Ist side-by-side + status history |
| `Volta/Volta/Views/Property/TaxTab.swift` | Create | AfA-Basis, V+V-Ergebnis, Steuereffekt |
| `Volta/Volta/Views/Property/FinancingTab.swift` | Create | Tilgungsplan table + LTV chart |
| `Volta/Volta/Views/Property/SettingsTab.swift` | Create | Edit all property fields |
| `Volta/Volta/Views/Portfolio/PortfolioView.swift` | Modify | Wire tap on PropertyCard → PropertyDetailView |

---

## Task 1: PropertyDetailView Container

**Files:**
- Create: `Volta/Volta/Views/Property/PropertyDetailView.swift`

- [ ] **Step 1: Create `Views/Property` group in Xcode**

Right-click `Views` → New Group → `Property`.

- [ ] **Step 2: Create `PropertyDetailView.swift`**

```swift
// Volta/Volta/Views/Property/PropertyDetailView.swift
import SwiftUI

struct PropertyDetailView: View {
    let property: Property
    @State private var selectedTab = 0

    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    var body: some View {
        VStack(spacing: 0) {
            // Fixed header
            propertyHeader

            Divider()

            // Tab bar
            TabView(selection: $selectedTab) {
                OverviewTab(vm: vm)
                    .tabItem { Label("Übersicht", systemImage: "house") }
                    .tag(0)
                CashflowTab(vm: vm)
                    .tabItem { Label("Cashflow", systemImage: "eurosign.circle") }
                    .tag(1)
                TaxTab(vm: vm)
                    .tabItem { Label("Steuer", systemImage: "percent") }
                    .tag(2)
                FinancingTab(vm: vm)
                    .tabItem { Label("Finanzierung", systemImage: "chart.line.downtrend.xyaxis") }
                    .tag(3)
                SettingsTab(property: property)
                    .tabItem { Label("Einstellungen", systemImage: "gear") }
                    .tag(4)
            }
        }
        .navigationTitle(property.name)
        .background(Color.appContentBackground)
    }

    private var propertyHeader: some View {
        HStack(spacing: 24) {
            VStack(alignment: .leading, spacing: 4) {
                Text(property.name)
                    .font(.appHeadline)
                    .foregroundStyle(Color.appPrimaryText)
                Text("\(property.address), \(property.postalCode) \(property.city)")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
            }

            Spacer()

            // Always-visible Prognose KPIs
            headerKPI(label: "Kaufpreis", value: Formatters.formatCurrencyRounded(vm.purchasePrice))
            headerKPI(label: "Gesamtinvestment", value: Formatters.formatCurrencyRounded(vm.totalInvestment))
            headerKPI(label: "Bruttorendite", value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            headerKPI(label: "Nettorendite", value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            headerKPI(label: "LTV", value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                      valueColor: vm.ltvRatio.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText)

            if let status = vm.currentStatus {
                StatusBadge(status: status.status)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(Color.appCardBackground)
    }

    @ViewBuilder
    private func headerKPI(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
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

- [ ] **Step 3: Wire navigation in `PortfolioView.swift`**

In `PortfolioView.swift`, add a `NavigationLink` or `.navigationDestination` so tapping a card opens `PropertyDetailView`. Replace the `PropertyCard(...).onTapGesture` block with:

```swift
NavigationLink(destination: PropertyDetailView(property: property)) {
    PropertyCard(vm: vm)
}
.buttonStyle(.plain)
```

Also remove the `@State private var selectedProperty: Property?` and its `.overlay` since selection is now handled by NavigationLink.

- [ ] **Step 4: Build (stubs needed)**

`PropertyDetailView` references `OverviewTab`, `CashflowTab`, `TaxTab`, `FinancingTab`, `SettingsTab` which don't exist yet. Add temporary stubs to each missing file so the build succeeds:

Create `Volta/Volta/Views/Property/OverviewTab.swift` with:
```swift
import SwiftUI
struct OverviewTab: View {
    let vm: PropertyViewModel
    var body: some View { Text("Übersicht — folgt") }
}
```

Repeat for `CashflowTab.swift`, `TaxTab.swift`, `FinancingTab.swift`, `SettingsTab.swift` (each with `let vm: PropertyViewModel` except `SettingsTab` which takes `let property: Property`):

```swift
// CashflowTab.swift
import SwiftUI
struct CashflowTab: View {
    let vm: PropertyViewModel
    var body: some View { Text("Cashflow — folgt") }
}
```
```swift
// TaxTab.swift
import SwiftUI
struct TaxTab: View {
    let vm: PropertyViewModel
    var body: some View { Text("Steuer — folgt") }
}
```
```swift
// FinancingTab.swift
import SwiftUI
struct FinancingTab: View {
    let vm: PropertyViewModel
    var body: some View { Text("Finanzierung — folgt") }
}
```
```swift
// SettingsTab.swift
import SwiftUI
struct SettingsTab: View {
    let property: Property
    var body: some View { Text("Einstellungen — folgt") }
}
```

- [ ] **Step 5: Build and run**

Cmd+B, Cmd+R. Expected: Tap ETW card in portfolio → `PropertyDetailView` opens with header KPIs and tab bar. Tabs show placeholder text.

- [ ] **Step 6: Commit**

```bash
git add Volta/Volta/Views/Property/ Volta/Volta/Views/Portfolio/PortfolioView.swift
git commit -m "feat: add PropertyDetailView container with header KPIs and tab navigation"
```

---

## Task 2: OverviewTab

**Files:**
- Modify: `Volta/Volta/Views/Property/OverviewTab.swift`

- [ ] **Step 1: Replace stub with full implementation**

```swift
// Volta/Volta/Views/Property/OverviewTab.swift
import SwiftUI

struct OverviewTab: View {
    let vm: PropertyViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                kpiSection
                objectDataSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - KPI Cards

    private var kpiSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Rendite & Ertrag")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                KPICardWithContext(
                    label: "Bruttorendite",
                    value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.grossYield.map { BenchmarkContext.grossYield($0) } ?? BenchmarkResult(rating: .neutral, context: "Kaufpreis oder Miete fehlt."),
                    width: .infinity
                )
                KPICardWithContext(
                    label: "Nettorendite",
                    value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.netYield.map { BenchmarkContext.netYield($0) } ?? BenchmarkResult(rating: .neutral, context: "Kosten oder Investment fehlt."),
                    width: .infinity
                )
                KPICardWithContext(
                    label: "Kaufpreisfaktor",
                    value: vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–",
                    benchmark: vm.mietmultiplikator.map { BenchmarkContext.mietmultiplikator($0) } ?? BenchmarkResult(rating: .neutral, context: "Miete fehlt."),
                    width: .infinity
                )
                KPICardWithContext(
                    label: "Cash-on-Cash",
                    value: vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.cashOnCashReturn.map { BenchmarkContext.cashOnCash($0) } ?? BenchmarkResult(rating: .neutral, context: "Eigenkapital fehlt."),
                    width: .infinity
                )
                KPICardWithContext(
                    label: "DSCR (NOI)",
                    value: vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–",
                    benchmark: vm.dscrNOI.map { BenchmarkContext.dscr($0) } ?? BenchmarkResult(rating: .neutral, context: "Schuldendienst fehlt."),
                    width: .infinity
                )
                KPICardWithContext(
                    label: "LTV",
                    value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.ltvRatio.map { BenchmarkContext.ltv($0) } ?? BenchmarkResult(rating: .neutral, context: "Darlehen fehlt."),
                    width: .infinity
                )
            }

            HStack(spacing: 12) {
                KPICard(label: "Break-Even-Miete", value: Formatters.formatCurrency(vm.breakEvenRentMonthly), width: 180)
                KPICard(label: "Cap Rate", value: vm.capRate.map { Formatters.formatPercentOneDecimal($0) } ?? "–", width: 150)
                KPICard(label: "NOI / Jahr", value: Formatters.formatCurrencyRounded(vm.netOperatingIncomeYearly), width: 160)
                KPICard(label: "Eigenkapital", value: Formatters.formatCurrencyRounded(vm.equityUsed), width: 160)
            }
        }
    }

    // MARK: - Objektdaten

    private var objectDataSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Objektdaten")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                infoRow(label: "Typ", value: vm.property.propertyType.rawValue)
                infoRow(label: "Baujahr", value: vm.property.yearBuilt.map { String($0) } ?? "–")
                infoRow(label: "Wohnfläche", value: "\(String(format: "%.2f", vm.property.livingAreaSqm)) m²")
                infoRow(label: "Zimmer", value: vm.property.rooms.map { String(format: "%.1f", $0) } ?? "–")
                infoRow(label: "Kaltmiete/m²", value: vm.property.livingAreaSqm > 0
                    ? Formatters.formatCurrency(vm.property.coldRentMonthly / vm.property.livingAreaSqm)
                    : "–")
                infoRow(label: "Kaufpreis/m²", value: vm.property.livingAreaSqm > 0
                    ? Formatters.formatCurrencyRounded(vm.property.purchasePriceUnit / vm.property.livingAreaSqm)
                    : "–")
                infoRow(label: "Energieklasse", value: vm.property.energyEfficiencyClass?.rawValue ?? "–")
                infoRow(label: "Zustand", value: vm.property.condition?.rawValue ?? "–")
            }

            if !vm.property.notes.isEmpty {
                Text(vm.property.notes)
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
                    .padding(.top, 4)
            }
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
        .padding(.vertical, 2)
    }
}
```

- [ ] **Step 2: Note on `KPICardWithContext` width**

The `width` parameter in `KPICardWithContext` was set to `CGFloat` in Plan 2. The grid cells handle width via `LazyVGrid`. Pass `width: 200` as a reasonable fixed width — the grid's `flexible()` columns constrain the card to available space. Update the call sites above to use a fixed value like `200` instead of `.infinity` (which is not a valid CGFloat literal):

Replace all `width: .infinity` with `width: 200` in the `KPICardWithContext` calls above.

- [ ] **Step 3: Build and run, verify OverviewTab**

Cmd+R. Tap ETW → Übersicht tab. Expected: 6 KPI cards with rating badges and context text. Objektdaten grid with property info.

- [ ] **Step 4: Commit**

```bash
git add Volta/Volta/Views/Property/OverviewTab.swift
git commit -m "feat: implement OverviewTab with KPI cards and property info"
```

---

## Task 3: CashflowTab

**Files:**
- Modify: `Volta/Volta/Views/Property/CashflowTab.swift`

- [ ] **Step 1: Replace stub**

```swift
// Volta/Volta/Views/Property/CashflowTab.swift
import SwiftUI

struct CashflowTab: View {
    let vm: PropertyViewModel
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())

    private var availableYears: [Int] {
        let start = Calendar.current.component(.year, from: vm.property.economicTransferDate)
        let current = Calendar.current.component(.year, from: Date())
        return Array(start...max(start, current))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                sollIstSection
                statusHistorySection
                extraordinaryCostsSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - Soll / Ist

    private var sollIstSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Cashflow — Soll vs. Ist")
                Spacer()
                Picker("Jahr", selection: $selectedYear) {
                    ForEach(availableYears, id: \.self) { year in
                        Text(String(year)).tag(year)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 100)
            }

            // Header row
            HStack {
                Text("Monat").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 60, alignment: .leading)
                Spacer()
                Text("Soll").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 100, alignment: .trailing)
                Text("Ist").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 100, alignment: .trailing)
                Text("Abweichung").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 80, alignment: .trailing)
            }
            .padding(.horizontal, 12)

            Divider()

            VStack(spacing: 0) {
                ForEach(1...12, id: \.self) { month in
                    let date = Date.firstDay(year: selectedYear, month: month)
                    if date.firstDayOfMonth >= vm.property.economicTransferDate.firstDayOfMonth
                        && date <= Date().firstDayOfMonth {
                        monthRow(date: date, month: month)
                        if month < 12 { Divider().padding(.leading, 12) }
                    }
                }
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func monthRow(date: Date, month: Int) -> some View {
        let monthName = DateFormatter().monthSymbols[month - 1]
        let soll = vm.cashflowAfterDebtMonthly
        let actual = vm.cashflowActual(for: date)
        let ist = actual?.afterTax
        let deviation = ist.map { $0 - soll }

        HStack {
            Text(monthName.prefix(3))
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 60, alignment: .leading)
            Spacer()
            Text(Formatters.formatCurrencyRounded(soll))
                .font(.appMono)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 100, alignment: .trailing)
            Text(ist.map { Formatters.formatCurrencyRounded($0) } ?? "–")
                .font(.appMono)
                .foregroundStyle(ist.map { Color.valueColor($0) } ?? .appSecondaryText)
                .frame(width: 100, alignment: .trailing)
            Text(deviation.map {
                ($0 >= 0 ? "+" : "") + Formatters.formatCurrencyRounded($0)
            } ?? "–")
                .font(.appMonoSmall)
                .foregroundStyle(deviation.map { Color.valueColor($0) } ?? .appSecondaryText)
                .frame(width: 80, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(month % 2 == 0 ? Color.appCardBackground : Color.appCardBackground.opacity(0.6))
    }

    // MARK: - Statushistorie

    private var statusHistorySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Statushistorie")

            if vm.property.statusHistory.isEmpty {
                Text("Noch kein Statuseintrag vorhanden.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
            } else {
                VStack(spacing: 0) {
                    ForEach(vm.property.statusHistory.sorted(by: { $0.statusFrom < $1.statusFrom })) { entry in
                        HStack {
                            StatusBadge(status: entry.status)
                            Text("ab \(entry.statusFrom, format: .dateTime.month().year())")
                                .font(.appCaption)
                                .foregroundStyle(Color.appSecondaryText)
                            Spacer()
                            Text(Formatters.formatCurrency(entry.incomeActualMonthly) + "/Mon")
                                .font(.appMono)
                                .foregroundStyle(Color.appPrimaryText)
                            if let notes = entry.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.appCaption)
                                    .foregroundStyle(Color.appSecondaryText)
                                    .lineLimit(1)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        Divider().padding(.leading, 12)
                    }
                }
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Außerordentliche Kosten

    private var extraordinaryCostsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Außerordentliche Kosten")

            if vm.property.extraordinaryCosts.isEmpty {
                Text("Keine außerordentlichen Kosten erfasst.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
            } else {
                VStack(spacing: 0) {
                    ForEach(vm.property.extraordinaryCosts.sorted(by: { $0.costMonth < $1.costMonth })) { cost in
                        HStack {
                            Text(cost.costMonth, format: .dateTime.month().year())
                                .font(.appCaption)
                                .foregroundStyle(Color.appSecondaryText)
                                .frame(width: 80, alignment: .leading)
                            Text(cost.category.rawValue)
                                .font(.appBody)
                                .foregroundStyle(Color.appPrimaryText)
                            if let desc = cost.descriptionText, !desc.isEmpty {
                                Text("— \(desc)")
                                    .font(.appCaption)
                                    .foregroundStyle(Color.appSecondaryText)
                                    .lineLimit(1)
                            }
                            Spacer()
                            Text(Formatters.formatCurrency(cost.amount))
                                .font(.appMono)
                                .foregroundStyle(.appNegative)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        Divider().padding(.leading, 12)
                    }
                }
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }
}
```

- [ ] **Step 2: Build and verify**

Cmd+R. Tap ETW → Cashflow tab. Expected: Year picker shows 2026. Month rows show Soll/Ist side by side for months since Feb 2026. Statushistorie shows "Leerstand + Mietgarantie ab Feb. 2026 · 998,00 €/Mon".

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Property/CashflowTab.swift
git commit -m "feat: implement CashflowTab with Soll/Ist table and status history"
```

---

## Task 4: TaxTab

**Files:**
- Modify: `Volta/Volta/Views/Property/TaxTab.swift`

- [ ] **Step 1: Replace stub**

```swift
// Volta/Volta/Views/Property/TaxTab.swift
import SwiftUI

struct TaxTab: View {
    let vm: PropertyViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                afaSection
                vvSection
                taxEffectSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - AfA

    private var afaSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "AfA — Absetzung für Abnutzung")

            VStack(spacing: 0) {
                taxRow(label: "Gebäudewert (Sachwertverfahren)",
                       value: Formatters.formatCurrency(vm.property.buildingValue))
                taxRow(label: "Grundstückswert",
                       value: Formatters.formatCurrency(vm.property.landValue))
                taxRow(label: "Gebäudeanteil am Kaufpreis",
                       value: vm.purchasePrice > 0
                           ? Formatters.formatPercentOneDecimal(vm.property.buildingValue / vm.purchasePrice)
                           : "–")
                taxRow(label: "Kaufnebenkosten (Gebäudeanteil)",
                       value: Formatters.formatCurrency(
                           vm.closingCostsTotal * (vm.purchasePrice > 0 ? vm.property.buildingValue / vm.purchasePrice : 0)
                       ))
                taxRow(label: "Aktivierungspflichtige Renovierung",
                       value: Formatters.formatCurrency(vm.property.renovationAfaEligible))
                Divider().padding(.leading, 12)
                taxRow(label: "AfA-Basis", value: Formatters.formatCurrency(vm.afaBasis), isBold: true)
                taxRow(label: "AfA-Satz", value: Formatters.formatPercentOneDecimal(vm.property.depreciationRate))
                taxRow(label: "AfA jährlich", value: Formatters.formatCurrency(vm.depreciationYearly), isBold: true)
                taxRow(label: "AfA monatlich", value: Formatters.formatCurrency(vm.depreciationMonthly))
                taxRow(label: "AfA im Erwerbsjahr (anteilig)",
                       value: Formatters.formatCurrency(
                           DepreciationCalculator.depreciationProratedInAcquisitionYear(
                               afaBasis: vm.afaBasis,
                               rate: vm.property.depreciationRate,
                               economicTransferDate: vm.property.economicTransferDate
                           )
                       ))
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - V+V Ergebnis

    private var vvSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Einkünfte aus Vermietung & Verpachtung (Prognose)")

            VStack(spacing: 0) {
                taxRow(label: "Effektive Mieteinnahmen (nach Leerstand)",
                       value: Formatters.formatCurrency(vm.effectiveGrossIncomeYearly))
                taxRow(label: "− Nicht umlagefähige Kosten",
                       value: "−" + Formatters.formatCurrency(vm.operatingCostsNonRecoverableYearly),
                       valueColor: .appNegative)
                taxRow(label: "− Zinsen",
                       value: "−" + Formatters.formatCurrency(vm.interestAnnual),
                       valueColor: .appNegative)
                taxRow(label: "− AfA",
                       value: "−" + Formatters.formatCurrency(vm.depreciationYearly),
                       valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "V+V-Ergebnis (zu versteuern)",
                       value: Formatters.formatCurrency(vm.taxableIncomeVV),
                       valueColor: Color.valueColor(-vm.taxableIncomeVV),   // negative is good
                       isBold: true)
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Steuereffekt

    private var taxEffectSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Steuereffekt")

            VStack(spacing: 0) {
                taxRow(label: "Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "Steuereffekt jährlich",
                       value: Formatters.formatCurrency(
                           TaxCalculator.taxEffectYearly(
                               taxableIncomeVV: vm.taxableIncomeVV,
                               marginalTaxRate: vm.property.marginalTaxRate
                           )
                       ),
                       valueColor: vm.taxableIncomeVV < 0 ? .appPositive : .appNegative,
                       isBold: true)
                taxRow(label: "Steuereffekt monatlich (im Cashflow)",
                       value: Formatters.formatCurrency(vm.taxEffectMonthly),
                       valueColor: vm.taxableIncomeVV < 0 ? .appPositive : .appNegative)
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            if vm.property.marginalTaxRate == 0 {
                Text("⚠️ Grenzsteuersatz ist 0% — Steuereffekt wird nicht berechnet. Wert in Einstellungen setzen.")
                    .font(.appCaption)
                    .foregroundStyle(Color(hex: "#D97706"))
            }
        }
    }

    @ViewBuilder
    private func taxRow(label: String, value: String,
                        valueColor: Color = .appPrimaryText, isBold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(isBold ? .appBody.weight(.semibold) : .appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(value)
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(valueColor)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
```

- [ ] **Step 2: Build and verify**

Cmd+R. Steuer tab shows AfA-Basis (244.477,97 €), AfA jährlich (9.387,95 €), V+V-Ergebnis (−9.974,35 €), Steuereffekt monatlich (+349,10 €).

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Property/TaxTab.swift
git commit -m "feat: implement TaxTab with AfA calculation and V+V tax breakdown"
```

---

## Task 5: FinancingTab

**Files:**
- Modify: `Volta/Volta/Views/Property/FinancingTab.swift`

- [ ] **Step 1: Replace stub**

```swift
// Volta/Volta/Views/Property/FinancingTab.swift
import SwiftUI
import Charts

struct FinancingTab: View {
    let vm: PropertyViewModel

    private var schedule: [AmortizationCalculator.AnnuityRow] {
        let months = vm.property.fixedInterestPeriodYears * 12
        return AmortizationCalculator.amortizationSchedule(
            loanAmount: vm.property.loanAmount,
            interestRate: vm.property.interestRate,
            monthlyPayment: vm.monthlyMortgage,
            loanStartDate: vm.property.loanStartDate,
            months: months
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                summarySection
                ltvChartSection
                scheduleSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - Zusammenfassung

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Finanzierungsübersicht")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                KPICard(label: "Darlehensbetrag", value: Formatters.formatCurrencyRounded(vm.property.loanAmount), width: 160)
                KPICard(label: "Zinssatz", value: Formatters.formatPercentOneDecimal(vm.property.interestRate), width: 140)
                KPICard(label: "Tilgungssatz", value: Formatters.formatPercentOneDecimal(vm.property.amortizationRate), width: 140)
                KPICard(label: "Monatliche Rate", value: Formatters.formatCurrency(vm.monthlyMortgage), width: 160)
                KPICard(label: "Zinsen / Jahr", value: Formatters.formatCurrencyRounded(vm.interestAnnual), width: 160)
                KPICard(label: "Zinsbindungsende",
                        value: Calendar.current.date(
                            byAdding: .year, value: vm.property.fixedInterestPeriodYears,
                            to: vm.property.loanStartDate
                        ).map { $0.formatted(.dateTime.month().year()) } ?? "–",
                        width: 160)
                KPICard(label: "Aktuelle Restschuld", value: Formatters.formatCurrencyRounded(vm.remainingDebtNow), width: 170)
                KPICard(label: "LTV aktuell",
                        value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        valueColor: vm.ltvRatio.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText,
                        width: 140)
                KPICard(label: "Eigenkapital", value: Formatters.formatCurrencyRounded(vm.equityUsed), width: 150)
            }
        }
    }

    // MARK: - LTV-Kurve

    private var ltvChartSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "LTV-Kurve über Zinsbindungsperiode")

            Chart {
                ForEach(schedule) { row in
                    LineMark(
                        x: .value("Monat", row.date),
                        y: .value("LTV %", (row.remainingDebt / vm.totalInvestment) * 100)
                    )
                    .foregroundStyle(Color.appAccent)
                }

                // Reference line at 60% (Pfandbrief-Grenze)
                RuleMark(y: .value("Pfandbrief-Grenze", 60))
                    .foregroundStyle(Color.appPositive.opacity(0.6))
                    .lineStyle(StrokeStyle(dash: [4, 4]))
                    .annotation(position: .trailing) {
                        Text("60% — Pfandbrief")
                            .font(.appCaption)
                            .foregroundStyle(Color.appPositive)
                    }
            }
            .frame(height: 200)
            .padding(12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Tilgungsplan

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Tilgungsplan (\(vm.property.fixedInterestPeriodYears) Jahre)")

            VStack(spacing: 0) {
                // Table header
                HStack {
                    Text("Datum").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 80, alignment: .leading)
                    Spacer()
                    Text("Zinsen").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
                    Text("Tilgung").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
                    Text("Rate").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
                    Text("Restschuld").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 110, alignment: .trailing)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)

                Divider()

                // Only show annual snapshots (every 12th row)
                ForEach(schedule.filter { $0.id % 12 == 0 }) { row in
                    HStack {
                        Text(row.date, format: .dateTime.month().year())
                            .font(.appCaption)
                            .foregroundStyle(Color.appSecondaryText)
                            .frame(width: 80, alignment: .leading)
                        Spacer()
                        Text(Formatters.formatCurrencyRounded(row.interest))
                            .font(.appMonoSmall)
                            .foregroundStyle(.appNegative)
                            .frame(width: 90, alignment: .trailing)
                        Text(Formatters.formatCurrencyRounded(row.principal))
                            .font(.appMonoSmall)
                            .foregroundStyle(.appPositive)
                            .frame(width: 90, alignment: .trailing)
                        Text(Formatters.formatCurrencyRounded(row.payment))
                            .font(.appMonoSmall)
                            .foregroundStyle(Color.appPrimaryText)
                            .frame(width: 90, alignment: .trailing)
                        Text(Formatters.formatCurrencyRounded(row.remainingDebt))
                            .font(.appMonoSmall)
                            .foregroundStyle(Color.appPrimaryText)
                            .frame(width: 110, alignment: .trailing)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(row.id % 24 == 0 ? Color.appCardBackground : Color.appCardBackground.opacity(0.6))
                }
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
```

- [ ] **Step 2: Build and verify**

Cmd+R. Finanzierung tab shows: 9 KPI cards, LTV line chart over 10-year period declining from ~76% with 60% reference line, annual snapshot amortization table.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Property/FinancingTab.swift
git commit -m "feat: implement FinancingTab with LTV chart and amortization table"
```

---

## Task 6: SettingsTab

**Files:**
- Modify: `Volta/Volta/Views/Property/SettingsTab.swift`

- [ ] **Step 1: Replace stub**

```swift
// Volta/Volta/Views/Property/SettingsTab.swift
import SwiftUI
import SwiftData

struct SettingsTab: View {
    @Bindable var property: Property
    @Environment(\.modelContext) private var modelContext

    // Validation warnings (non-blocking)
    private var landPlusBuildingDeviation: Double? {
        let sum = property.landValue + property.buildingValue
        let price = property.purchasePriceUnit + property.purchasePriceParking
        guard price > 0 else { return nil }
        return abs(sum - price) / price
    }

    private var showLandBuildingWarning: Bool {
        (landPlusBuildingDeviation ?? 0) > 0.05
    }

    private var showHighLTVWarning: Bool {
        property.loanAmount > (property.purchasePriceUnit + property.purchasePriceParking)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                stammdatenSection
                kaufSection
                einnahmenSection
                kostenSection
                finanzierungSection
                afaSection
                warningsSection
                deleteSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
        .onChange(of: property.name) { _, _ in property.updatedAt = Date() }
    }

    // MARK: - Stammdaten

    private var stammdatenSection: some View {
        formSection(title: "Stammdaten") {
            labeledField("Name *") {
                TextField("ETW Dresden Neustadt", text: $property.name)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            labeledField("Adresse *") {
                TextField("Musterstraße 1", text: $property.address)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            labeledField("Stadt *") {
                TextField("Dresden", text: $property.city)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 200)
            }
            labeledField("PLZ *") {
                TextField("01097", text: $property.postalCode)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 80)
            }
            labeledField("Bundesland") {
                TextField("Sachsen", text: $property.state)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 200)
            }
            labeledField("Typ") {
                Picker("", selection: $property.propertyType) {
                    ForEach(PropertyType.allCases, id: \.self) { t in Text(t.rawValue).tag(t) }
                }.frame(width: 200)
            }
        }
    }

    // MARK: - Kauf

    private var kaufSection: some View {
        formSection(title: "Kauf & Nebenkosten") {
            CurrencyField(label: "Kaufpreis Wohnung *", value: $property.purchasePriceUnit, isRequired: true)
            CurrencyField(label: "Kaufpreis Stellplatz", value: $property.purchasePriceParking)
            CurrencyField(label: "Grunderwerbsteuer", value: $property.landTransferTax)
            CurrencyField(label: "Notarkosten", value: $property.notaryCosts)
            CurrencyField(label: "Grundbuchkosten", value: $property.landRegistryCosts)
            CurrencyField(label: "Maklerprovision", value: $property.agentFee)
            CurrencyField(label: "Gutachterkosten", value: $property.appraisalCosts)
            CurrencyField(label: "Renovierung gesamt", value: $property.renovationModernizationCosts)
            CurrencyField(label: "davon aktivierungspflichtig", value: $property.renovationAfaEligible)
            labeledField("Wirtschaftlicher Übergang *") {
                DatePicker("", selection: $property.economicTransferDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }
        }
    }

    // MARK: - Einnahmen

    private var einnahmenSection: some View {
        formSection(title: "Einnahmen (Prognose)") {
            CurrencyField(label: "Kaltmiete/Monat *", value: $property.coldRentMonthly, isRequired: true)
            CurrencyField(label: "Parkingmiete/Monat", value: $property.parkingRentMonthly)
            CurrencyField(label: "Sonstige Einnahmen/Monat", value: $property.otherIncomeMonthly)
            PercentField(label: "Leerstandsquote (Annahme)", value: $property.vacancyRateAssumption)
        }
    }

    // MARK: - Kosten

    private var kostenSection: some View {
        formSection(title: "Laufende Kosten") {
            CurrencyField(label: "Hausgeld gesamt/Monat *", value: $property.hoaFeeTotalMonthly, isRequired: true)
            CurrencyField(label: "davon umlagefähig/Monat *", value: $property.hoaFeeRecoverableMonthly, isRequired: true)
            CurrencyField(label: "Grundsteuer/Jahr *", value: $property.propertyTaxAnnual, isRequired: true)
            CurrencyField(label: "Hausverwaltung/Jahr", value: $property.propertyManagementAnnual)
            CurrencyField(label: "Instandhaltungsrücklage/Monat", value: $property.maintenanceReserveMonthly)
            CurrencyField(label: "Gebäudeversicherung/Jahr", value: $property.propertyInsuranceAnnual)
            CurrencyField(label: "Sonstige Kosten/Monat", value: $property.otherCostsMonthly)
        }
    }

    // MARK: - Finanzierung

    private var finanzierungSection: some View {
        formSection(title: "Finanzierung") {
            CurrencyField(label: "Darlehensbetrag *", value: $property.loanAmount, isRequired: true)
            PercentField(label: "Zinssatz *", value: $property.interestRate, isRequired: true)
            PercentField(label: "Tilgungssatz *", value: $property.amortizationRate, isRequired: true)
            labeledField("Zinsbindung (Jahre) *") {
                Stepper("\(property.fixedInterestPeriodYears) Jahre",
                        value: $property.fixedInterestPeriodYears, in: 1...30)
                    .frame(width: 160)
            }
            labeledField("Darlehensbeginn *") {
                DatePicker("", selection: $property.loanStartDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }
            CurrencyField(label: "Tatsächliche Rate (optional)", value: Binding(
                get: { property.monthlyMortgageActual ?? 0 },
                set: { property.monthlyMortgageActual = $0 > 0 ? $0 : nil }
            ))
        }
    }

    // MARK: - AfA & Steuer

    private var afaSection: some View {
        formSection(title: "AfA & Steuer") {
            CurrencyField(label: "Gebäudewert (Excel) *", value: $property.buildingValue, isRequired: true)
            CurrencyField(label: "Grundstückswert (Excel) *", value: $property.landValue, isRequired: true)
            PercentField(label: "AfA-Satz *", value: $property.depreciationRate, isRequired: true)
            PercentField(label: "Grenzsteuersatz *", value: $property.marginalTaxRate, isRequired: true)
        }
    }

    // MARK: - Warnings

    @ViewBuilder
    private var warningsSection: some View {
        if showLandBuildingWarning || showHighLTVWarning {
            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Hinweise")
                if showLandBuildingWarning {
                    warningRow("Gebäudewert + Grundstückswert weicht um \(Formatters.formatPercentOneDecimal(landPlusBuildingDeviation ?? 0)) vom Kaufpreis ab (Toleranz: 5%). Werte aus dem Regierungs-Excel prüfen.")
                }
                if showHighLTVWarning {
                    warningRow("Darlehensbetrag übersteigt den Kaufpreis (Vollfinanzierung inkl. Nebenkosten). Bitte prüfen.")
                }
            }
        }
    }

    @ViewBuilder
    private func warningRow(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(Color(hex: "#D97706"))
            Text(message)
                .font(.appCaption)
                .foregroundStyle(Color(hex: "#D97706"))
        }
        .padding(10)
        .background(Color(hex: "#D97706").opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Delete

    private var deleteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Gefahr")
            Button(role: .destructive) {
                modelContext.delete(property)
            } label: {
                Label("Immobilie löschen", systemImage: "trash")
                    .foregroundStyle(.appNegative)
            }
            .buttonStyle(.bordered)
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func formSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: title).padding(.bottom, 8)
            VStack(spacing: 0) {
                content()
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            content()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }
}
```

- [ ] **Step 2: Build and verify**

Cmd+R. Einstellungen tab shows all sections. Edit "Kaltmiete/Monat" → tap elsewhere → KPIs in header update live. Warning appears if Gebäudewert + Grundstückswert differs by more than 5% from Kaufpreis.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Property/SettingsTab.swift
git commit -m "feat: implement SettingsTab with all editable fields and validation warnings"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 5 tabs implemented. Header always shows Kaufpreis, Gesamtinvestment, Bruttorendite, Nettorendite, LTV. CashflowTab shows Soll/Ist with deviation, status history, and extraordinary costs. TaxTab shows full AfA derivation, V+V-Ergebnis, tax effect. FinancingTab shows LTV chart with 60% reference line and annual amortization table. SettingsTab has all model fields, non-blocking warnings, delete action.
- [x] **No placeholders:** All tabs fully implemented.
- [x] **Type consistency:** `PropertyDetailView` receives `Property` and creates `PropertyViewModel`. All tabs receive `PropertyViewModel`. `SettingsTab` receives `Property` as `@Bindable` for direct mutation. `AmortizationCalculator.AnnuityRow` used in `FinancingTab` — `id` is `Int` matching the filter `$0.id % 12 == 0`.
- [x] **`@Bindable`** requires iOS 17+/macOS 14+ — consistent with the project's macOS 14+ requirement.
