import SwiftUI

struct SetupStepEinnahmen: View {
    @Bindable var state: PropertySetupState

    private var coldRent: Double { Double(state.coldRentMonthly) ?? 0 }
    private var warmmiete: Double { Double(state.warmmieteMonthly) ?? 0 }
    private var purchasePrice: Double { Double(state.purchasePriceUnit) ?? 0 }

    private var bruttorendite: Double? {
        guard purchasePrice > 0, coldRent > 0 else { return nil }
        return (coldRent * 12) / purchasePrice
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Einnahmen")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                currencyField("Nettomiete/Monat *", text: $state.coldRentMonthly)
                currencyField("Bruttomiete/Monat (optional)", text: $state.warmmieteMonthly)

                if state.hasParking {
                    currencyField("Parkingmiete/Monat", text: $state.parkingRentMonthly)
                }

                currencyField("Sonstige Einnahmen/Monat", text: $state.otherIncomeMonthly)

                // Zusammenfassung
                Text("ZUSAMMENFASSUNG")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                readonlyRow("Nettomiete / Jahr", value: Formatters.formatCurrencyRounded(coldRent * 12))

                if warmmiete > 0 {
                    readonlyRow("Bruttomiete / Jahr", value: Formatters.formatCurrencyRounded(warmmiete * 12))
                }

                if let rendite = bruttorendite {
                    HStack {
                        Text("Bruttorendite")
                            .font(.appRowLabel)
                            .foregroundStyle(Color.appSecondaryText)
                        Spacer()
                        Text(Formatters.formatPercentOneDecimal(rendite))
                            .font(.appMono.weight(.semibold))
                            .foregroundStyle(rendite >= 0.04 ? Color.appPositive : Color.appNegative)
                    }
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
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
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
