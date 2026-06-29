import SwiftUI

/// Blue gradient divider between two sections inside a card (spec-design-system.md)
struct SectionDivider: View {
    var body: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [Color.appAccent.opacity(0.35), Color.clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: 1.5)
            .cornerRadius(2)
    }
}
