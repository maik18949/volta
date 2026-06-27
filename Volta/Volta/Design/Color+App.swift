import SwiftUI

extension Color {
    // Background gradient
    static let appGradientFrom = Color(hex: "#dce8f8")
    static let appGradientTo   = Color(hex: "#e8f0fb")

    // Accent
    static let appAccent        = Color(hex: "#3b82f6")
    static let appSectionLabel  = Color(hex: "#1d4ed8")

    // Semantic value colours
    static let appPositiveLarge = Color(hex: "#15803d")   // large result values
    static let appPositiveRow   = Color(hex: "#059669")   // row-level positive
    static let appNegative      = Color(hex: "#dc2626")   // negative values

    // Text
    static let appPrimaryText   = Color(hex: "#0f172a")
    static let appSecondaryText = Color(hex: "#475569")
    static let appDimText       = Color(hex: "#94a3b8")

    // Surfaces
    static let appCardBackground = Color.white.opacity(0.80)
    static let appSumRowTint     = Color(hex: "#eff6ff").opacity(0.5)  // sum-row tint (not in design spec)

    // Warning
    static let appWarning = Color(hex: "#D97706")

    // MARK: - Legacy (backwards compat — do not use in new code)
    static let appPositive          = appPositiveRow
    static let appContentBackground = appCardBackground
    static let appSidebarBackground = Color(hex: "#f0f4fb")               // sidebar surface (not in design spec)
}

private extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int & 0xFF)          / 255
        self.init(red: r, green: g, blue: b)
    }
}

extension Color {
    static func valueColor(_ value: Double) -> Color {
        value >= 0 ? .appPositive : .appNegative
    }
}
