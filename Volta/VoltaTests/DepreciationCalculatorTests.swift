import XCTest
@testable import Volta

final class DepreciationCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_afaBasis() {
        let result = DepreciationCalculator.afaBasis(
            buildingValue: f.buildingValue,
            closingCostsTotal: f.closingCostsTotal,
            purchasePrice: f.purchasePrice,
            renovationAfaEligible: f.renovationAfaEligible
        )
        XCTAssertEqual(result, f.afaBasis, accuracy: 0.10)
    }

    func test_afaBasis_zeroBuilding() {
        let result = DepreciationCalculator.afaBasis(
            buildingValue: 0, closingCostsTotal: 20_000, purchasePrice: 100_000, renovationAfaEligible: 0)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_afaBasis_withRenovation() {
        let result = DepreciationCalculator.afaBasis(
            buildingValue: 200_000, closingCostsTotal: 10_000, purchasePrice: 250_000, renovationAfaEligible: 15_000)
        XCTAssertEqual(result, 223_000.0, accuracy: 0.01)
    }

    func test_depreciationYearly() {
        let result = DepreciationCalculator.depreciationYearly(afaBasis: f.afaBasis, rate: f.depreciationRate)
        XCTAssertEqual(result, f.depreciationYearly, accuracy: 0.10)
    }

    func test_depreciationMonthly() {
        let result = DepreciationCalculator.depreciationMonthly(afaBasis: f.afaBasis, rate: f.depreciationRate)
        XCTAssertEqual(result, f.depreciationMonthly, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_february() {
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis,
            rate: f.depreciationRate,
            economicTransferDate: f.economicTransferDate
        )
        XCTAssertEqual(result, 8_605.62, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_january() {
        let janDate = Date.firstDay(year: 2026, month: 1)
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis, rate: f.depreciationRate, economicTransferDate: janDate)
        XCTAssertEqual(result, f.depreciationYearly, accuracy: 0.10)
    }

    func test_depreciationProratedInAcquisitionYear_december() {
        let decDate = Date.firstDay(year: 2026, month: 12)
        let result = DepreciationCalculator.depreciationProratedInAcquisitionYear(
            afaBasis: f.afaBasis, rate: f.depreciationRate, economicTransferDate: decDate)
        XCTAssertEqual(result, f.depreciationMonthly * 1, accuracy: 0.10)
    }
}
