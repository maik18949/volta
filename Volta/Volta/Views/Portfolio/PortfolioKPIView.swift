import SwiftUI

// MARK: - PortfolioCard (new Glass Card design)

struct PortfolioCard: View {
    let properties: [Property]

    private var vms: [PropertyViewModel] { properties.map { PropertyViewModel(property: $0) } }

    private var totalCashflow: Double {
        vms.reduce(0) { $0 + $1.cashflowAfterDebtMonthly }
    }

    private var totalInvestment: Double {
        vms.reduce(0) { $0 + $1.totalInvestment }
    }

    private var avgNetYield: Double? {
        let totalNOI = vms.reduce(0) { $0 + $1.netOperatingIncomeYearly }
        guard totalInvestment > 0 else { return nil }
        return totalNOI / totalInvestment
    }

    private var totalRemainingDebt: Double {
        vms.reduce(0) { $0 + $1.remainingDebtNow }
    }

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                Text("\(properties.count) Immobilien")
                    .font(.appHeadline)
                    .foregroundStyle(Color.appPrimaryText)

                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    alignment: .leading,
                    spacing: 14
                ) {
                    kpiCell(
                        label: "Cashflow/Mon",
                        value: Formatters.formatCurrencyRounded(totalCashflow),
                        valueColor: Color.valueColor(totalCashflow)
                    )
                    kpiCell(
                        label: "Gesamtinvestment",
                        value: Formatters.formatCurrencyRounded(totalInvestment)
                    )
                    kpiCell(
                        label: "Ø Nettorendite",
                        value: avgNetYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–"
                    )
                    kpiCell(
                        label: "Restschuld",
                        value: Formatters.formatCurrencyRounded(totalRemainingDebt)
                    )
                }
            }
            .padding(16)
        }
    }

    @ViewBuilder
    private func kpiCell(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(valueColor)
        }
    }
}

// MARK: - PortfolioKPIView (legacy horizontal scroll — kept for backwards compat)

struct PortfolioKPIView: View {
    let vm: PortfolioViewModel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                KPICard(
                    label: "Gesamt LTV",
                    value: vm.portfolioLTV.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    valueColor: vm.portfolioLTV.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText,
                    width: 150
                )
                KPICard(
                    label: "Portfolio-Rendite",
                    value: vm.portfolioNetYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    width: 150
                )
                KPICard(
                    label: "Cashflow/Mon",
                    value: Formatters.formatCurrencyRounded(vm.portfolioCashflowMonthly),
                    valueColor: Color.valueColor(vm.portfolioCashflowMonthly),
                    width: 150
                )
                KPICard(
                    label: "Cash-on-Cash",
                    value: vm.portfolioCashOnCash.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    width: 150
                )
                KPICard(
                    label: "Gesamtinvestment",
                    value: Formatters.formatCurrencyRounded(vm.totalInvestment),
                    width: 160
                )
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
        }
        .background(Color.appCardBackground.opacity(0.5))
    }
}
