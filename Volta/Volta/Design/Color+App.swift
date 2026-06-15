import SwiftUI

extension Color {
    // MARK: - Accent
    static let appAccent = Color(hex: "#2563EB")

    // MARK: - Status / Value colours
    static let appPositive = Color(hex: "#16A34A")
    static let appNegative = Color(hex: "#DC2626")

    // MARK: - Backgrounds
    static let appContentBackground = Color(
        light: Color(hex: "#FFFFFF"),
        dark: Color(hex: "#111827")
    )
    static let appCardBackground = Color(
        light: Color(hex: "#F5F5F5"),
        dark: Color(hex: "#1F2937")
    )
    static let appSidebarBackground = Color(
        light: Color(hex: "#F5F5F5"),
        dark: Color(hex: "#0D1117")
    )

    // MARK: - Text
    static let appPrimaryText = Color(
        light: Color(hex: "#111827"),
        dark: Color(hex: "#F9FAFB")
    )
    static let appSecondaryText = Color(
        light: Color(hex: "#6B7280"),
        dark: Color(hex: "#9CA3AF")
    )
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }

    init(light: Color, dark: Color) {
        self.init(NSColor(name: nil, dynamicProvider: { appearance in
            appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
                ? NSColor(dark)
                : NSColor(light)
        }))
    }
}

extension Color {
    static func valueColor(_ value: Double) -> Color {
        value >= 0 ? .appPositive : .appNegative
    }
}
