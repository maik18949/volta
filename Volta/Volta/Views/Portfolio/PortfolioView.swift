import SwiftUI
import SwiftData

enum SortMode: String, CaseIterable {
    case date = "Datum"
    case az = "A–Z"
    case manual = "Manuell"
}

struct PortfolioView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var allProperties: [Property]
    @State private var sortMode: SortMode = .date
    @State private var propertyToDelete: Property? = nil
    @State private var showDeleteConfirmation = false

    private var sortedProperties: [Property] {
        switch sortMode {
        case .date:
            return allProperties.sorted { $0.economicTransferDate > $1.economicTransferDate }
        case .az:
            return allProperties.sorted { $0.name < $1.name }
        case .manual:
            return allProperties.sorted { $0.sortOrder < $1.sortOrder }
        }
    }

    var body: some View {
        ZStack {
            AppBackground()
                .ignoresSafeArea()

            if allProperties.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        PortfolioCard(properties: allProperties)
                            .padding(.horizontal, 16)

                        Picker("Sortierung", selection: $sortMode) {
                            ForEach(SortMode.allCases, id: \.self) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 16)

                        ForEach(sortedProperties) { property in
                            NavigationLink(destination: PropertyDetailView(property: property)) {
                                PropertyCard(property: property)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 16)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    propertyToDelete = property
                                    showDeleteConfirmation = true
                                } label: {
                                    Label("Löschen", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .padding(.vertical, 16)
                }
            }
        }
        .navigationTitle("Volta")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink(destination: PropertySetupView()) {
                    Image(systemName: "plus")
                }
                .tint(.appAccent)
            }
            ToolbarItem(placement: .secondaryAction) {
                Menu {
                    ForEach(SortMode.allCases, id: \.self) { mode in
                        Button {
                            sortMode = mode
                        } label: {
                            HStack {
                                Text(mode.rawValue)
                                if sortMode == mode {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog(
            "\(propertyToDelete?.name ?? "") löschen?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Löschen", role: .destructive) {
                if let prop = propertyToDelete {
                    modelContext.delete(prop)
                    propertyToDelete = nil
                }
            }
            Button("Abbrechen", role: .cancel) {
                propertyToDelete = nil
            }
        } message: {
            Text("Diese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "house")
                .font(.system(size: 60))
                .foregroundStyle(Color.appDimText)
            VStack(spacing: 8) {
                Text("Noch keine Immobilie.")
                    .font(.appHeadline)
                    .foregroundStyle(Color.appPrimaryText)
                Text("Füge deine erste Immobilie hinzu.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
            }
            NavigationLink(destination: PropertySetupView()) {
                Label("Immobilie hinzufügen", systemImage: "plus")
                    .font(.appBody.weight(.medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.appAccent)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

