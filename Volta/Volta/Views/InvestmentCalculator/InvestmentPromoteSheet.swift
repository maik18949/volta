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

            Text("**\(calculation.name)** wird als neue Immobilie ins Portfolio aufgenommen.\n\nDieser Eintrag bleibt als Prognose-Referenz erhalten.")
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
        // InvestmentCalculation only captures the non-recoverable HOA portion.
        // Set total = nonRecoverable and recoverable = 0 so PropertyViewModel computes the right value.
        // User should update hoaFeeTotalMonthly and hoaFeeRecoverableMonthly in Einstellungen after promoting.
        p.hoaFeeTotalMonthly = calculation.hoaFeeNonRecoverableMonthly
        p.hoaFeeRecoverableMonthly = 0
        p.propertyManagementAnnual = calculation.propertyManagementAnnual
        p.hoaFeeMaintenanceReserveMonthly = calculation.maintenanceReserveMonthly
        p.loanAmount = calculation.loanAmount
        p.interestRate = calculation.interestRate
        p.amortizationRate = calculation.amortizationRate
        p.monthlyMortgage = calculation.monthlyMortgageActual ?? 0.0
        p.buildingValue = calculation.buildingValue
        p.depreciationRate = calculation.depreciationRate
        p.marginalTaxRate = calculation.marginalTaxRate
        p.economicTransferDate = Date()
        p.purchaseDate = Date()
        p.loanStartDate = Date()

        modelContext.insert(p)

        calculation.isPromoted = true
        calculation.promotedPropertyId = p.id
        calculation.promotedAt = Date()
    }
}
