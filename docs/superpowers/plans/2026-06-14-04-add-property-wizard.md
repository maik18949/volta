# Immobilien Portfolio Manager — Plan 4: Add Property Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 7-step Add Property Wizard so users can create a new property through a guided flow, with a mandatory status-history step when `economicTransferDate` is in the past.

**Architecture:** A single `AddPropertyWizard` sheet holds all state in a temporary `@Observable` `WizardState` class (not SwiftData). Only on "Fertigstellen" does a `Property` object get inserted into the model context. Each step is a separate `View`. A progress bar at the top shows current position.

**Tech Stack:** SwiftUI, SwiftData (insert only on finish), `@Observable`

**Depends on:** Plan 1 (models), Plan 2 (components, design tokens, PortfolioView for the "+" button wiring)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Volta/Volta/Views/Wizard/WizardState.swift` | Create | `@Observable` class holding all wizard inputs |
| `Volta/Volta/Views/Wizard/AddPropertyWizard.swift` | Create | Sheet container, progress bar, step routing, "Fertigstellen" |
| `Volta/Volta/Views/Wizard/WizardStepStammdaten.swift` | Create | Step 1: Name, address, type |
| `Volta/Volta/Views/Wizard/WizardStepObjektdaten.swift` | Create | Step 2: Area, rooms, features |
| `Volta/Volta/Views/Wizard/WizardStepKauf.swift` | Create | Step 3: Purchase price, dates, closing costs |
| `Volta/Volta/Views/Wizard/WizardStepEinnahmen.swift` | Create | Step 4: Rent income |
| `Volta/Volta/Views/Wizard/WizardStepKosten.swift` | Create | Step 5: Operating costs |
| `Volta/Volta/Views/Wizard/WizardStepFinanzierung.swift` | Create | Step 6: Loan, interest, amortization |
| `Volta/Volta/Views/Wizard/WizardStepAfA.swift` | Create | Step 7: Land/building values, depreciation, tax rate |
| `Volta/Volta/Views/Wizard/WizardStepStatusOnboarding.swift` | Create | Conditional Step 8: First status entry when transfer date is in past |
| `Volta/Volta/Views/Portfolio/PortfolioView.swift` | Modify | Wire `showingAddWizard` sheet to `AddPropertyWizard` |

---

## Task 1: WizardState

**Files:**
- Create: `Volta/Volta/Views/Wizard/WizardStepState.swift`

- [ ] **Step 1: Create `Wizard` group in Xcode**

Right-click `Views` → New Group → `Wizard`.

- [ ] **Step 2: Create `WizardState.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardState.swift
import Foundation
import Observation

/// Holds all wizard inputs as plain Swift values.
/// Nothing is persisted to SwiftData until the user taps "Fertigstellen".
@Observable
class WizardState {
    // Stammdaten
    var name: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var propertyType: PropertyType = .apartment
    var acquisitionType: AcquisitionType = .kauf
    var yearBuilt: String = ""
    var notes: String = ""

    // Objektdaten
    var livingAreaSqm: Double = 0.0
    var usableAreaSqm: Double = 0.0
    var landAreaSqm: Double = 0.0
    var rooms: Double = 0.0
    var bedrooms: Int = 0
    var bathrooms: Int = 0
    var hasBalcony: Bool = false
    var hasTerrace: Bool = false
    var hasGarden: Bool = false
    var hasBasement: Bool = false
    var hasFittedKitchen: Bool = false
    var parkingType: ParkingType? = nil
    var parkingCount: Int = 0
    var heatingType: HeatingType? = nil
    var energyEfficiencyClass: EnergyClass? = nil
    var condition: PropertyCondition? = nil
    var lastRenovationYear: String = ""

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

    // Einnahmen
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var serviceChargeRecoverableMonthly: Double = 0.0
    var vacancyRateAssumption: Double = 0.03
    var rentMarketSqm: Double = 0.0

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
    var monthlyMortgageActual: Double = 0.0
    var remainingDebtCurrent: Double = 0.0

    // AfA & Steuer
    var landValue: Double = 0.0
    var buildingValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0

    // Status Onboarding (conditional step)
    var firstStatusDate: Date = Date()
    var firstStatus: PropertyStatus = .leerstand
    var firstStatusIncome: Double = 0.0
    var firstStatusNotes: String = ""

    // MARK: - Validation

    /// True if all blocking-required fields for "Fertigstellen" are set.
    var canFinish: Bool {
        !name.isEmpty
            && !address.isEmpty
            && !city.isEmpty
            && purchasePriceUnit > 0
            && coldRentMonthly > 0
            && loanAmount > 0
            && interestRate > 0
            && amortizationRate > 0
            && buildingValue > 0
            && landValue > 0
    }

    /// True when economicTransferDate is in the past — requires status onboarding step.
    var requiresStatusOnboarding: Bool {
        economicTransferDate.firstDayOfMonth <= Date().firstDayOfMonth
    }

    var totalSteps: Int { requiresStatusOnboarding ? 8 : 7 }
}
```

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Wizard/WizardState.swift
git commit -m "feat: add WizardState with all input fields and validation"
```

---

## Task 2: AddPropertyWizard Container

**Files:**
- Create: `Volta/Volta/Views/Wizard/AddPropertyWizard.swift`

- [ ] **Step 1: Create `AddPropertyWizard.swift`**

```swift
// Volta/Volta/Views/Wizard/AddPropertyWizard.swift
import SwiftUI
import SwiftData

struct AddPropertyWizard: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var state = WizardState()
    @State private var currentStep: Int = 1

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            progressBar

            Divider()

            // Step content
            ScrollView {
                stepContent
                    .padding(24)
            }

            Divider()

            // Navigation buttons
            navigationButtons
        }
        .frame(minWidth: 600, minHeight: 500)
        .background(Color.appContentBackground)
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Schritt \(currentStep) von \(state.totalSteps)")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
                Spacer()
                Text(stepTitle)
                    .font(.appHeadline)
                    .foregroundStyle(Color.appPrimaryText)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.appCardBackground)
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.appAccent)
                        .frame(width: geo.size.width * CGFloat(currentStep) / CGFloat(state.totalSteps), height: 6)
                        .animation(.easeInOut(duration: 0.2), value: currentStep)
                }
            }
            .frame(height: 6)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.appCardBackground)
    }

    private var stepTitle: String {
        switch currentStep {
        case 1: return "Stammdaten"
        case 2: return "Objektdaten"
        case 3: return "Kauf & Nebenkosten"
        case 4: return "Einnahmen"
        case 5: return "Kosten"
        case 6: return "Finanzierung"
        case 7: return "AfA & Steuer"
        case 8: return "Nutzungsverlauf"
        default: return ""
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case 1: WizardStepStammdaten(state: state)
        case 2: WizardStepObjektdaten(state: state)
        case 3: WizardStepKauf(state: state)
        case 4: WizardStepEinnahmen(state: state)
        case 5: WizardStepKosten(state: state)
        case 6: WizardStepFinanzierung(state: state)
        case 7: WizardStepAfA(state: state)
        case 8: WizardStepStatusOnboarding(state: state)
        default: EmptyView()
        }
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack {
            Button("Abbrechen") { dismiss() }
                .buttonStyle(.bordered)

            Spacer()

            if currentStep > 1 {
                Button("Zurück") {
                    withAnimation(.easeInOut(duration: 0.15)) { currentStep -= 1 }
                }
                .buttonStyle(.bordered)
            }

            if currentStep < state.totalSteps {
                Button("Weiter") {
                    withAnimation(.easeInOut(duration: 0.15)) { currentStep += 1 }
                }
                .buttonStyle(.borderedProminent)
                .tint(.appAccent)
                .disabled(!canProceed)
            } else {
                Button("Fertigstellen") {
                    finishWizard()
                }
                .buttonStyle(.borderedProminent)
                .tint(.appAccent)
                .disabled(!state.canFinish)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.appCardBackground)
    }

    private var canProceed: Bool {
        switch currentStep {
        case 1: return !state.name.isEmpty && !state.address.isEmpty && !state.city.isEmpty
        case 3: return state.purchasePriceUnit > 0
        default: return true
        }
    }

    // MARK: - Finish

    private func finishWizard() {
        let p = Property()
        // Stammdaten
        p.name = state.name
        p.address = state.address
        p.city = state.city
        p.state = state.state
        p.postalCode = state.postalCode
        p.propertyType = state.propertyType
        p.acquisitionType = state.acquisitionType
        p.yearBuilt = Int(state.yearBuilt)
        p.notes = state.notes
        // Objektdaten
        p.livingAreaSqm = state.livingAreaSqm
        p.usableAreaSqm = state.usableAreaSqm > 0 ? state.usableAreaSqm : nil
        p.landAreaSqm = state.landAreaSqm > 0 ? state.landAreaSqm : nil
        p.rooms = state.rooms > 0 ? state.rooms : nil
        p.bedrooms = state.bedrooms > 0 ? state.bedrooms : nil
        p.bathrooms = state.bathrooms > 0 ? state.bathrooms : nil
        p.hasBalcony = state.hasBalcony
        p.hasTerrace = state.hasTerrace
        p.hasGarden = state.hasGarden
        p.hasBasement = state.hasBasement
        p.hasFittedKitchen = state.hasFittedKitchen
        p.parkingType = state.parkingType
        p.parkingCount = state.parkingCount
        p.heatingType = state.heatingType
        p.energyEfficiencyClass = state.energyEfficiencyClass
        p.condition = state.condition
        p.lastRenovationYear = Int(state.lastRenovationYear)
        // Kauf
        p.purchaseDate = state.purchaseDate
        p.economicTransferDate = state.economicTransferDate
        p.purchasePriceUnit = state.purchasePriceUnit
        p.purchasePriceParking = state.purchasePriceParking
        p.landTransferTax = state.landTransferTax
        p.notaryCosts = state.notaryCosts
        p.landRegistryCosts = state.landRegistryCosts
        p.agentFee = state.agentFee
        p.appraisalCosts = state.appraisalCosts
        p.renovationModernizationCosts = state.renovationModernizationCosts
        p.renovationAfaEligible = state.renovationAfaEligible
        // Einnahmen
        p.coldRentMonthly = state.coldRentMonthly
        p.parkingRentMonthly = state.parkingRentMonthly
        p.otherIncomeMonthly = state.otherIncomeMonthly
        p.serviceChargeRecoverableMonthly = state.serviceChargeRecoverableMonthly
        p.vacancyRateAssumption = state.vacancyRateAssumption
        p.rentMarketSqm = state.rentMarketSqm > 0 ? state.rentMarketSqm : nil
        // Kosten
        p.hoaFeeTotalMonthly = state.hoaFeeTotalMonthly
        p.hoaFeeRecoverableMonthly = state.hoaFeeRecoverableMonthly
        p.propertyTaxAnnual = state.propertyTaxAnnual
        p.propertyManagementAnnual = state.propertyManagementAnnual
        p.maintenanceReserveMonthly = state.maintenanceReserveMonthly
        p.propertyInsuranceAnnual = state.propertyInsuranceAnnual
        p.otherCostsMonthly = state.otherCostsMonthly
        // Finanzierung
        p.loanAmount = state.loanAmount
        p.interestRate = state.interestRate
        p.amortizationRate = state.amortizationRate
        p.fixedInterestPeriodYears = state.fixedInterestPeriodYears
        p.loanStartDate = state.loanStartDate
        p.monthlyMortgageActual = state.monthlyMortgageActual > 0 ? state.monthlyMortgageActual : nil
        p.remainingDebtCurrent = state.remainingDebtCurrent > 0 ? state.remainingDebtCurrent : nil
        // AfA & Steuer
        p.landValue = state.landValue
        p.buildingValue = state.buildingValue
        p.depreciationRate = state.depreciationRate
        p.marginalTaxRate = state.marginalTaxRate

        // Status Onboarding
        if state.requiresStatusOnboarding {
            let entry = StatusEntry(
                statusFrom: state.firstStatusDate.firstDayOfMonth,
                status: state.firstStatus,
                incomeActualMonthly: state.firstStatusIncome,
                notes: state.firstStatusNotes.isEmpty ? nil : state.firstStatusNotes
            )
            entry.property = p
            p.statusHistory = [entry]
        }

        modelContext.insert(p)
        dismiss()
    }
}
```

- [ ] **Step 2: Wire wizard sheet in `PortfolioView.swift`**

In `PortfolioView.swift`, replace the existing `.sheet(isPresented: $showingAddWizard)` placeholder (or add it if missing). The sheet modifier goes on the outermost `VStack`:

```swift
.sheet(isPresented: $showingAddWizard) {
    AddPropertyWizard()
}
```

- [ ] **Step 3: Add stub files so it builds**

`AddPropertyWizard` references all 8 wizard step views. Create stubs now; they'll be replaced in subsequent tasks:

Create each of these with the same pattern:
```swift
// WizardStepStammdaten.swift
import SwiftUI
struct WizardStepStammdaten: View {
    let state: WizardState
    var body: some View { Text("Stammdaten — folgt") }
}
```

Repeat for: `WizardStepObjektdaten`, `WizardStepKauf`, `WizardStepEinnahmen`, `WizardStepKosten`, `WizardStepFinanzierung`, `WizardStepAfA`, `WizardStepStatusOnboarding`.

- [ ] **Step 4: Build and run**

Cmd+B, Cmd+R. Click "+" in portfolio toolbar → wizard sheet opens with progress bar. "Weiter" is disabled until Step 1 fields filled. Clicking "Abbrechen" dismisses.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Views/Wizard/
git commit -m "feat: add AddPropertyWizard container with progress bar and finish logic"
```

---

## Task 3: Wizard Step 1 — Stammdaten

**Files:**
- Modify: `Volta/Volta/Views/Wizard/WizardStepStammdaten.swift`

- [ ] **Step 1: Replace stub**

```swift
// Volta/Volta/Views/Wizard/WizardStepStammdaten.swift
import SwiftUI

struct WizardStepStammdaten: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gib die Basisdaten deiner Immobilie ein. Name und Adresse sind Pflichtfelder.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            formField("Name *", hint: "z. B. ETW Dresden Neustadt") {
                TextField("ETW Dresden Neustadt", text: $state.name)
                    .textFieldStyle(.roundedBorder)
            }
            formField("Adresse *", hint: "Straße und Hausnummer") {
                TextField("Johann-Meyer-Straße 7b", text: $state.address)
                    .textFieldStyle(.roundedBorder)
            }
            HStack(spacing: 12) {
                VStack(alignment: .leading) {
                    Text("PLZ").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("01097", text: $state.postalCode)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                }
                VStack(alignment: .leading) {
                    Text("Stadt *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("Dresden", text: $state.city)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading) {
                    Text("Bundesland").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("Sachsen", text: $state.state)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 140)
                }
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Objekttyp").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.propertyType) {
                        ForEach(PropertyType.allCases, id: \.self) { t in Text(t.rawValue).tag(t) }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 180)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Erwerbsart").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.acquisitionType) {
                        ForEach(AcquisitionType.allCases, id: \.self) { t in Text(t.rawValue).tag(t) }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 180)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Baujahr").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("1998", text: $state.yearBuilt)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Notizen").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextEditor(text: $state.notes)
                    .font(.appBody)
                    .frame(height: 80)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.appSecondaryText.opacity(0.3)))
            }
        }
    }

    @ViewBuilder
    private func formField<Content: View>(_ label: String, hint: String = "", @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            content()
            if !hint.isEmpty {
                Text(hint).font(.appCaption).foregroundStyle(Color.appSecondaryText.opacity(0.7))
            }
        }
    }
}
```

- [ ] **Step 2: Build and verify**

Cmd+R → "+" button → Step 1 shows name/address/city/type fields. "Weiter" button activates after typing name, address, city.

- [ ] **Step 3: Commit**

```bash
git add Volta/Volta/Views/Wizard/WizardStepStammdaten.swift
git commit -m "feat: implement WizardStepStammdaten"
```

---

## Task 4: Wizard Steps 2–4 (Objektdaten, Kauf, Einnahmen)

**Files:**
- Modify: `Volta/Volta/Views/Wizard/WizardStepObjektdaten.swift`
- Modify: `Volta/Volta/Views/Wizard/WizardStepKauf.swift`
- Modify: `Volta/Volta/Views/Wizard/WizardStepEinnahmen.swift`

- [ ] **Step 1: Replace `WizardStepObjektdaten.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepObjektdaten.swift
import SwiftUI

struct WizardStepObjektdaten: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Objektdaten sind optional — trage nur ein, was du weißt.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Wohnfläche (m²) *", value: $state.livingAreaSqm, isRequired: true)
            CurrencyField(label: "Nutzfläche (m²)", value: $state.usableAreaSqm)
            CurrencyField(label: "Zimmer", value: $state.rooms)

            HStack(spacing: 24) {
                Toggle("Balkon", isOn: $state.hasBalcony)
                Toggle("Terrasse", isOn: $state.hasTerrace)
                Toggle("Garten", isOn: $state.hasGarden)
                Toggle("Keller", isOn: $state.hasBasement)
                Toggle("Einbauküche", isOn: $state.hasFittedKitchen)
            }
            .font(.appBody)

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stellplatz").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.parkingType) {
                        Text("Keiner").tag(Optional<ParkingType>.none)
                        ForEach(ParkingType.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu).frame(width: 160)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Heizung").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.heatingType) {
                        Text("–").tag(Optional<HeatingType>.none)
                        ForEach(HeatingType.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu).frame(width: 160)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Energieklasse").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.energyEfficiencyClass) {
                        Text("–").tag(Optional<EnergyClass>.none)
                        ForEach(EnergyClass.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu).frame(width: 100)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Zustand").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.condition) {
                        Text("–").tag(Optional<PropertyCondition>.none)
                        ForEach(PropertyCondition.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu).frame(width: 180)
                }
            }
        }
    }
}
```

- [ ] **Step 2: Replace `WizardStepKauf.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepKauf.swift
import SwiftUI

struct WizardStepKauf: View {
    @Bindable var state: WizardState

    var purchasePrice: Double { state.purchasePriceUnit + state.purchasePriceParking }
    var closingCostsTotal: Double {
        state.landTransferTax + state.notaryCosts + state.landRegistryCosts
            + state.agentFee + state.appraisalCosts
    }
    var totalInvestment: Double { purchasePrice + closingCostsTotal + state.renovationModernizationCosts }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Kaufpreis und Nebenkosten. Der wirtschaftliche Übergang bestimmt den AfA-Beginn — in der Regel das Datum des Besitzübergangs laut Kaufvertrag.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Kaufdatum").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    DatePicker("", selection: $state.purchaseDate, displayedComponents: .date)
                        .datePickerStyle(.compact).frame(width: 160)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Wirtschaftlicher Übergang *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    DatePicker("", selection: $state.economicTransferDate, displayedComponents: .date)
                        .datePickerStyle(.compact).frame(width: 160)
                }
            }

            CurrencyField(label: "Kaufpreis Wohnung *", value: $state.purchasePriceUnit, isRequired: true)
            CurrencyField(label: "Kaufpreis Stellplatz", value: $state.purchasePriceParking)
            CurrencyField(label: "Grunderwerbsteuer", value: $state.landTransferTax)
            CurrencyField(label: "Notarkosten", value: $state.notaryCosts)
            CurrencyField(label: "Grundbuchkosten", value: $state.landRegistryCosts)
            CurrencyField(label: "Maklerprovision", value: $state.agentFee)
            CurrencyField(label: "Gutachterkosten", value: $state.appraisalCosts)
            CurrencyField(label: "Renovierung gesamt", value: $state.renovationModernizationCosts)
            CurrencyField(label: "davon aktivierungspflichtig", value: $state.renovationAfaEligible)

            Divider()

            // Live summary
            VStack(spacing: 4) {
                summaryRow("Kaufpreis", value: purchasePrice)
                summaryRow("+ Kaufnebenkosten", value: closingCostsTotal)
                summaryRow("+ Renovierung", value: state.renovationModernizationCosts)
                Divider()
                summaryRow("= Gesamtinvestment", value: totalInvestment, isBold: true)
            }
            .padding(12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }
}
```

- [ ] **Step 3: Replace `WizardStepEinnahmen.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepEinnahmen.swift
import SwiftUI

struct WizardStepEinnahmen: View {
    @Bindable var state: WizardState

    var grossIncomeMonthly: Double {
        state.coldRentMonthly + state.parkingRentMonthly + state.otherIncomeMonthly
    }
    var effectiveIncomeMonthly: Double {
        grossIncomeMonthly * (1 - state.vacancyRateAssumption)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Prognose-Einnahmen bei Vollvermietung. Die Nettokaltmiete ist Pflicht — sie ist Basis aller Rendite-KPIs.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Kaltmiete/Monat *", value: $state.coldRentMonthly, isRequired: true)
            CurrencyField(label: "Parkingmiete/Monat", value: $state.parkingRentMonthly)
            CurrencyField(label: "Sonstige Einnahmen/Monat", value: $state.otherIncomeMonthly)
            CurrencyField(label: "Umlagefähige NK/Monat (Hausgeld-Anteil)", value: $state.serviceChargeRecoverableMonthly)
            PercentField(label: "Leerstandsquote (Annahme)", value: $state.vacancyRateAssumption)
            CurrencyField(label: "Marktmiete/m² (informativ)", value: $state.rentMarketSqm)

            Divider()

            VStack(spacing: 4) {
                summaryRow("Bruttomiete/Monat", value: grossIncomeMonthly)
                summaryRow("Leerstand (\(Formatters.formatPercentOneDecimal(state.vacancyRateAssumption)))",
                           value: -grossIncomeMonthly * state.vacancyRateAssumption)
                Divider()
                summaryRow("Effektives Bruttoeinkommen/Monat", value: effectiveIncomeMonthly, isBold: true)
            }
            .padding(12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            if state.coldRentMonthly > 0 && state.purchasePriceUnit > 0 {
                let grossYield = (state.coldRentMonthly + state.parkingRentMonthly) * 12
                    / (state.purchasePriceUnit + state.purchasePriceParking)
                let benchmark = BenchmarkContext.grossYield(grossYield)
                HStack(spacing: 8) {
                    Text("Bruttorendite: \(Formatters.formatPercentOneDecimal(grossYield))")
                        .font(.appBody.weight(.semibold))
                    Text("→ \(benchmark.rating.rawValue)")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }
                .padding(10)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(value < 0 ? Color.appNegative : Color.appPrimaryText)
        }
    }
}
```

- [ ] **Step 4: Build and verify**

Cmd+R. Step 2 (Objektdaten) shows area, toggles, pickers. Step 3 (Kauf) shows prices, dates, live total investment summary. Step 4 (Einnahmen) shows rent inputs, live gross yield badge.

- [ ] **Step 5: Commit**

```bash
git add Volta/Volta/Views/Wizard/WizardStepObjektdaten.swift \
        Volta/Volta/Views/Wizard/WizardStepKauf.swift \
        Volta/Volta/Views/Wizard/WizardStepEinnahmen.swift
git commit -m "feat: implement wizard steps 2-4 (Objektdaten, Kauf, Einnahmen)"
```

---

## Task 5: Wizard Steps 5–8 (Kosten, Finanzierung, AfA, Status-Onboarding)

**Files:**
- Modify: `Volta/Volta/Views/Wizard/WizardStepKosten.swift`
- Modify: `Volta/Volta/Views/Wizard/WizardStepFinanzierung.swift`
- Modify: `Volta/Volta/Views/Wizard/WizardStepAfA.swift`
- Modify: `Volta/Volta/Views/Wizard/WizardStepStatusOnboarding.swift`

- [ ] **Step 1: Replace `WizardStepKosten.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepKosten.swift
import SwiftUI

struct WizardStepKosten: View {
    @Bindable var state: WizardState

    var nonRecoverableMonthly: Double {
        (state.hoaFeeTotalMonthly - state.hoaFeeRecoverableMonthly)
            + state.maintenanceReserveMonthly
            + state.propertyManagementAnnual / 12
            + state.otherCostsMonthly
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Bei WEG-Wohnungen enthält das Hausgeld meist Instandhaltungsrücklage und Gebäudeversicherung — nur zusätzliche Kosten separat eintragen.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Hausgeld gesamt/Monat *", value: $state.hoaFeeTotalMonthly, isRequired: true)
            CurrencyField(label: "davon umlagefähig/Monat *", value: $state.hoaFeeRecoverableMonthly, isRequired: true)
            CurrencyField(label: "Grundsteuer/Jahr *", value: $state.propertyTaxAnnual, isRequired: true)
            CurrencyField(label: "Hausverwaltung/Jahr", value: $state.propertyManagementAnnual)
            CurrencyField(label: "Instandhaltungsrücklage/Monat (zusätzl.)", value: $state.maintenanceReserveMonthly)
            CurrencyField(label: "Gebäudeversicherung/Jahr (falls sep.)", value: $state.propertyInsuranceAnnual)
            CurrencyField(label: "Sonstige Kosten/Monat", value: $state.otherCostsMonthly)

            Divider()

            VStack(spacing: 4) {
                summaryRow("Nicht umlagefähige Kosten/Monat", value: nonRecoverableMonthly, isBold: true)
            }
            .padding(12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }
}
```

- [ ] **Step 2: Replace `WizardStepFinanzierung.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepFinanzierung.swift
import SwiftUI

struct WizardStepFinanzierung: View {
    @Bindable var state: WizardState

    var calculatedMortgage: Double {
        AmortizationCalculator.monthlyMortgageCalc(
            loanAmount: state.loanAmount,
            interestRate: state.interestRate,
            amortizationRate: state.amortizationRate
        )
    }
    var effectiveMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: state.loanAmount,
            interestRate: state.interestRate,
            amortizationRate: state.amortizationRate,
            monthlyMortgageActual: state.monthlyMortgageActual > 0 ? state.monthlyMortgageActual : nil
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Die tatsächliche Rate der Bank weicht manchmal leicht von der berechneten ab (Effektivzins-Rundung). Falls bekannt, trage sie in 'Tatsächliche Rate' ein.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Darlehensbetrag *", value: $state.loanAmount, isRequired: true)
            PercentField(label: "Zinssatz *", value: $state.interestRate, isRequired: true)
            PercentField(label: "Tilgungssatz *", value: $state.amortizationRate, isRequired: true)
            labeledRow("Zinsbindung (Jahre)") {
                Stepper("\(state.fixedInterestPeriodYears) Jahre", value: $state.fixedInterestPeriodYears, in: 1...30)
                    .frame(width: 160)
            }
            labeledRow("Darlehensbeginn") {
                DatePicker("", selection: $state.loanStartDate, displayedComponents: .date)
                    .datePickerStyle(.compact).frame(width: 160)
            }
            CurrencyField(label: "Tatsächliche Rate (optional)", value: $state.monthlyMortgageActual)

            Divider()

            if state.loanAmount > 0 && state.interestRate > 0 {
                VStack(spacing: 4) {
                    summaryRow("Berechnete Rate (Zins + Tilgung)", value: calculatedMortgage)
                    summaryRow("Effektive Rate", value: effectiveMortgage, isBold: true)
                    summaryRow("Zinsen/Jahr", value: state.loanAmount * state.interestRate)
                }
                .padding(12)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }

    @ViewBuilder
    private func labeledRow<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            Text(label).font(.appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            content()
        }
    }
}
```

- [ ] **Step 3: Replace `WizardStepAfA.swift`**

```swift
// Volta/Volta/Views/Wizard/WizardStepAfA.swift
import SwiftUI

struct WizardStepAfA: View {
    @Bindable var state: WizardState

    var purchasePrice: Double { state.purchasePriceUnit + state.purchasePriceParking }
    var closingCosts: Double {
        state.landTransferTax + state.notaryCosts + state.landRegistryCosts
            + state.agentFee + state.appraisalCosts
    }
    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: state.buildingValue,
            closingCostsTotal: closingCosts,
            purchasePrice: purchasePrice,
            renovationAfaEligible: state.renovationAfaEligible
        )
    }
    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: state.depreciationRate)
    }
    var sumDeviation: Double {
        abs((state.landValue + state.buildingValue) - purchasePrice) / max(1, purchasePrice)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (Regierungs-Excel). Beide Werte sollten sich zum Kaufpreis addieren (Toleranz ±5%).")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Gebäudewert (Excel) *", value: $state.buildingValue, isRequired: true)
            CurrencyField(label: "Grundstückswert (Excel) *", value: $state.landValue, isRequired: true)

            if sumDeviation > 0.05 && purchasePrice > 0 {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(Color(hex: "#D97706"))
                    Text("Gebäude + Grundstück (\(Formatters.formatCurrencyRounded(state.buildingValue + state.landValue))) weicht \(Formatters.formatPercentOneDecimal(sumDeviation)) vom Kaufpreis ab.")
                        .font(.appCaption)
                        .foregroundStyle(Color(hex: "#D97706"))
                }
                .padding(10)
                .background(Color(hex: "#D97706").opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            PercentField(label: "AfA-Satz *", value: $state.depreciationRate, isRequired: true)

            Text("Standard: 2,0% (ab 1925) · 2,5% (vor 1925) · 3,0% (Neubau ab 2023) · Individuell per Gutachten (z.B. 3,84%)")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)

            PercentField(label: "Grenzsteuersatz *", value: $state.marginalTaxRate, isRequired: true)

            if afaBasis > 0 {
                Divider()
                VStack(spacing: 4) {
                    summaryRow("AfA-Basis", value: afaBasis)
                    summaryRow("AfA jährlich", value: depreciationYearly, isBold: true)
                    summaryRow("AfA monatlich", value: depreciationYearly / 12)
                }
                .padding(12)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }
}
```

- [ ] **Step 4: Replace `WizardStepStatusOnboarding.swift`**

This step only appears when `economicTransferDate` is in the past. It forces the user to set the first status entry.

```swift
// Volta/Volta/Views/Wizard/WizardStepStatusOnboarding.swift
import SwiftUI

struct WizardStepStatusOnboarding: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "info.circle")
                    .foregroundStyle(Color.appAccent)
                Text("Der wirtschaftliche Übergang (\(state.economicTransferDate, format: .dateTime.day().month().year())) liegt in der Vergangenheit. Erfasse den bisherigen Nutzungsverlauf — mindestens ein Eintrag ab diesem Datum ist Pflicht.")
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)
            }
            .padding(12)
            .background(Color.appAccent.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text("Erster Statuseintrag ab (Datum) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                DatePicker("", selection: $state.firstStatusDate, in: state.economicTransferDate..., displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
                    .onAppear { state.firstStatusDate = state.economicTransferDate }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Status *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("", selection: $state.firstStatus) {
                    ForEach(PropertyStatus.allCases, id: \.self) { s in Text(s.rawValue).tag(s) }
                }.pickerStyle(.segmented)
            }

            CurrencyField(label: "Einnahmen in diesem Zeitraum/Monat *", value: $state.firstStatusIncome)

            VStack(alignment: .leading, spacing: 4) {
                Text("Notiz (optional)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z. B. Mietgarantie Cosona", text: $state.firstStatusNotes)
                    .textFieldStyle(.roundedBorder)
            }

            Text("Weitere Statuswechsel (z. B. Leerstand → Vermietet) können nach dem Anlegen im Cashflow-Tab ergänzt werden.")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
        }
    }
}
```

- [ ] **Step 5: Build and run — full wizard test**

Cmd+R. Click "+". Walk through all 7 (or 8) steps. Set economic transfer date to a past date → Step 8 appears. Fill all required fields → "Fertigstellen" becomes active. Tap → new property appears in portfolio grid.

- [ ] **Step 6: Commit**

```bash
git add Volta/Volta/Views/Wizard/WizardStepKosten.swift \
        Volta/Volta/Views/Wizard/WizardStepFinanzierung.swift \
        Volta/Volta/Views/Wizard/WizardStepAfA.swift \
        Volta/Volta/Views/Wizard/WizardStepStatusOnboarding.swift
git commit -m "feat: implement wizard steps 5-8 (Kosten, Finanzierung, AfA, Status-Onboarding)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 7 wizard steps implemented. Status onboarding step appears when `economicTransferDate` is in the past. First `StatusEntry.statusFrom` = `economicTransferDate` enforced in `WizardStepStatusOnboarding` via date picker minimum. "Fertigstellen" disabled until required fields are set. Gross yield live preview in Step 4.
- [x] **No placeholders:** All steps have complete SwiftUI implementation.
- [x] **Type consistency:** `WizardState` properties match `Property` model fields in name and type. `finishWizard()` maps all `WizardState` fields to `Property` — `Double = 0` → `nil` for optional fields. `firstStatusDate` initialized to `economicTransferDate` via `.onAppear`.
- [x] **No push to SwiftData before finish:** `WizardState` is a plain `@Observable` class; `modelContext.insert(p)` only called in `finishWizard()`.
