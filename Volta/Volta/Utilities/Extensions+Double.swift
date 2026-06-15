import Foundation

extension Double {
    var asCurrency: String { Formatters.formatCurrency(self) }
    var asCurrencyRounded: String { Formatters.formatCurrencyRounded(self) }
    var asPercent: String { Formatters.formatPercent(self) }
    var asPercentOneDecimal: String { Formatters.formatPercentOneDecimal(self) }
    var asMultiplier: String { Formatters.formatMultiplier(self) }
}
