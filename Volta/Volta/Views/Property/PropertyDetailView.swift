import SwiftUI

struct PropertyDetailView: View {
    let property: Property
    @State private var selectedTab = 0

    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    var body: some View {
        VStack(spacing: 0) {
            propertyHeader

            Divider()

            TabView(selection: $selectedTab) {
                OverviewTab(vm: vm)
                    .tabItem { Label("Übersicht", systemImage: "house") }
                    .tag(0)
                CashflowTab(vm: vm)
                    .tabItem { Label("Cashflow", systemImage: "eurosign.circle") }
                    .tag(1)
                TaxTab(vm: vm)
                    .tabItem { Label("Steuer", systemImage: "percent") }
                    .tag(2)
                FinancingTab(vm: vm)
                    .tabItem { Label("Finanzierung", systemImage: "chart.line.downtrend.xyaxis") }
                    .tag(3)
                SettingsTab(property: property)
                    .tabItem { Label("Einstellungen", systemImage: "gear") }
                    .tag(4)
            }
        }
        .navigationTitle(property.name)
        .background(Color.appContentBackground)
    }

    private var propertyHeader: some View {
        HStack(spacing: 24) {
            VStack(alignment: .leading, spacing: 4) {
                Text(property.name)
                    .font(.appHeadline)
                    .foregroundStyle(Color.appPrimaryText)
                Text("\(property.address), \(property.postalCode) \(property.city)")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
            }

            Spacer()

            headerKPI(label: "Kaufpreis", value: Formatters.formatCurrencyRounded(vm.purchasePrice))
            headerKPI(label: "Gesamtinvestment", value: Formatters.formatCurrencyRounded(vm.totalInvestment))
            headerKPI(label: "Bruttorendite", value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            headerKPI(label: "Nettorendite", value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–")
            headerKPI(label: "LTV", value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                      valueColor: vm.ltvRatio.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText)

            if let status = vm.currentStatus {
                StatusBadge(status: status.status)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(Color.appCardBackground)
    }

    @ViewBuilder
    private func headerKPI(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(valueColor)
        }
    }
}
