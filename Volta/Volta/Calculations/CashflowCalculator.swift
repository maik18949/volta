import Foundation

enum CashflowCalculator {

    /// Umlagefähige Kosten die der Eigentümer trägt.
    /// WE-Kosten: nur bei Nicht-Vermietung. Stellplatz-Kosten: immer.
    static func ownerBorneRecoverableCosts(
        status: PropertyStatus,
        hoaUnitRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxUnitMonthly: Double,
        propertyTaxParkingMonthly: Double
    ) -> Double {
        let parkingPart = hoaParkingRecoverableMonthly + propertyTaxParkingMonthly
        switch status {
        case .vermietet:
            return parkingPart
        default:
            return hoaUnitRecoverableMonthly + propertyTaxUnitMonthly + parkingPart
        }
    }

    /// Cashflow vor Steuer für einen Monat.
    static func cashflowBeforeTax(
        incomeActualMonthly: Double,
        monthlyMortgage: Double,
        operatingCostsNonRecoverableMonthly: Double,
        ownerBorneRecoverableMonthly: Double,
        extraordinaryCostsThisMonth: Double
    ) -> Double {
        incomeActualMonthly
            - monthlyMortgage
            - operatingCostsNonRecoverableMonthly
            - ownerBorneRecoverableMonthly
            - extraordinaryCostsThisMonth
    }

    /// Cashflow nach Steuer = vor Steuer + monatlicher Steuereffekt.
    /// taxEffectMonthly ist positiv wenn Verlust (Steuererstattung).
    static func cashflowAfterTax(cashflowBeforeTax: Double, taxEffectMonthly: Double) -> Double {
        cashflowBeforeTax + taxEffectMonthly
    }

    /// Effektives monatliches Bruttoeinkommen (Prognose).
    static func effectiveGrossIncomeMonthly(grossIncomeMonthly: Double, vacancyRate: Double) -> Double {
        grossIncomeMonthly * (1.0 - vacancyRate)
    }

    /// Prognose-Cashflow nach Schuldendienst (Soll-Wert, monatlich).
    static func cashflowAfterDebtMonthly(
        effectiveGrossIncomeMonthly: Double,
        operatingCostsNonRecoverableMonthly: Double,
        monthlyMortgage: Double
    ) -> Double {
        effectiveGrossIncomeMonthly - operatingCostsNonRecoverableMonthly - monthlyMortgage
    }
}
