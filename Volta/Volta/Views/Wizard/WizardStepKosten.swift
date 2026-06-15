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
