import SwiftUI

struct SetupStepKosten: View {
    @Bindable var state: PropertySetupState

    private var nonRecoverableMonthly: Double {
        let total = Double(state.hoaFeeTotalMonthly) ?? 0
        let rec = Double(state.hoaFeeRecoverableMonthly) ?? 0
        let res = Double(state.hoaFeeMaintenanceReserveMonthly) ?? 0
        return max(0, total - rec - res)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Kosten")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                // Wohnung Hausgeld
                HoaFeeSection(
                    title: "HAUSGELD WOHNUNG",
                    total: $state.hoaFeeTotalMonthly,
                    isSplit: $state.isHoaUnitSplit,
                    recoverable: $state.hoaFeeRecoverableMonthly,
                    maintenanceReserve: $state.hoaFeeMaintenanceReserveMonthly
                )

                currencyField("Grundsteuer Wohnung/Jahr *", text: $state.propertyTaxAnnual)
                currencyField("Verwaltung/Jahr", text: $state.propertyManagementAnnual)
                currencyField("Gebäudeversicherung/Jahr", text: $state.propertyInsuranceAnnual)
                currencyField("Sonstige Kosten/Monat", text: $state.otherCostsMonthly)

                // Stellplatz section
                if state.hasParking {
                    Divider()

                    HoaFeeSection(
                        title: "HAUSGELD STELLPLATZ",
                        total: $state.hoaFeeParkingTotalMonthly,
                        isSplit: $state.isHoaParkingSplit,
                        recoverable: $state.hoaFeeParkingRecoverableMonthly,
                        maintenanceReserve: $state.hoaFeeParkingMaintenanceReserveMonthly,
                        infoText: "Hausgeld aufteilen, wenn der Mietvertrag eine Nebenkostenvereinbarung für den Stellplatz enthält."
                    )

                    currencyField("Grundsteuer Stellplatz/Jahr", text: $state.propertyTaxParkingAnnual)
                }

                // Zusammenfassung
                Divider()
                HStack {
                    Text("Nicht umlagefähige Kosten Wohnung/Monat")
                        .font(.appRowLabel.weight(.bold))
                        .foregroundStyle(Color.appPrimaryText)
                    Spacer()
                    Text(Formatters.formatCurrencyRounded(nonRecoverableMonthly))
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
                .decimalKeyboard()
                .textFieldStyle(.roundedBorder)
        }
    }
}
