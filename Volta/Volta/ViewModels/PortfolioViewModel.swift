import Foundation
import Observation

@Observable
class PortfolioViewModel {
    private let viewModels: [PropertyViewModel]

    init(properties: [Property]) {
        self.viewModels = properties.map { PropertyViewModel(property: $0) }
    }

    var totalInvestment: Double {
        viewModels.reduce(0) { $0 + $1.totalInvestment }
    }

    var totalDebt: Double {
        viewModels.reduce(0) { $0 + $1.remainingDebtNow }
    }

    var portfolioLTV: Double? {
        guard totalInvestment > 0 else { return nil }
        return totalDebt / totalInvestment
    }

    var portfolioGrossIncomeYearly: Double {
        viewModels.reduce(0) { $0 + $1.grossIncomeYearly }
    }

    var portfolioNOIYearly: Double {
        viewModels.reduce(0) { $0 + $1.netOperatingIncomeYearly }
    }

    var portfolioNetYield: Double? {
        guard totalInvestment > 0 else { return nil }
        return portfolioNOIYearly / totalInvestment
    }

    var portfolioCashflowMonthly: Double {
        viewModels.reduce(0) { $0 + $1.cashflowAfterDebtMonthly }
    }

    var portfolioEquityTotal: Double {
        viewModels.reduce(0) { $0 + $1.equityUsed }
    }

    var portfolioCashOnCash: Double? {
        guard portfolioEquityTotal > 0 else { return nil }
        let totalCashflowYearly = viewModels.reduce(0) { $0 + $1.cashflowAfterDebtYearly }
        return totalCashflowYearly / portfolioEquityTotal
    }
}
