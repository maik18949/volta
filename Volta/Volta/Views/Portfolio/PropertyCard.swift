import SwiftUI

struct PropertyCard: View {
    let vm: PropertyViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(vm.property.name)
                        .font(.appHeadline)
                        .foregroundStyle(Color.appPrimaryText)
                        .lineLimit(1)
                    Text("\(vm.property.city) · \(Formatters.formatCurrencyRounded(vm.purchasePrice))")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }
                Spacer()
                if let status = vm.currentStatus {
                    StatusBadge(status: status.status)
                }
            }

            Divider()

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                cardKPI(label: "Bruttorendite", value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
                cardKPI(label: "Kaufpreisfaktor", value: vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–")
                cardKPI(label: "Cashflow/Mon", value: Formatters.formatCurrencyRounded(vm.cashflowAfterDebtMonthly),
                        valueColor: Color.valueColor(vm.cashflowAfterDebtMonthly))
                cardKPI(label: "Nettorendite", value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            }
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }

    @ViewBuilder
    private func cardKPI(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
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
