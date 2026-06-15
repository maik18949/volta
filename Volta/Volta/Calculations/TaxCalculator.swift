import Foundation

enum TaxCalculator {

    /// Zu versteuerndes V+V-Ergebnis (vereinfacht, ohne Progression).
    static func taxableIncomeVV(
        effectiveGrossIncomeYearly: Double,
        operatingCostsNonRecoverableYearly: Double,
        interestAnnual: Double,
        depreciationYearly: Double
    ) -> Double {
        effectiveGrossIncomeYearly
            - operatingCostsNonRecoverableYearly
            - interestAnnual
            - depreciationYearly
    }

    /// Steuereffekt jährlich: negatives Ergebnis × Grenzsteuersatz × (−1)
    static func taxEffectYearly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxableIncomeVV * marginalTaxRate * -1.0
    }

    /// Monatlicher Steuereffekt = jährlicher Effekt / 12.
    static func taxEffectMonthly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxEffectYearly(taxableIncomeVV: taxableIncomeVV, marginalTaxRate: marginalTaxRate) / 12.0
    }

    /// Jahresinteressen (für Werbungskosten-Berechnung).
    static func interestAnnual(loanAmount: Double, interestRate: Double) -> Double {
        loanAmount * interestRate
    }
}
