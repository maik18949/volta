import SwiftUI
import SwiftData

struct PropertySetupView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var state = PropertySetupState()
    @State private var currentStep = 0

    private var steps: [String] {
        var s = ["Stammdaten", "Objektdaten", "Kauf", "Einnahmen", "Kosten", "Finanzierung", "AfA & Steuer"]
        if state.requiresStatusOnboarding {
            s.append("Status")
        }
        return s
    }

    var body: some View {
        HStack(spacing: 0) {
            // MARK: Left sidebar
            sidebar

            Divider()

            // MARK: Step content + navigation
            VStack(spacing: 0) {
                stepContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                Divider()

                navigationButtons
                    .padding(16)
            }
        }
        .navigationTitle("Immobilie hinzufügen")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Sidebar

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                Button {
                    currentStep = index
                } label: {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(index == currentStep ? Color.appAccent : Color.clear)
                            .frame(width: 8, height: 8)
                            .overlay(
                                Circle().stroke(
                                    index <= currentStep ? Color.appAccent : Color.appDimText,
                                    lineWidth: 1.5
                                )
                            )
                        Text(step)
                            .font(.system(size: 13, weight: index == currentStep ? .bold : .regular))
                            .foregroundStyle(index == currentStep ? Color.appAccent : Color.appSecondaryText)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        index == currentStep
                            ? Color.appAccent.opacity(0.08)
                            : Color.clear
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 8)
        .frame(width: 140)
        .background(Color.appSidebarBackground)
    }

    // MARK: - Step content

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

    // MARK: - Navigation buttons

    private var isLastStep: Bool { currentStep == steps.count - 1 }

    private var navigationButtons: some View {
        HStack {
            if currentStep > 0 {
                Button("Zurück") {
                    currentStep -= 1
                }
                .buttonStyle(.bordered)
            }
            Spacer()
            if isLastStep {
                Button("Fertigstellen") {
                    saveAndDismiss()
                }
                .buttonStyle(.borderedProminent)
                .disabled(!state.canFinish)
            } else {
                Button("Weiter") {
                    currentStep += 1
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: - Save

    private func saveAndDismiss() {
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
        p.livingAreaSqm = Double(state.livingAreaSqm) ?? 0
        p.usableAreaSqm = Double(state.usableAreaSqm)
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
        p.lastRenovationYear = Int(state.lastRenovationYear)

        // Kauf
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

        // Einnahmen
        p.coldRentMonthly = Double(state.coldRentMonthly) ?? 0
        p.warmmieteMonthly = Double(state.warmmieteMonthly)
        p.parkingRentMonthly = Double(state.parkingRentMonthly) ?? 0
        p.otherIncomeMonthly = Double(state.otherIncomeMonthly) ?? 0

        // Kosten
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

        // Finanzierung — percent inputs are entered as "3.5" meaning 3.5%, stored as 0.035
        p.loanAmount = Double(state.loanAmount) ?? 0
        p.interestRate = (Double(state.interestRate) ?? 0) / 100.0
        p.amortizationRate = (Double(state.amortizationRate) ?? 0) / 100.0
        p.fixedInterestPeriodYears = state.fixedInterestPeriodYears
        p.loanStartDate = state.loanStartDate
        p.monthlyMortgage = Double(state.monthlyMortgage) ?? 0
        p.equityContributed = Double(state.equityContributed) ?? 0
        p.brokerCommissionAgreement = Double(state.brokerCommissionAgreement) ?? 0

        // AfA & Steuer
        p.buildingValue = Double(state.buildingValue) ?? 0
        p.landValue = Double(state.landValue) ?? 0
        p.depreciationRate = (Double(state.depreciationRate) ?? 2.0) / 100.0
        p.marginalTaxRate = (Double(state.marginalTaxRate) ?? 0) / 100.0

        modelContext.insert(p)

        // Status-Onboarding
        if state.requiresStatusOnboarding {
            let income: Double? = state.firstStatus == .mietgarantie
                ? Double(state.firstStatusIncome)
                : nil
            let entry = StatusEntry(
                date: state.firstStatusDate,
                status: state.firstStatus,
                incomeActualMonthly: income,
                notes: state.firstStatusNotes
            )
            entry.property = p
            modelContext.insert(entry)
        }

        // Save photos (iOS only — UIImage not available on macOS)
        #if os(iOS)
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        for (i, img) in state.photos.enumerated() {
            if let data = img.jpegData(compressionQuality: 0.8) {
                let filename = "\(UUID().uuidString).jpg"
                let url = docs.appendingPathComponent(filename)
                try? data.write(to: url)
                let photo = PropertyPhoto(
                    filePath: url.path,
                    isCoverPhoto: i == state.coverIndex,
                    sortOrder: i
                )
                photo.property = p
                modelContext.insert(photo)
            }
        }
        #endif

        dismiss()
    }
}
