import Foundation

extension Date {
    // All date arithmetic uses a fixed UTC Gregorian calendar to avoid timezone-boundary bugs
    // (e.g. a date near midnight could land in the previous month in UTC−N timezones).
    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    /// Returns a Date set to the first day of this date's month, at midnight UTC.
    var firstDayOfMonth: Date {
        let components = Date.utcCalendar.dateComponents([.year, .month], from: self)
        return Date.utcCalendar.date(from: components) ?? self
    }

    /// Number of complete calendar months between self and another date.
    /// Returns nil if other < self.
    func monthsBetween(_ other: Date) -> Int? {
        guard other >= self else { return nil }
        let components = Date.utcCalendar.dateComponents([.month], from: self.firstDayOfMonth, to: other.firstDayOfMonth)
        return components.month
    }

    /// Returns the month (1–12) of this date, in UTC.
    var month: Int {
        Date.utcCalendar.component(.month, from: self)
    }

    /// Returns the year of this date, in UTC.
    var year: Int {
        Date.utcCalendar.component(.year, from: self)
    }

    /// Returns a Date by adding `months` calendar months, in UTC.
    func addingMonths(_ months: Int) -> Date {
        Date.utcCalendar.date(byAdding: .month, value: months, to: self) ?? self
    }

    /// Returns a Date for the first day of a given year and month (UTC).
    static func firstDay(year: Int, month: Int) -> Date {
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = 1
        return utcCalendar.date(from: comps) ?? Date()
    }

    /// Remaining months in the calendar year after this date's month (inclusive of this month).
    var remainingMonthsInYear: Int {
        13 - self.month
    }
}
