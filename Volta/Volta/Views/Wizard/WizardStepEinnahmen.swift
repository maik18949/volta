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
            CurrencyField(label: "Bruttomiete/Monat (informativ)", value: $state.warmmieteMonthly)
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
