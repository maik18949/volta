import Foundation

enum CashflowCalculator {

    // Fixed UTC Gregorian calendar — matches Date extension used throughout the app.
    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    // MARK: - ownerBorneRecoverableCosts (tagesanteilig)

    /// Umlagefähige Kosten die der Eigentümer trägt, tagesanteilig je Status-Abschnitt im Monat.
    /// Bei Vermietung zahlt der Mieter → 0.
    /// Bei Leerstand/Mietgarantie trägt der Eigentümer anteilig.
    static func ownerBorneRecoverableCosts(
        month: Int,
        year: Int,
        statusEntries: [StatusEntry],
        hoaFeeRecoverableMonthly: Double,
        propertyTaxAnnual: Double
    ) -> Double {
        let calendar = utcCalendar
        guard let monthDate = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let range = calendar.range(of: .day, in: .month, for: monthDate) else {
            return 0.0
        }
        let totalDays = Double(range.count)
        let monthStart = monthDate
        guard let monthEnd = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart) else {
            return 0.0
        }

        // Sort entries ascending by date
        let sorted = statusEntries.sorted { $0.date < $1.date }

        // Build segments: each entry's status runs from its date until the next entry's date - 1
        var total = 0.0
        for (index, entry) in sorted.enumerated() {
            let segmentStart = entry.date
            let segmentEnd: Date
            if index + 1 < sorted.count {
                // Next entry starts, so this segment ends the day before
                guard let prev = calendar.date(byAdding: .day, value: -1, to: sorted[index + 1].date) else { continue }
                segmentEnd = prev
            } else {
                // Last entry — runs to end of time; cap at month end
                segmentEnd = Date.distantFuture
            }

            // Intersect segment with the month
            let clampedStart = max(segmentStart, monthStart)
            let clampedEnd = min(segmentEnd, monthEnd)

            guard clampedStart <= clampedEnd else { continue }

            guard let startDay = calendar.dateComponents([.day], from: monthStart, to: clampedStart).day,
                  let endDay = calendar.dateComponents([.day], from: monthStart, to: clampedEnd).day else { continue }

            let daysInSegment = Double(endDay - startDay + 1)
            let fraction = daysInSegment / totalDays

            switch entry.status {
            case .vermietet:
                break // Mieter zahlt → 0
            case .leerstand, .mietgarantie:
                total += (hoaFeeRecoverableMonthly + propertyTaxAnnual / 12.0) * fraction
            }
        }
        return total
    }

    // MARK: - cashflowBeforeTax

    /// Cashflow vor Steuer für einen Monat.
    /// Alle Parameter werden einzeln übergeben damit die Formel transparent und testbar bleibt.
    static func cashflowBeforeTax(
        einnahmen: Double,
        monthlyMortgage: Double,
        hoaFeeNonRecoverableMonthly: Double,
        hoaFeeMaintenanceReserveMonthly: Double,
        propertyInsuranceAnnual: Double,
        propertyManagementAnnual: Double,
        otherCostsMonthly: Double,
        ownerBorneRecoverableCosts: Double,
        hoaFeeParkingNonRecoverableMonthly: Double,
        hoaFeeParkingMaintenanceReserveMonthly: Double,
        hoaFeeParkingRecoverableMonthly: Double,
        propertyTaxParkingAnnual: Double,
        hasParking: Bool,
        extraordinaryCostsMonth: Double
    ) -> Double {
        var result = einnahmen
        result -= monthlyMortgage
        result -= hoaFeeNonRecoverableMonthly
        result -= hoaFeeMaintenanceReserveMonthly
        if propertyInsuranceAnnual > 0 { result -= propertyInsuranceAnnual / 12.0 }
        result -= propertyManagementAnnual / 12.0
        if otherCostsMonthly > 0 { result -= otherCostsMonthly }
        result -= ownerBorneRecoverableCosts
        if hasParking {
            result -= hoaFeeParkingNonRecoverableMonthly
            result -= hoaFeeParkingMaintenanceReserveMonthly
            result -= hoaFeeParkingRecoverableMonthly
            result -= propertyTaxParkingAnnual / 12.0
        }
        result -= extraordinaryCostsMonth
        return result
    }

    // MARK: - cashflowAfterTax

    /// Cashflow nach Steuer = vor Steuer + monatlicher Steuereffekt.
    /// taxEffectMonthly ist positiv wenn Verlust (Steuererstattung).
    static func cashflowAfterTax(cashflowBeforeTax: Double, taxEffectMonthly: Double) -> Double {
        cashflowBeforeTax + taxEffectMonthly
    }

    // MARK: - Prognose-Hilfsfunktionen

    /// Effektives monatliches Bruttoeinkommen (Prognose).
    static func effectiveGrossIncomeMonthly(grossIncomeMonthly: Double, vacancyRate: Double) -> Double {
        grossIncomeMonthly * (1.0 - vacancyRate)
    }

    /// Prognose-Cashflow nach Schuldendienst (Soll-Wert, monatlich).
    static func cashflowAfterDebtMonthly(
        effectiveGrossIncomeMonthly: Double,
        operatingCostsNonRecoverableMonthly: Double,
        monthlyMortgage: Double
    ) -> Double {
        effectiveGrossIncomeMonthly - operatingCostsNonRecoverableMonthly - monthlyMortgage
    }
}

// MARK: - Date helpers (internal)

private func max(_ a: Date, _ b: Date) -> Date { a > b ? a : b }
private func min(_ a: Date, _ b: Date) -> Date { a < b ? a : b }
