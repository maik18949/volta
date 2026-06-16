import XCTest
@testable import Volta

final class DateExtensionsTests: XCTestCase {
    func test_day_returnsUTCDayComponent() {
        let d = Date.firstDay(year: 2026, month: 6, day: 15)
        XCTAssertEqual(d.day, 15)
    }

    func test_daysInMonth_june() {
        XCTAssertEqual(Date.firstDay(year: 2026, month: 6).daysInMonth(), 30)
    }

    func test_daysInMonth_february_nonLeap() {
        XCTAssertEqual(Date.firstDay(year: 2026, month: 2).daysInMonth(), 28)
    }

    func test_daysInMonth_february_leap() {
        XCTAssertEqual(Date.firstDay(year: 2028, month: 2).daysInMonth(), 29)
    }

    func test_firstDay_withDay_createsCorrectDate() {
        let d = Date.firstDay(year: 2026, month: 6, day: 16)
        XCTAssertEqual(d.year, 2026)
        XCTAssertEqual(d.month, 6)
        XCTAssertEqual(d.day, 16)
    }
}
