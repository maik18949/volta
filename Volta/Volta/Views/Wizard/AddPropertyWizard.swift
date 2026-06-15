import SwiftUI
import SwiftData

struct AddPropertyWizard: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var wizardState = WizardState()
    @State private var currentStep: Int = 1

    var body: some View {
        VStack(spacing: 0) {
            progressBar

            Divider()

            ScrollView {
                stepContent
                    .padding(24)
            }

            Divider()

            navigationButtons
        }
        .frame(minWidth: 600, minHeight: 500)
        .background(Color.appContentBackground)
    }

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Schritt \(currentStep) von \(wizardState.totalSteps)")
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
                        .frame(width: geo.size.width * CGFloat(currentStep) / CGFloat(wizardState.totalSteps), height: 6)
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

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case 1: WizardStepStammdaten(state: wizardState)
        case 2: WizardStepObjektdaten(state: wizardState)
        case 3: WizardStepKauf(state: wizardState)
        case 4: WizardStepEinnahmen(state: wizardState)
        case 5: WizardStepKosten(state: wizardState)
        case 6: WizardStepFinanzierung(state: wizardState)
        case 7: WizardStepAfA(state: wizardState)
        case 8: WizardStepStatusOnboarding(state: wizardState)
        default: EmptyView()
        }
    }

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

            if currentStep < wizardState.totalSteps {
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
                .disabled(!wizardState.canFinish)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.appCardBackground)
    }

    private var canProceed: Bool {
        switch currentStep {
        case 1: return !wizardState.name.isEmpty && !wizardState.address.isEmpty && !wizardState.city.isEmpty
        case 3: return wizardState.purchasePriceUnit > 0
        default: return true
        }
    }

    private func finishWizard() {
        let p = Property()
        p.name = wizardState.name
        p.address = wizardState.address
        p.city = wizardState.city
        p.state = wizardState.state
        p.postalCode = wizardState.postalCode
        p.propertyType = wizardState.propertyType
        p.acquisitionType = wizardState.acquisitionType
        p.yearBuilt = Int(wizardState.yearBuilt)
        p.notes = wizardState.notes
        p.livingAreaSqm = wizardState.livingAreaSqm
        p.usableAreaSqm = wizardState.usableAreaSqm > 0 ? wizardState.usableAreaSqm : nil
        p.landAreaSqm = wizardState.landAreaSqm > 0 ? wizardState.landAreaSqm : nil
        p.rooms = wizardState.rooms > 0 ? wizardState.rooms : nil
        p.bedrooms = wizardState.bedrooms > 0 ? wizardState.bedrooms : nil
        p.bathrooms = wizardState.bathrooms > 0 ? wizardState.bathrooms : nil
        p.hasBalcony = wizardState.hasBalcony
        p.hasTerrace = wizardState.hasTerrace
        p.hasGarden = wizardState.hasGarden
        p.hasBasement = wizardState.hasBasement
        p.hasFittedKitchen = wizardState.hasFittedKitchen
        p.parkingType = wizardState.parkingType
        p.parkingCount = wizardState.parkingCount
        p.heatingType = wizardState.heatingType
        p.energyEfficiencyClass = wizardState.energyEfficiencyClass
        p.condition = wizardState.condition
        p.lastRenovationYear = Int(wizardState.lastRenovationYear)
        p.purchaseDate = wizardState.purchaseDate
        p.economicTransferDate = wizardState.economicTransferDate
        p.purchasePriceUnit = wizardState.purchasePriceUnit
        p.purchasePriceParking = wizardState.purchasePriceParking
        p.landTransferTax = wizardState.landTransferTax
        p.notaryCosts = wizardState.notaryCosts
        p.landRegistryCosts = wizardState.landRegistryCosts
        p.agentFee = wizardState.agentFee
        p.appraisalCosts = wizardState.appraisalCosts
        p.renovationModernizationCosts = wizardState.renovationModernizationCosts
        p.renovationAfaEligible = wizardState.renovationAfaEligible
        p.coldRentMonthly = wizardState.coldRentMonthly
        p.parkingRentMonthly = wizardState.parkingRentMonthly
        p.otherIncomeMonthly = wizardState.otherIncomeMonthly
        p.serviceChargeRecoverableMonthly = wizardState.serviceChargeRecoverableMonthly
        p.vacancyRateAssumption = wizardState.vacancyRateAssumption
        p.rentMarketSqm = wizardState.rentMarketSqm > 0 ? wizardState.rentMarketSqm : nil
        p.hoaFeeTotalMonthly = wizardState.hoaFeeTotalMonthly
        p.hoaFeeRecoverableMonthly = wizardState.hoaFeeRecoverableMonthly
        p.propertyTaxAnnual = wizardState.propertyTaxAnnual
        p.propertyManagementAnnual = wizardState.propertyManagementAnnual
        p.maintenanceReserveMonthly = wizardState.maintenanceReserveMonthly
        p.propertyInsuranceAnnual = wizardState.propertyInsuranceAnnual
        p.otherCostsMonthly = wizardState.otherCostsMonthly
        p.loanAmount = wizardState.loanAmount
        p.interestRate = wizardState.interestRate
        p.amortizationRate = wizardState.amortizationRate
        p.fixedInterestPeriodYears = wizardState.fixedInterestPeriodYears
        p.loanStartDate = wizardState.loanStartDate
        p.monthlyMortgageActual = wizardState.monthlyMortgageActual > 0 ? wizardState.monthlyMortgageActual : nil
        p.remainingDebtCurrent = wizardState.remainingDebtCurrent > 0 ? wizardState.remainingDebtCurrent : nil
        p.landValue = wizardState.landValue
        p.buildingValue = wizardState.buildingValue
        p.depreciationRate = wizardState.depreciationRate
        p.marginalTaxRate = wizardState.marginalTaxRate

        if wizardState.requiresStatusOnboarding {
            let entry = StatusEntry(
                statusFrom: wizardState.firstStatusDate.firstDayOfMonth,
                status: wizardState.firstStatus,
                incomeActualMonthly: wizardState.firstStatusIncome,
                notes: wizardState.firstStatusNotes.isEmpty ? nil : wizardState.firstStatusNotes
            )
            entry.property = p
            p.statusHistory = [entry]
        }

        modelContext.insert(p)
        dismiss()
    }
}
