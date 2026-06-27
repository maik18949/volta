import XCTest
@testable import Volta

final class CashflowCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_ownerBorneRecoverable_vermietet_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_ownerBorneRecoverable_leerstand_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstand,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_mietgarantie_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .mietgarantie,
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: f.propertyTaxMonthly,
            propertyInsuranceMonthly: 0.0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_cashflowBeforeTax_vermietet() {
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: 0.0,
            extraordinaryCostsThisMonth: 0.0
        )
        XCTAssertEqual(result, -485.61, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_leerstand() {
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 0.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: f.operatingCostsRecoverableMonthly,
            extraordinaryCostsThisMonth: 0.0
        )
        XCTAssertEqual(result, -1744.69, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_withExtraordinaryCost() {
        let result = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: 0.0,
            extraordinaryCostsThisMonth: 500.0
        )
        XCTAssertEqual(result, -985.61, accuracy: 0.01)
    }

    func test_cashflowAfterTax() {
        let result = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: -485.61,
            taxEffectMonthly: f.taxEffectMonthly
        )
        XCTAssertEqual(result, -136.51, accuracy: 0.01)
    }
}
