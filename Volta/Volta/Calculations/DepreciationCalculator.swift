import Foundation

enum DepreciationCalculator {

    /// AfA-Basis = Gebäudewert + (Nebenkosten × Gebäudeanteil) + aktivierungspflichtige Renovierung
    static func afaBasis(
        buildingValue: Double,
        closingCostsTotal: Double,
        purchasePrice: Double,
        renovationAfaEligible: Double
    ) -> Double {
        guard purchasePrice > 0 else { return 0.0 }
        let buildingShareRatio = buildingValue / purchasePrice
        return buildingValue + (closingCostsTotal * buildingShareRatio) + renovationAfaEligible
    }

    /// Jährliche AfA
    static func depreciationYearly(afaBasis: Double, rate: Double) -> Double {
        afaBasis * rate
    }

    /// Monatliche AfA
    static func depreciationMonthly(afaBasis: Double, rate: Double) -> Double {
        depreciationYearly(afaBasis: afaBasis, rate: rate) / 12.0
    }

    /// AfA im Erwerbsjahr: anteilig ab erstem vollen Monat nach wirtschaftlichem Übergang.
    static func depreciationProratedInAcquisitionYear(
        afaBasis: Double,
        rate: Double,
        economicTransferDate: Date
    ) -> Double {
        let monthsRemaining = economicTransferDate.remainingMonthsInYear
        return depreciationMonthly(afaBasis: afaBasis, rate: rate) * Double(monthsRemaining)
    }
}
