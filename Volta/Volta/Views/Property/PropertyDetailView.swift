import SwiftUI

struct PropertyDetailView: View {
    let property: Property
    @State private var selectedTab = 0

    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    var body: some View {
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
            VerlaufTab(property: property)
                .tabItem { Label("Verlauf", systemImage: "chart.xyaxis.line") }
                .tag(3)
            FinancingTab(vm: vm)
                .tabItem { Label("Finanzierung", systemImage: "chart.line.downtrend.xyaxis") }
                .tag(4)
            ImmobiliendatenTab(property: property)
                .tabItem { Label("Immobiliendaten", systemImage: "doc.text") }
                .tag(5)
        }
        .navigationTitle(property.name)
        .background(Color.appContentBackground)
    }
}
