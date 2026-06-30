import SwiftUI

struct PortfolioCard: View {
    let properties: [Property]

    private var totalCashflowMonthly: Double {
        properties.map { PropertyViewModel(property: $0).cashflowAfterDebtMonthly }.reduce(0, +)
    }

    private var totalPortfolioValue: Double {
        properties.map { PropertyViewModel(property: $0).totalPurchasePrice }.reduce(0, +)
    }

    private var totalRemainingDebt: Double {
        properties.map { PropertyViewModel(property: $0).remainingDebtNow }.reduce(0, +)
    }

    private var totalGrossIncomeMonthly: Double {
        properties.map { PropertyViewModel(property: $0).grossIncomeMonthly }.reduce(0, +)
    }

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Portfolio")
                        .font(.appHeadline)
                        .foregroundStyle(Color.appPrimaryText)
                    Spacer()
                    Text("\(properties.count) Objekte")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }

                Divider()

                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    alignment: .leading,
                    spacing: 12
                ) {
                    kpi(
                        label: "Cashflow/Mon",
                        value: Formatters.formatCurrencyRounded(totalCashflowMonthly),
                        valueColor: Color.valueColor(totalCashflowMonthly)
                    )
                    kpi(
                        label: "Mieteinnahmen/Mon",
                        value: Formatters.formatCurrencyRounded(totalGrossIncomeMonthly)
                    )
                    kpi(
                        label: "Portfoliowert",
                        value: Formatters.formatCurrencyRounded(totalPortfolioValue)
                    )
                    kpi(
                        label: "Restschuld gesamt",
                        value: totalRemainingDebt > 0
                            ? Formatters.formatCurrencyRounded(totalRemainingDebt)
                            : "–"
                    )
                }
            }
            .padding(14)
        }
    }

    @ViewBuilder
    private func kpi(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(valueColor)
        }
    }
}
