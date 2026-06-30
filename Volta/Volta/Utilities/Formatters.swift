import Foundation

/// Shared formatter instances. Always use these — never call .formatted() directly in Views.
enum Formatters {
    static let currency: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    static let currencyRounded: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 0
        return f
    }()

    static let percent: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 2
        return f
    }()

    static let percentOneDecimal: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 1
        return f
    }()

    static let multiplier: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "de_DE")
        f.minimumFractionDigits = 1
        f.maximumFractionDigits = 1
        f.positiveSuffix = "×"
        return f
    }()

    static func formatCurrency(_ value: Double) -> String {
        currency.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatCurrencyRounded(_ value: Double) -> String {
        currencyRounded.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatPercent(_ value: Double) -> String {
        percent.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatPercentOneDecimal(_ value: Double) -> String {
        percentOneDecimal.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatMultiplier(_ value: Double) -> String {
        multiplier.string(from: NSNumber(value: value)) ?? "–"
    }

    static func formatOptionalCurrency(_ value: Double?) -> String {
        guard let value else { return "–" }
        return formatCurrency(value)
    }

    static func formatOptionalPercent(_ value: Double?) -> String {
        guard let value else { return "–" }
        return formatPercent(value)
    }

    /// Format area in sqm — no decimal if whole number, one decimal otherwise
    static func formatAreaSqm(_ value: Double) -> String {
        if value.truncatingRemainder(dividingBy: 1) == 0 {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }

    /// Format room count — no decimal if whole number
    static func formatRooms(_ value: Double) -> String {
        if value.truncatingRemainder(dividingBy: 1) == 0 {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }

    /// Format date as "MM/YY"
    static func formatMonthYear(_ date: Date) -> String {
        let cal = Calendar.current
        let month = cal.component(.month, from: date)
        let year = cal.component(.year, from: date) % 100
        return String(format: "%02d/%02d", month, year)
    }

    /// Format percent input value (already as decimal, e.g. 0.035) for display in text fields (shows 3.5)
    static func formatPercentInput(_ value: Double) -> String {
        let pct = value * 100
        if pct.truncatingRemainder(dividingBy: 1) == 0 {
            return String(Int(pct))
        }
        return String(format: "%.2f", pct)
    }
}
