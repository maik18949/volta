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
}
