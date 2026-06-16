import XCTest
@testable import Volta

final class StatusPeriodCalculatorTests: XCTestCase {

    private func makeEntry(_ status: PropertyStatus, year: Int, month: Int, day: Int = 1, income: Double = 0) -> StatusEntry {
        StatusEntry(statusFrom: Date.firstDay(year: year, month: month, day: day),
                    status: status, incomeActualMonthly: income)
    }

    func test_incomeForMonth_allVermietet() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 998.0, accuracy: 0.01)
    }

    func test_incomeForMonth_allLeerstand() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.leerstand, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }

    func test_incomeForMonth_mietgarantie_usesEntryIncome() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.leerstandMietgarantie, year: 2026, month: 2, income: 999)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 999.0, accuracy: 0.01)
    }

    func test_incomeForMonth_midMonthTransition_leerstandToVermietet() {
        // Jun 1–15: leerstand, Jun 16–30: vermietet (30-day month)
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [
            makeEntry(.leerstand,   year: 2026, month: 2),
            makeEntry(.vermietet,   year: 2026, month: 6, day: 16)
        ]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        // vermietet: 15 days / 30 days × 998
        XCTAssertEqual(result, 998.0 * 15.0 / 30.0, accuracy: 0.01)
    }

    func test_leerstandDayFraction_halfMonth() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [
            makeEntry(.leerstand, year: 2026, month: 2),
            makeEntry(.vermietet, year: 2026, month: 6, day: 16)
        ]
        let result = StatusPeriodCalculator.leerstandDayFraction(
            month: june, statusHistory: history, today: Date.firstDay(year: 2026, month: 12))
        XCTAssertEqual(result, 15.0 / 30.0, accuracy: 0.0001)
    }

    func test_leerstandDayFraction_fullVermietet_isZero() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.leerstandDayFraction(
            month: june, statusHistory: history, today: Date.firstDay(year: 2026, month: 12))
        XCTAssertEqual(result, 0.0, accuracy: 0.0001)
    }

    func test_incomeForMonth_futureMont_projectsLastStatus() {
        let dec = Date.firstDay(year: 2026, month: 12)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let today = Date.firstDay(year: 2026, month: 6)  // today is June
        let result = StatusPeriodCalculator.incomeForMonth(dec, statusHistory: history,
                      today: today, coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 998.0, accuracy: 0.01)
    }

    func test_ownershipDayFraction_acquisitionMonthNotFirst() {
        // Feb 15 as economicTransferDate → 14 days owned out of 28
        let feb2026 = Date.firstDay(year: 2026, month: 2)
        let economicTransfer = Date.firstDay(year: 2026, month: 2, day: 15)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: feb2026, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 14.0 / 28.0, accuracy: 0.0001)
    }

    func test_ownershipDayFraction_fullMonth() {
        let mar = Date.firstDay(year: 2026, month: 3)
        let economicTransfer = Date.firstDay(year: 2026, month: 2)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: mar, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 1.0, accuracy: 0.0001)
    }

    func test_ownershipDayFraction_beforeAcquisition_isZero() {
        let jan = Date.firstDay(year: 2026, month: 1)
        let economicTransfer = Date.firstDay(year: 2026, month: 2)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: jan, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 0.0, accuracy: 0.0001)
    }
}
