import SwiftUI

enum SidebarItem: String, CaseIterable, Identifiable {
    case portfolio = "Portfolio"
    case investmentCalculator = "Investment-Rechner"
    case settings = "Einstellungen"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .portfolio:            return "building.2"
        case .investmentCalculator: return "chart.bar.doc.horizontal"
        case .settings:             return "gear"
        }
    }
}

struct AppShellView: View {
    @State private var selectedItem: SidebarItem = .portfolio

    var body: some View {
        NavigationSplitView(columnVisibility: .constant(.all)) {
            List(SidebarItem.allCases, selection: $selectedItem) { item in
                Label(item.rawValue, systemImage: item.icon)
                    .tag(item)
            }
            .navigationSplitViewColumnWidth(min: 160, ideal: 180, max: 220)
            .navigationTitle("Volta")
        } detail: {
            switch selectedItem {
            case .portfolio:
                NavigationStack {
                    PortfolioView()
                }
            case .investmentCalculator:
                Text("Investment-Rechner — kommt in Plan 5")
                    .foregroundStyle(Color.appSecondaryText)
            case .settings:
                Text("Einstellungen")
                    .foregroundStyle(Color.appSecondaryText)
            }
        }
    }
}

#Preview {
    AppShellView()
        .modelContainer(for: Property.self, inMemory: true)
}
