import SwiftUI

struct InvestmentKPIPanel: View {
    let vm: InvestmentCalculatorViewModel

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                panelKPI(
                    label: "Kaufpreisfaktor",
                    value: vm.hasBaseData ? (vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–") : "–",
                    isUnlocked: vm.hasBaseData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Bruttorendite",
                    value: vm.hasBaseData ? (vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasBaseData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Cashflow/Mon",
                    value: vm.hasFinancingData ? Formatters.formatCurrencyRounded(vm.cashflowAfterDebtMonthly) : "–",
                    valueColor: vm.hasFinancingData ? Color.valueColor(vm.cashflowAfterDebtMonthly) : .appSecondaryText,
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Nettorendite",
                    value: vm.hasCostData ? (vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasCostData
                )
            }

            Divider()

            HStack(spacing: 0) {
                panelKPI(
                    label: "Cash-on-Cash",
                    value: vm.hasCostData ? (vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasCostData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "Break-Even-Miete",
                    value: vm.hasFinancingData ? (vm.breakEvenRentMonthly.map { Formatters.formatCurrencyRounded($0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "DSCR",
                    value: vm.hasFinancingData ? (vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
                Divider().frame(height: 50)
                panelKPI(
                    label: "LTV",
                    value: vm.hasFinancingData ? (vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–") : "–",
                    isUnlocked: vm.hasFinancingData
                )
            }

            if vm.hasTaxData {
                Divider()
                HStack {
                    Image(systemName: "arrow.right")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    Text("Nach Steuer: \(Formatters.formatCurrencyRounded(vm.cashflowAfterTaxMonthly))/Mon")
                        .font(.appCaption)
                        .foregroundStyle(Color.valueColor(vm.cashflowAfterTaxMonthly))
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 16)
            }
        }
        .background(Color.appCardBackground)
    }

    @ViewBuilder
    private func panelKPI(label: String, value: String, valueColor: Color = .appPrimaryText,
                          isUnlocked: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(isUnlocked ? valueColor : Color.appSecondaryText.opacity(0.4))
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .topTrailing) {
            if !isUnlocked {
                Image(systemName: "lock")
                    .font(.system(size: 9))
                    .foregroundStyle(Color.appSecondaryText.opacity(0.4))
                    .padding(4)
            }
        }
    }
}
