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

    /// Break-Even-Miete = alle Eigentümer-Kosten im Vermietungsszenario + Kreditrate
    /// Enthält NICHT: propertyTaxAnnual (WE) und hoaFeeRecoverableMonthly (WE) — Mieter zahlt
    static func breakEvenRent(
        hoaFeeNonRecoverableMonthly: Double,
        hoaFeeMaintenanceReserveMonthly: Double,
        hoaFeeParkingNonRecoverableMonthly: Double,
        hoaFeeParkingRecoverableMonthly: Double,
        hoaFeeParkingMaintenanceReserveMonthly: Double,
        propertyTaxParkingAnnual: Double,
        propertyManagementAnnual: Double,
        propertyInsuranceAnnual: Double,
        otherCostsMonthly: Double,
        monthlyMortgage: Double,
        hasParking: Bool
    ) -> Double {
        var result = hoaFeeNonRecoverableMonthly
            + hoaFeeMaintenanceReserveMonthly
            + (propertyManagementAnnual / 12)
            + (propertyInsuranceAnnual / 12)
            + otherCostsMonthly
            + monthlyMortgage
        if hasParking {
            result += hoaFeeParkingNonRecoverableMonthly
                + hoaFeeParkingRecoverableMonthly
                + hoaFeeParkingMaintenanceReserveMonthly
                + (propertyTaxParkingAnnual / 12)
        }
        return result
    }

    /// Tatsächliche Leerstandsquote seit Besitzübergang bis heute
    /// Gibt nil zurück wenn keine StatusEntries vorhanden oder gesamtEigentumstage == 0
    static func actualVacancyRate(
        statusEntries: [StatusEntry],
        economicTransferDate: Date
    ) -> Double? {
        guard !statusEntries.isEmpty else { return nil }
        let today = Date()
        let calendar = Calendar.current
        let totalDays = calendar.dateComponents([.day], from: economicTransferDate, to: today).day ?? 0
        guard totalDays > 0 else { return nil }

        // Sort entries by date ascending
        let sorted = statusEntries.sorted { $0.date < $1.date }

        var vacancyDays = 0
        for (index, entry) in sorted.enumerated() {
            let segmentStart = max(entry.date, economicTransferDate)
            let segmentEnd: Date
            if index + 1 < sorted.count {
                segmentEnd = sorted[index + 1].date
            } else {
                segmentEnd = today
            }
            guard segmentEnd > segmentStart else { continue }
            if entry.status == .leerstand || entry.status == .mietgarantie {
                let days = calendar.dateComponents([.day], from: segmentStart, to: segmentEnd).day ?? 0
                vacancyDays += days
            }
        }
        return Double(vacancyDays) / Double(totalDays)
    }

    /// Wertsteigerung = aktueller Marktwert - Gesamtkaufpreis
    /// Gibt nil zurück wenn currentMarketValue nil, <= 0 oder totalPurchasePrice <= 0
    static func capitalGain(
        currentMarketValue: Double?,
        totalPurchasePrice: Double
    ) -> (absolute: Double, percent: Double)? {
        guard let currentMarketValue, currentMarketValue > 0, totalPurchasePrice > 0 else { return nil }
        let absolute = currentMarketValue - totalPurchasePrice
        let percent = absolute / totalPurchasePrice
        return (absolute, percent)
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
