import XCTest
@testable import Volta

final class KPICalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_grossYield() {
        let result = KPICalculator.grossYield(
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.04297, accuracy: 0.0001)
    }

    func test_grossYield_zeroPurchasePrice_returnsNil() {
        let result = KPICalculator.grossYield(
            coldRentYearly: 11_400, parkingRentYearly: 576, purchasePrice: 0)
        XCTAssertNil(result)
    }

    func test_netYield() {
        let result = KPICalculator.netYield(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            totalInvestment: f.totalInvestment
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03114, accuracy: 0.0001)
    }

    func test_netYield_zeroInvestment_returnsNil() {
        let result = KPICalculator.netYield(netOperatingIncomeYearly: 9_303, totalInvestment: 0)
        XCTAssertNil(result)
    }

    func test_capRate() {
        let result = KPICalculator.capRate(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03339, accuracy: 0.0001)
    }

    func test_cashOnCashReturn() {
        let result = KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: f.cashflowAfterDebtYearly,
            equityUsed: f.equityUsed
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, -0.08163, accuracy: 0.0001)
    }

    func test_cashOnCashReturn_zeroEquity_returnsNil() {
        let result = KPICalculator.cashOnCashReturn(cashflowAfterDebtYearly: -5_000, equityUsed: 0)
        XCTAssertNil(result)
    }

    func test_dscrNOI() {
        let result = KPICalculator.dscrNOI(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            debtServiceAnnual: f.debtServiceAnnual
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.6238, accuracy: 0.001)
    }

    func test_dscrNOI_zeroDebtService_returnsNil() {
        let result = KPICalculator.dscrNOI(netOperatingIncomeYearly: 9_000, debtServiceAnnual: 0)
        XCTAssertNil(result)
    }

    func test_mietmultiplikator() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: f.purchasePrice,
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 23.26, accuracy: 0.01)
    }

    func test_mietmultiplikator_zeroRent_returnsNil() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: 278_600, coldRentYearly: 0, parkingRentYearly: 0)
        XCTAssertNil(result)
    }

    func test_breakEvenRentMonthly() {
        let result = KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
            monthlyMortgage: f.monthlyMortgageActual
        )
        XCTAssertEqual(result, 1_435.61, accuracy: 0.01)
    }
}
