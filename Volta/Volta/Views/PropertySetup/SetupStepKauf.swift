import SwiftUI

struct SetupStepKauf: View {
    @Bindable var state: PropertySetupState

    private var purchaseUnit: Double { Double(state.purchasePriceUnit) ?? 0 }
    private var purchaseParking: Double { Double(state.purchasePriceParking) ?? 0 }
    private var totalPurchase: Double { purchaseUnit + purchaseParking }

    private var closingCosts: Double {
        let a = Double(state.landTransferTax) ?? 0
        let b = Double(state.notaryCosts) ?? 0
        let c = Double(state.landRegistryCosts) ?? 0
        let d = Double(state.agentFee) ?? 0
        let e = Double(state.appraisalCosts) ?? 0
        return a + b + c + d + e
    }

    private var renovation: Double { Double(state.renovationTotal) ?? 0 }
    private var totalInvestment: Double { totalPurchase + closingCosts + renovation }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Kauf & Nebenkosten")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                // Dates
                DatePicker("Kaufdatum", selection: $state.purchaseDate, displayedComponents: .date)
                DatePicker("Wirtschaftlicher Übergang *", selection: $state.economicTransferDate, displayedComponents: .date)

                // Kaufpreis
                Text("KAUFPREIS")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                if state.hasParking {
                    currencyField("Kaufpreis Wohnung *", text: $state.purchasePriceUnit)
                    currencyField("Kaufpreis Stellplatz", text: $state.purchasePriceParking)
                    readonlyRow("Gesamtkaufpreis", value: Formatters.formatCurrencyRounded(totalPurchase))
                } else {
                    currencyField("Kaufpreis *", text: $state.purchasePriceUnit)
                }

                // Nebenkosten
                Text("KAUFNEBENKOSTEN")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                currencyField("Grunderwerbsteuer", text: $state.landTransferTax)
                currencyField("Notarkosten", text: $state.notaryCosts)
                currencyField("Grundbuchkosten", text: $state.landRegistryCosts)
                currencyField("Maklerprovision", text: $state.agentFee)
                currencyField("Gutachterkosten", text: $state.appraisalCosts)
                currencyField("Renovierung gesamt", text: $state.renovationTotal)
                currencyField("davon aktivierungspflichtig", text: $state.renovationAfaEligible)

                // Zusammenfassung
                Text("ZUSAMMENFASSUNG")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                readonlyRow("Kaufpreis", value: Formatters.formatCurrencyRounded(totalPurchase))
                readonlyRow("+ Kaufnebenkosten", value: Formatters.formatCurrencyRounded(closingCosts))
                readonlyRow("+ Renovierung", value: Formatters.formatCurrencyRounded(renovation))
                Divider()
                HStack {
                    Text("= Gesamtinvestment")
                        .font(.appRowLabel.weight(.bold))
                        .foregroundStyle(Color.appPrimaryText)
                    Spacer()
                    Text(Formatters.formatCurrencyRounded(totalInvestment))
                        .font(.appMono.weight(.bold))
                        .foregroundStyle(Color.appPrimaryText)
                }
            }
            .padding(20)
        }
    }

    @ViewBuilder
    private func currencyField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField("0", text: text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.decimalPad)
        }
    }

    @ViewBuilder
    private func readonlyRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appRowLabel)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }
}
