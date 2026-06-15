import Foundation

extension Date {
    /// Returns a Date set to the first day of this date's month, at midnight UTC.
    var firstDayOfMonth: Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let components = cal.dateComponents([.year, .month], from: self)
        return cal.date(from: components) ?? self
    }

    /// Number of complete calendar months between self and another date.
    /// Returns nil if other < self.
    func monthsBetween(_ other: Date) -> Int? {
        guard other >= self else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let components = cal.dateComponents([.month], from: self.firstDayOfMonth, to: other.firstDayOfMonth)
        return components.month
    }

    /// Returns the month (1–12) of this date.
    var month: Int {
        Calendar.current.component(.month, from: self)
    }

    /// Returns the year of this date.
    var year: Int {
        Calendar.current.component(.year, from: self)
    }

    /// Returns a Date by adding `months` calendar months.
    func addingMonths(_ months: Int) -> Date {
        Calendar.current.date(byAdding: .month, value: months, to: self) ?? self
    }

    /// Returns a Date for the first day of a given year and month (UTC).
    static func firstDay(year: Int, month: Int) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = 1
        return cal.date(from: comps) ?? Date()
    }

    /// Remaining months in the calendar year after this date's month (inclusive of this month).
    var remainingMonthsInYear: Int {
        13 - self.month
    }
}
