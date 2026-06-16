import XCTest
@testable import Volta

final class CashflowCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_ownerBorneRecoverable_vermietet_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_ownerBorneRecoverable_leerstand_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstand,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_mietgarantie_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstandMietgarantie,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_eigennutzung_isFullRecoverable() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .eigennutzung,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: 17.08,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, 309.08, accuracy: 0.01)
    }

    // MARK: - Parking-aware tests

    func test_ownerBorneRecoverable_vermietet_onlyParking() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 50,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 10
        )
        // vermietet: WE recoverable = 0 (Mieter zahlt), Stellplatz = always
        XCTAssertEqual(result, 60.0, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_leerstand_allOwnerBorne() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstand,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 50,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 10
        )
        XCTAssertEqual(result, 369.0, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_noParking_vermietet_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }

    // MARK: - Cashflow calculations

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
