import Foundation

/// Pure Swift — no SwiftUI, no SwiftData. All inputs are plain Doubles.
enum KPICalculator {

    /// Bruttorendite = (Kaltmiete jährlich + Parkingmiete jährlich) / Kaufpreis
    static func grossYield(coldRentYearly: Double, parkingRentYearly: Double, purchasePrice: Double) -> Double? {
        guard purchasePrice > 0 else { return nil }
        return (coldRentYearly + parkingRentYearly) / purchasePrice
    }

    /// Nettorendite = NOI / Gesamtinvestment
    static func netYield(netOperatingIncomeYearly: Double, totalInvestment: Double) -> Double? {
        guard totalInvestment > 0 else { return nil }
        return netOperatingIncomeYearly / totalInvestment
    }

    /// Cap Rate = NOI / Kaufpreis (ohne Nebenkosten)
    static func capRate(netOperatingIncomeYearly: Double, purchasePrice: Double) -> Double? {
        guard purchasePrice > 0 else { return nil }
        return netOperatingIncomeYearly / purchasePrice
    }

    /// Cash-on-Cash Return = Cashflow nach Schuldendienst / eingesetztes EK
    static func cashOnCashReturn(cashflowAfterDebtYearly: Double, equityUsed: Double) -> Double? {
        guard equityUsed > 0 else { return nil }
        return cashflowAfterDebtYearly / equityUsed
    }

    /// DSCR (NOI-basiert) = NOI / jährlicher Schuldendienst
    static func dscrNOI(netOperatingIncomeYearly: Double, debtServiceAnnual: Double) -> Double? {
        guard debtServiceAnnual > 0 else { return nil }
        return netOperatingIncomeYearly / debtServiceAnnual
    }

    /// Mietmultiplikator = Kaufpreis / Jahreskaltmiete (inkl. Parking)
    static func mietmultiplikator(purchasePrice: Double, coldRentYearly: Double, parkingRentYearly: Double) -> Double? {
        let totalRent = coldRentYearly + parkingRentYearly
        guard totalRent > 0 else { return nil }
        return purchasePrice / totalRent
    }

    /// Break-Even-Miete = nicht-umlagefähige Kosten + Kreditrate
    static func breakEvenRentMonthly(operatingCostsNonRecoverableMonthly: Double, monthlyMortgage: Double) -> Double {
        operatingCostsNonRecoverableMonthly + monthlyMortgage
    }

    // MARK: - Intermediate helpers (used by ViewModels)

    /// Effektives Bruttoeinkommen = Bruttomiete * (1 - Leerstandsquote)
    static func effectiveGrossIncomeYearly(grossIncomeYearly: Double, vacancyRate: Double) -> Double {
        grossIncomeYearly * (1.0 - vacancyRate)
    }

    /// NOI = effektives Bruttoeinkommen - nicht-umlagefähige Kosten
    static func netOperatingIncomeYearly(effectiveGrossIncomeYearly: Double,
                                          operatingCostsNonRecoverableYearly: Double) -> Double {
        effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly
    }

    /// Cashflow nach Schuldendienst (jährlich)
    static func cashflowAfterDebtYearly(netOperatingIncomeYearly: Double, debtServiceAnnual: Double) -> Double {
        netOperatingIncomeYearly - debtServiceAnnual
    }

    /// Eingesetztes Eigenkapital = Gesamtinvestment - Darlehen
    static func equityUsed(totalInvestment: Double, loanAmount: Double) -> Double {
        totalInvestment - loanAmount
    }

    /// Nicht-umlagefähige Betriebskosten monatlich
    static func operatingCostsNonRecoverableMonthly(hoaFeeNonRecoverable: Double,
                                                      maintenanceReserve: Double,
                                                      propertyManagementMonthly: Double,
                                                      otherCostsMonthly: Double) -> Double {
        hoaFeeNonRecoverable + maintenanceReserve + propertyManagementMonthly + otherCostsMonthly
    }

    /// Umlagefähige Kosten monatlich (Mieter zahlt bei Vermietung)
    static func operatingCostsRecoverableMonthly(hoaFeeRecoverable: Double,
                                                   propertyTaxMonthly: Double,
                                                   propertyInsuranceMonthly: Double) -> Double {
        hoaFeeRecoverable + propertyTaxMonthly + propertyInsuranceMonthly
    }

    /// Gesamtinvestment = Kaufpreis + Kaufnebenkosten + Renovierung
    static func totalInvestment(purchasePrice: Double, closingCostsTotal: Double,
                                 renovationModernizationCosts: Double) -> Double {
        purchasePrice + closingCostsTotal + renovationModernizationCosts
    }

    /// Kaufnebenkosten gesamt
    static func closingCostsTotal(landTransferTax: Double, notaryCosts: Double,
                                   landRegistryCosts: Double, agentFee: Double,
                                   appraisalCosts: Double) -> Double {
        landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts
    }

    /// LTV = Restschuld / Gesamtinvestment
    static func ltvRatio(remainingDebt: Double, totalInvestment: Double) -> Double? {
        guard totalInvestment > 0 else { return nil }
        return remainingDebt / totalInvestment
    }
}
