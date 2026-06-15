import Foundation
@testable import Volta

/// Single shared fixture for all calculator tests.
/// Source: "ETW Dresden Neustadt" — all values manually verified.
enum TestFixtures {
    // MARK: - Raw Input Values

    static let purchasePriceUnit: Double = 263_600.0
    static let purchasePriceParking: Double = 15_000.0
    static let purchasePrice: Double = 278_600.0

    static let landTransferTax: Double = 15_323.0
    static let notaryCosts: Double = 3_631.96
    static let landRegistryCosts: Double = 1_180.0
    static let agentFee: Double = 0.0
    static let appraisalCosts: Double = 0.0
    static let closingCostsTotal: Double = 20_134.96
    static let renovationModernizationCosts: Double = 0.0
    static let renovationAfaEligible: Double = 0.0
    static let totalInvestment: Double = 298_734.96

    static let coldRentMonthly: Double = 950.0
    static let parkingRentMonthly: Double = 48.0
    static let coldRentYearly: Double = 11_400.0
    static let parkingRentYearly: Double = 576.0
    static let vacancyRateAssumption: Double = 0.03
    static let effectiveGrossIncomeYearly: Double = 11_616.72

    static let hoaFeeTotalMonthly: Double = 417.0
    static let hoaFeeRecoverableMonthly: Double = 292.0
    static let hoaFeeNonRecoverableMonthly: Double = 125.0
    static let propertyTaxAnnual: Double = 205.0
    static let propertyTaxMonthly: Double = 17.0833333
    static let propertyManagementAnnual: Double = 396.0
    static let propertyManagementMonthly: Double = 33.0
    static let maintenanceReserveMonthly: Double = 34.76
    static let propertyInsuranceAnnual: Double = 0.0
    static let operatingCostsNonRecoverableMonthly: Double = 192.76
    static let operatingCostsNonRecoverableYearly: Double = 2_313.12
    static let operatingCostsRecoverableMonthly: Double = 309.0833333

    static let netOperatingIncomeYearly: Double = 9_303.60

    static let loanAmount: Double = 230_000.0
    static let interestRate: Double = 0.043
    static let amortizationRate: Double = 0.01
    static let monthlyMortgageActual: Double = 1_242.85
    static let debtServiceAnnual: Double = 14_914.20
    static let interestAnnual: Double = 9_890.0
    static let equityUsed: Double = 68_734.96
    static let cashflowAfterDebtYearly: Double = -5_610.60
    static let cashflowAfterDebtMonthly: Double = -467.55

    static let loanStartDate: Date = Date.firstDay(year: 2025, month: 10)
    static let economicTransferDate: Date = Date.firstDay(year: 2026, month: 2)

    static let landValue: Double = 50_600.0
    static let buildingValue: Double = 228_000.0
    static let depreciationRate: Double = 0.0384
    static let marginalTaxRate: Double = 0.42
    static let afaBasis: Double = 244_477.97
    static let depreciationYearly: Double = 9_387.95
    static let depreciationMonthly: Double = 782.33

    static let taxableIncomeVV: Double = -9_974.35
    static let taxEffectYearly: Double = 4_189.23
    static let taxEffectMonthly: Double = 349.10
}
