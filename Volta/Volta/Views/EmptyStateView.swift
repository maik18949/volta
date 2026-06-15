import SwiftUI

struct EmptyStateView: View {
    let onAddProperty: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "building.2")
                .font(.system(size: 60))
                .foregroundStyle(Color.appSecondaryText)

            Text("Noch keine Immobilien")
                .font(.appHeadline)
                .foregroundStyle(Color.appPrimaryText)

            Text("Füge deine erste Immobilie hinzu\num Rendite, Cashflow und Steuereffekt\nim Blick zu behalten.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
                .multilineTextAlignment(.center)

            Button(action: onAddProperty) {
                Label("Erste Immobilie hinzufügen", systemImage: "plus")
                    .font(.appBody.weight(.medium))
            }
            .buttonStyle(.borderedProminent)
            .tint(.appAccent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appContentBackground)
    }
}
