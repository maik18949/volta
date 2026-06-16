import Foundation

struct StatusSegment {
    let status: PropertyStatus
    let incomeActualMonthly: Double
    let dayFraction: Double
}

enum StatusPeriodCalculator {

    /// Breaks a calendar month into StatusSegments based on status history.
    /// Days after `today` within the current month are projected using the last known status.
    static func segments(
        month: Date,
        statusHistory: [StatusEntry],
        today: Date
    ) -> [StatusSegment] {
        let totalDays = month.daysInMonth()
        let sorted = statusHistory.sorted { $0.statusFrom < $1.statusFrom }
        let monthStart = month.firstDayOfMonth

        // Collect transition days within this month (day numbers that start a new status)
        var transitionDays: [Int] = [1]
        for entry in sorted {
            let entryMonth = entry.statusFrom.firstDayOfMonth
            if entryMonth == monthStart {
                let d = entry.statusFrom.day
                if d > 1 && !transitionDays.contains(d) {
                    transitionDays.append(d)
                }
            }
        }
        // Add today+1 as a transition point if we're in the current month
        // (to split actual vs projected days)
        let todayMonth = today.firstDayOfMonth
        if todayMonth == monthStart {
            let tomorrowDay = today.day + 1
            if tomorrowDay <= totalDays && !transitionDays.contains(tomorrowDay) {
                transitionDays.append(tomorrowDay)
            }
        }
        transitionDays.sort()

        var result: [StatusSegment] = []
        for i in 0..<transitionDays.count {
            let startDay = transitionDays[i]
            let endDay = i + 1 < transitionDays.count ? transitionDays[i + 1] - 1 : totalDays
            let days = endDay - startDay + 1

            // Date representing this segment's start — capped at today for projection
            let segmentDate = Date.firstDay(year: month.year, month: month.month, day: startDay)
            let lookupDate = segmentDate <= today ? segmentDate : today

            let activeEntry = sorted.filter { $0.statusFrom <= lookupDate }.last

            result.append(StatusSegment(
                status: activeEntry?.status ?? .leerstand,
                incomeActualMonthly: activeEntry?.incomeActualMonthly ?? 0,
                dayFraction: Double(days) / Double(totalDays)
            ))
        }
        return result
    }

    /// Monthly income from all status segments (tagesgenau).
    /// Vermietet: uses settings (coldRent + parking). Mietgarantie: uses entry income. Others: 0.
    static func incomeForMonth(
        _ month: Date,
        statusHistory: [StatusEntry],
        today: Date,
        coldRentMonthly: Double,
        parkingRentMonthly: Double
    ) -> Double {
        segments(month: month, statusHistory: statusHistory, today: today)
            .reduce(0.0) { sum, seg in
                switch seg.status {
                case .vermietet:
                    return sum + (coldRentMonthly + parkingRentMonthly) * seg.dayFraction
                case .leerstandMietgarantie:
                    return sum + seg.incomeActualMonthly * seg.dayFraction
                default:
                    return sum
                }
            }
    }

    /// Sum of dayFractions where the status is NOT vermietet.
    /// Used by TaxCalculator to determine how much of the month is owner-borne for recoverable costs.
    static func leerstandDayFraction(
        month: Date,
        statusHistory: [StatusEntry],
        today: Date
    ) -> Double {
        segments(month: month, statusHistory: statusHistory, today: today)
            .filter { $0.status != .vermietet }
            .reduce(0.0) { $0 + $1.dayFraction }
    }

    /// Fraction of the month owned (0.0 if before acquisition, 1.0 for full months, partial for acquisition month).
    static func ownershipDayFraction(month: Date, economicTransferDate: Date) -> Double {
        let monthStart = month.firstDayOfMonth
        let transferMonth = economicTransferDate.firstDayOfMonth

        if monthStart < transferMonth { return 0.0 }
        if monthStart > transferMonth { return 1.0 }

        // Same month: count days from transfer day to end of month
        let totalDays = month.daysInMonth()
        let transferDay = economicTransferDate.day
        let ownedDays = totalDays - transferDay + 1
        return Double(ownedDays) / Double(totalDays)
    }
}
