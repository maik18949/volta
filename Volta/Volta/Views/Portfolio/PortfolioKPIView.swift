import SwiftUI

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
