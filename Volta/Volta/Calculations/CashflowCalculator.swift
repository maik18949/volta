import Foundation

enum CashflowCalculator {

    /// Umlagefähige Kosten die der Eigentümer trägt, abhängig vom Status.
    /// Bei Vermietung zahlt der Mieter — Eigentümer trägt 0.
    /// Bei Leerstand/Eigennutzung/Renovierung trägt der Eigentümer die vollen umlagefähigen Kosten.
    static func ownerBorneRecoverableCosts(
        status: PropertyStatus,
        hoaFeeRecoverableMonthly: Double,
        propertyTaxMonthly: Double,
        propertyInsuranceMonthly: Double
    ) -> Double {
        switch status {
        case .vermietet:
            return 0.0
        case .leerstand, .mietgarantie:
            return hoaFeeRecoverableMonthly + propertyTaxMonthly + propertyInsuranceMonthly
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
