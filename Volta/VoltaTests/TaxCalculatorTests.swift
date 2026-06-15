import XCTest
@testable import Volta

final class TaxCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_taxableIncomeVV() {
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertEqual(result, f.taxableIncomeVV, accuracy: 1.0)
    }

    func test_taxableIncomeVV_isNegativeForTypicalHighLeverageProperty() {
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertLessThan(result, 0)
    }

    func test_taxEffectYearly_negativeTaxableIncome_isPositive() {
        let result = TaxCalculator.taxEffectYearly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectYearly, accuracy: 1.0)
        XCTAssertGreaterThan(result, 0)
    }

    func test_taxEffectYearly_positiveTaxableIncome_isNegative() {
        let result = TaxCalculator.taxEffectYearly(taxableIncomeVV: 5_000, marginalTaxRate: 0.42)
        XCTAssertEqual(result, -2_100.0, accuracy: 0.01)
    }

    func test_taxEffectMonthly() {
        let result = TaxCalculator.taxEffectMonthly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectMonthly, accuracy: 0.10)
    }

    func test_taxEffectMonthly_zeroMarginalRate() {
        let result = TaxCalculator.taxEffectMonthly(taxableIncomeVV: -10_000, marginalTaxRate: 0.0)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }
}
