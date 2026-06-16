import Foundation

enum AmortizationCalculator {

    struct AnnuityRow: Identifiable {
        let id: Int         // month index (1-based)
        let date: Date
        let interest: Double
        let principal: Double
        let payment: Double
        let remainingDebt: Double
    }

    /// Berechnete monatliche Rate (Zins + Tilgung) — kann durch monthlyMortgageActual überschrieben werden.
    static func monthlyMortgageCalc(loanAmount: Double, interestRate: Double, amortizationRate: Double) -> Double {
        let interestMonthly = loanAmount * (interestRate / 12.0)
        let principalMonthly = loanAmount * (amortizationRate / 12.0)
        return interestMonthly + principalMonthly
    }

    /// Effektive monatliche Rate: nimmt `monthlyMortgageActual` wenn gesetzt, sonst berechnet.
    static func effectiveMonthlyMortgage(
        loanAmount: Double,
        interestRate: Double,
        amortizationRate: Double,
        monthlyMortgageActual: Double?
    ) -> Double {
        if let actual = monthlyMortgageActual, actual > 0 {
            return actual
        }
        return monthlyMortgageCalc(loanAmount: loanAmount, interestRate: interestRate, amortizationRate: amortizationRate)
    }

    /// Dynamische Restschuld nach t Monaten (Annuitätenformel).
    /// t = 0 gibt das Ausgangsdarlehen zurück.
    static func remainingDebt(
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        atMonth t: Int
    ) -> Double {
        guard t > 0 else { return loanAmount }
        let r = interestRate / 12.0
        guard r > 0 else {
            return loanAmount - monthlyPayment * Double(t)
        }
        let factor = pow(1.0 + r, Double(t))
        return loanAmount * factor - monthlyPayment * (factor - 1.0) / r
    }

    /// Total interest paid within a calendar year, using the amortization schedule.
    /// Only counts months that fall within `year`. Months before loanStartDate are excluded.
    static func interestForCalendarYear(
        year: Int,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double
    ) -> Double {
        guard loanAmount > 0, interestRate > 0, monthlyPayment > 0 else { return 0 }
        guard loanStartDate.year <= year else { return 0 }

        let yearEnd = Date.firstDay(year: year, month: 12, day: 31)
        guard let totalMonths = loanStartDate.monthsBetween(yearEnd), totalMonths > 0 else { return 0 }

        let schedule = amortizationSchedule(
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyPayment: monthlyPayment,
            loanStartDate: loanStartDate,
            months: totalMonths + 1
        )

        return schedule
            .filter { $0.date.year == year }
            .reduce(0.0) { $0 + $1.interest }
    }

    /// Tilgungsplan als Array von AnnuityRow, beginnend ab loanStartDate.
    static func amortizationSchedule(
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        loanStartDate: Date,
        months: Int
    ) -> [AnnuityRow] {
        let r = interestRate / 12.0
        var rows: [AnnuityRow] = []
        var currentDebt = loanAmount

        for t in 1...max(1, months) {
            let interest = currentDebt * r
            let principal = monthlyPayment - interest
            currentDebt -= principal
            let date = loanStartDate.addingMonths(t - 1)
            rows.append(AnnuityRow(
                id: t,
                date: date,
                interest: interest,
                principal: max(0, principal),
                payment: monthlyPayment,
                remainingDebt: max(0, currentDebt)
            ))
        }
        return rows
    }
}
