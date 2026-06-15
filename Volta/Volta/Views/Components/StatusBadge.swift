import SwiftUI

struct StatusBadge: View {
    let status: PropertyStatus

    private var label: String { status.rawValue }

    private var color: Color {
        switch status {
        case .vermietet:             return .appPositive
        case .leerstandMietgarantie: return Color(hex: "#D97706")
        case .leerstand:             return .appNegative
        case .eigennutzung:          return .appAccent
        case .renovierung:           return Color(hex: "#7C3AED")
        }
    }

    var body: some View {
        Text(label)
            .font(.appCaption)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}
