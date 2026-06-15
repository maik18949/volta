import SwiftUI
import SwiftData

struct PortfolioView: View {
    @Query(sort: \Property.createdAt, order: .reverse) private var properties: [Property]
    @State private var showingAddWizard = false
    @State private var selectedProperty: Property?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(spacing: 0) {
            if properties.isEmpty {
                EmptyStateView(onAddProperty: { showingAddWizard = true })
            } else {
                let portfolioVM = PortfolioViewModel(properties: properties)

                PortfolioKPIView(vm: portfolioVM)

                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(properties) { property in
                            let vm = PropertyViewModel(property: property)
                            PropertyCard(vm: vm)
                                .onTapGesture { selectedProperty = property }
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.appAccent, lineWidth: selectedProperty?.id == property.id ? 2 : 0)
                                )
                        }
                    }
                    .padding(24)
                }
            }
        }
        .navigationTitle("Portfolio")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showingAddWizard = true }) {
                    Label("Immobilie hinzufügen", systemImage: "plus")
                }
                .tint(.appAccent)
            }
        }
    }
}
