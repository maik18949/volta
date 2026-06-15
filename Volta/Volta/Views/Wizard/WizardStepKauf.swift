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
