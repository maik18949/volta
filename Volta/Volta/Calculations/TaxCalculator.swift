import Foundation

enum TaxCalculator {

    // MARK: - Main entry point

    /// Zu versteuerndes V+V-Ergebnis für ein Kalenderjahr.
    /// Berücksichtigt: Eigentumsmonate, amortisierende Zinsen, AfA-Proration,
    /// tagesgenaue Einnahmen nach Status, Leerstandsanteil für umlagefähige Kosten.
    static func annualTaxableIncome(
        year: Int,
        economicTransferDate: Date,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyMortgage: Double,
        afaBemessungsgrundlage: Double,
        depreciationRate: Double,
        hoaFeeNonRecoverableMonthly: Double,
        hoaFeeRecoverableMonthly: Double,
        hoaFeeParkingNonRecoverableMonthly: Double,
        hoaFeeParkingRecoverableMonthly: Double,
        propertyTaxAnnual: Double,
        propertyTaxParkingAnnual: Double,
        propertyManagementAnnual: Double,
        propertyInsuranceAnnual: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        otherIncomeMonthly: Double,
        hasParking: Bool,
        statusEntries: [StatusEntry],
        extraordinaryCosts: [ExtraordinaryCost]
    ) -> Double {

        let cal = utcCalendar

        // 1. Eigentumsmonate im Jahr (angefangene Monate zählen voll, §7 EStG)
        let transferYear = cal.component(.year, from: economicTransferDate)
        let transferMonth = cal.component(.month, from: economicTransferDate)

        let ownershipStartMonth: Int
        if transferYear > year {
            // Not yet owned in this year
            return 0
        } else if transferYear == year {
            ownershipStartMonth = transferMonth
        } else {
            ownershipStartMonth = 1
        }

        let eigentumsMonateAnzahl = 12 - ownershipStartMonth + 1
        let isErwerbsjahr = transferYear == year

        // 2. Zinsen — amortisierend ab max(loanStartDate, 1. Jan Y) bis 31. Dez Y
        let zinsenJahr = annualInterest(
            year: year,
            loanStartDate: loanStartDate,
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyMortgage: monthlyMortgage
        )

        // 3. AfA
        let afaJahr: Double
        if isErwerbsjahr {
            afaJahr = afaBemessungsgrundlage * depreciationRate / 12.0 * Double(eigentumsMonateAnzahl)
        } else {
            afaJahr = afaBemessungsgrundlage * depreciationRate
        }

        // 4. Leerstand-Tage und -Anteil (leerstand + mietgarantie)
        let daysInYear = daysInYear(year: year)
        let leerstTage = leerstandDays(in: year, statusEntries: statusEntries)
        let leerstandsAnteil = leerstTage / Double(daysInYear)

        // 5. Einnahmen — nur Eigentumsmonate, tagesgenau
        var einnahmen = 0.0
        for month in ownershipStartMonth...12 {
            einnahmen += incomeForMonth(
                month: month,
                year: year,
                statusEntries: statusEntries,
                coldRentMonthly: coldRentMonthly,
                parkingRentMonthly: parkingRentMonthly,
                otherIncomeMonthly: otherIncomeMonthly
            )
        }

        // 6. Abzüge
        // 6a. Immer × eigentumsMonateAnzahl
        var abzuegeImmer = 0.0
        abzuegeImmer += hoaFeeNonRecoverableMonthly * Double(eigentumsMonateAnzahl)
        abzuegeImmer += (propertyManagementAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        if propertyInsuranceAnnual > 0 {
            abzuegeImmer += (propertyInsuranceAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        }
        if otherCostsMonthly > 0 {
            abzuegeImmer += otherCostsMonthly * Double(eigentumsMonateAnzahl)
        }
        if hasParking {
            abzuegeImmer += hoaFeeParkingNonRecoverableMonthly * Double(eigentumsMonateAnzahl)
            abzuegeImmer += hoaFeeParkingRecoverableMonthly * Double(eigentumsMonateAnzahl)
            abzuegeImmer += (propertyTaxParkingAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        }

        // 6b. Nur Leerstandsanteil (WE)
        let abzuegeLeerstand =
            hoaFeeRecoverableMonthly * 12.0 * leerstandsAnteil
            + propertyTaxAnnual * leerstandsAnteil

        // 6c. Außergewöhnliche Kosten (isDeductible, im Jahr Y)
        let abzuegeExtra = extraordinaryCosts
            .filter { $0.isDeductible && cal.component(.year, from: $0.costMonth) == year }
            .reduce(0.0) { $0 + $1.amount }

        let summeAbzuege = abzuegeImmer + abzuegeLeerstand + abzuegeExtra

        // 7. V+V-Ergebnis
        return einnahmen - zinsenJahr - afaJahr - summeAbzuege
    }

    // MARK: - Steuereffekt

    /// Steuereffekt: Verlust (negatives V+V-Ergebnis) × Grenzsteuersatz.
    /// Gibt immer ≥ 0 zurück (Erstattung). Bei positivem Einkommen → 0.
    static func taxEffect(annualTaxableIncome: Double, marginalTaxRate: Double) -> Double {
        max(0, -annualTaxableIncome) * marginalTaxRate
    }

    // MARK: - Einnahmen je Monat (tagesgenau)

    /// Einnahmen für einen einzelnen Monat (1–12) im Jahr.
    /// Iteriert StatusEntries, ermittelt tagesgenaue Anteile je Status-Abschnitt.
    static func incomeForMonth(
        month: Int,
        year: Int,
        statusEntries: [StatusEntry],
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        otherIncomeMonthly: Double
    ) -> Double {
        let cal = utcCalendar

        guard let monthStart = cal.date(from: DateComponents(year: year, month: month, day: 1)),
              let nextMonthStart = cal.date(byAdding: .month, value: 1, to: monthStart) else {
            return 0
        }

        let daysInMonth = cal.dateComponents([.day], from: monthStart, to: nextMonthStart).day ?? 30
        let sorted = statusEntries.sorted { $0.date < $1.date }

        var totalIncome = 0.0

        // Build time segments within this month
        let segments = statusSegments(for: monthStart, nextMonthStart: nextMonthStart, sortedEntries: sorted, cal: cal)

        for (segStart, segEnd, entry) in segments {
            let days = cal.dateComponents([.day], from: segStart, to: segEnd).day ?? 0
            guard days > 0 else { continue }
            let fraction = Double(days) / Double(daysInMonth)
            let income: Double
            switch entry.status {
            case .vermietet:
                income = (coldRentMonthly + parkingRentMonthly + otherIncomeMonthly) * fraction
            case .mietgarantie:
                income = (entry.incomeActualMonthly ?? 0) * fraction
            case .leerstand:
                income = 0
            }
            totalIncome += income
        }

        return totalIncome
    }

    // MARK: - Leerstand-Tage

    /// Zählt Tage mit status == .leerstand ODER .mietgarantie im Kalenderjahr.
    static func leerstandDays(in year: Int, statusEntries: [StatusEntry]) -> Double {
        let cal = utcCalendar
        guard let yearStart = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let yearEnd = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1)) else {
            return 0
        }

        let sorted = statusEntries.sorted { $0.date < $1.date }
        var total = 0.0

        // Iterate month by month for precision
        var cursor = yearStart
        while cursor < yearEnd {
            let nextMonth = cal.date(byAdding: .month, value: 1, to: cursor) ?? yearEnd
            let segEnd = min(nextMonth, yearEnd)
            let segments = statusSegments(for: cursor, nextMonthStart: segEnd, sortedEntries: sorted, cal: cal)
            for (segStart, segSegEnd, entry) in segments {
                if entry.status == .leerstand || entry.status == .mietgarantie {
                    let days = cal.dateComponents([.day], from: segStart, to: segSegEnd).day ?? 0
                    total += Double(days)
                }
            }
            cursor = nextMonth
        }

        return total
    }

    // MARK: - Legacy API (kept for backward compatibility with existing call sites)

    /// Simplified taxable income (no status history, no proration).
    /// Kept for InvestmentCalculatorViewModel and other forecast-only callers.
    static func taxableIncomeVV(
        effectiveGrossIncomeYearly: Double,
        operatingCostsNonRecoverableYearly: Double,
        interestAnnual: Double,
        depreciationYearly: Double
    ) -> Double {
        effectiveGrossIncomeYearly
            - operatingCostsNonRecoverableYearly
            - interestAnnual
            - depreciationYearly
    }

    /// Steuereffekt jährlich (legacy, kann negativ sein bei positivem Einkommen).
    static func taxEffectYearly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxableIncomeVV * marginalTaxRate * -1.0
    }

    /// Monatlicher Steuereffekt = jährlicher Effekt / 12.
    static func taxEffectMonthly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxEffectYearly(taxableIncomeVV: taxableIncomeVV, marginalTaxRate: marginalTaxRate) / 12.0
    }

    /// Jahresinteressen (vereinfacht, ohne Amortisierung — für Forecast).
    static func interestAnnual(loanAmount: Double, interestRate: Double) -> Double {
        loanAmount * interestRate
    }

    // MARK: - Private helpers

    private static var utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    private static func daysInYear(year: Int) -> Int {
        let cal = utcCalendar
        guard let start = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let end = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1)) else {
            return 365
        }
        return cal.dateComponents([.day], from: start, to: end).day ?? 365
    }

    /// Compute time segments within [periodStart, periodEnd) mapped to StatusEntry.
    /// Returns tuples of (segmentStart, segmentEnd, activeEntry).
    /// Uses the last entry whose date ≤ segmentDate (i.e. the active status at that point).
    private static func statusSegments(
        for periodStart: Date,
        nextMonthStart periodEnd: Date,
        sortedEntries: [StatusEntry],
        cal: Calendar
    ) -> [(Date, Date, StatusEntry)] {
        guard !sortedEntries.isEmpty else { return [] }

        // Collect all entry dates that fall within [periodStart, periodEnd)
        var boundaries: [Date] = [periodStart]
        for entry in sortedEntries {
            // Normalize entry date to midnight UTC (day precision)
            let entryDay = cal.startOfDay(for: entry.date)
            if entryDay > periodStart && entryDay < periodEnd {
                boundaries.append(entryDay)
            }
        }
        boundaries.append(periodEnd)
        boundaries = Array(Set(boundaries)).sorted()

        var segments: [(Date, Date, StatusEntry)] = []
        for i in 0..<(boundaries.count - 1) {
            let segStart = boundaries[i]
            let segEnd = boundaries[i + 1]
            // Active entry = last entry with date ≤ segStart
            if let activeEntry = sortedEntries.last(where: { cal.startOfDay(for: $0.date) <= segStart }) {
                segments.append((segStart, segEnd, activeEntry))
            }
        }
        return segments
    }

    /// Amortizing interest for a full year.
    /// Advances restschuld from loanStartDate up to max(loanStart, Jan 1 of year),
    /// then sums monthly interest through Dec 31.
    private static func annualInterest(
        year: Int,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyMortgage: Double
    ) -> Double {
        let cal = utcCalendar
        guard let yearStart = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let yearEnd = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1)) else {
            return 0
        }

        let loanStart = loanStartDate.firstDayOfMonth
        if loanStart >= yearEnd {
            // Loan starts after this year
            return 0
        }

        // Advance restschuld from loan start to the first month we need to calculate
        let calcStart = max(loanStart, yearStart)

        // Number of months from loanStart to calcStart (to warm up restschuld)
        let warmUpMonths: Int
        if loanStart < calcStart {
            warmUpMonths = cal.dateComponents([.month], from: loanStart, to: calcStart).month ?? 0
        } else {
            warmUpMonths = 0
        }

        let r = interestRate / 12.0
        var restschuld = loanAmount
        for _ in 0..<warmUpMonths {
            let zins = restschuld * r
            let tilgung = monthlyMortgage - zins
            restschuld = max(0, restschuld - tilgung)
        }

        // Now sum interest from calcStart to yearEnd
        let monthsToCalc = cal.dateComponents([.month], from: calcStart, to: yearEnd).month ?? 0
        var totalInterest = 0.0
        for _ in 0..<monthsToCalc {
            let zins = restschuld * r
            totalInterest += zins
            let tilgung = monthlyMortgage - zins
            restschuld = max(0, restschuld - tilgung)
        }

        return totalInterest
    }
}
