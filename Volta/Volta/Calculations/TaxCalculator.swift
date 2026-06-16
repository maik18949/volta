import Foundation

enum TaxCalculator {

    /// Full annual taxable income for V+V (§21 EStG).
    /// Handles acquisition-year proration, amortizing interest, day-level status costs.
    static func annualTaxableIncome(
        year: Int,
        statusHistory: [StatusEntry],
        economicTransferDate: Date,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        afaBasis: Double,
        depreciationRate: Double,
        hoaUnitNonRecoverableMonthly: Double,
        hoaUnitRecoverableMonthly: Double,
        hoaParkingNonRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxUnitMonthly: Double,
        propertyTaxParkingMonthly: Double,
        propertyManagementMonthly: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        today: Date = Date()
    ) -> Double {
        let isAcquisitionYear = year == economicTransferDate.year

        // 1. Ownership months in this year
        let ownershipMonths: [Date] = (1...12).compactMap { month -> Date? in
            let d = Date.firstDay(year: year, month: month)
            let fraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: economicTransferDate)
            return fraction > 0 ? d : nil
        }
        guard !ownershipMonths.isEmpty else { return 0 }

        // 2. Amortizing interest for the calendar year (includes months before Besitzübergang)
        let interestYear = AmortizationCalculator.interestForCalendarYear(
            year: year,
            loanStartDate: loanStartDate,
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyPayment: monthlyPayment
        )

        // 3. AfA — prorated in acquisition year, full thereafter
        let monthsForAfa = ownershipMonths.count
        let afaYear: Double
        if isAcquisitionYear {
            afaYear = (afaBasis * depreciationRate / 12.0) * Double(monthsForAfa)
        } else {
            afaYear = afaBasis * depreciationRate
        }

        // 4. Income and status-dependent deductions (day-level, per ownership month)
        var totalIncome: Double = 0
        var ownershipMonthEquivalent: Double = 0
        var leerstandEquivalentMonths: Double = 0

        for month in ownershipMonths {
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: month, economicTransferDate: economicTransferDate)
            ownershipMonthEquivalent += ownerFraction

            let leerstandFraction = StatusPeriodCalculator.leerstandDayFraction(
                month: month, statusHistory: statusHistory, today: today)

            leerstandEquivalentMonths += ownerFraction * leerstandFraction

            totalIncome += StatusPeriodCalculator.incomeForMonth(
                month,
                statusHistory: statusHistory,
                today: today,
                coldRentMonthly: coldRentMonthly,
                parkingRentMonthly: parkingRentMonthly
            ) * ownerFraction
        }

        // 5. Deductions
        let alwaysDeductions = (
            hoaUnitNonRecoverableMonthly
            + hoaParkingNonRecoverableMonthly
            + hoaParkingRecoverableMonthly   // Stellplatz recoverable: always owner-borne
            + propertyTaxParkingMonthly      // Stellplatz Grundsteuer: always owner-borne
            + propertyManagementMonthly
            + otherCostsMonthly
        ) * ownershipMonthEquivalent

        let leerstandDeductions = (
            hoaUnitRecoverableMonthly
            + propertyTaxUnitMonthly
        ) * leerstandEquivalentMonths

        return totalIncome - interestYear - afaYear - alwaysDeductions - leerstandDeductions
    }

    /// Jährlicher Steuereffekt: negatives Ergebnis × Grenzsteuersatz.
    static func taxEffectYearly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxableIncomeVV * marginalTaxRate * -1.0
    }

    /// Monatlicher Steuereffekt = jährlicher Effekt ÷ Eigentumsmonate im Jahr.
    static func taxEffectMonthly(taxEffectYearly: Double, ownershipMonths: Int) -> Double {
        guard ownershipMonths > 0 else { return 0 }
        return taxEffectYearly / Double(ownershipMonths)
    }

    /// Prognose-Steuerergebnis: Vollvermietung, 12 Monate, kein Status-Split für WE.
    /// Stellplatz-Kosten werden immer abgezogen (Eigentümer trägt sie immer).
    static func prognoseAnnualTaxableIncome(
        year: Int,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        afaBasis: Double,
        depreciationRate: Double,
        hoaUnitNonRecoverableMonthly: Double,
        hoaParkingNonRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxParkingMonthly: Double,
        propertyManagementMonthly: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double
    ) -> Double {
        let interest = AmortizationCalculator.interestForCalendarYear(
            year: year, loanStartDate: loanStartDate, loanAmount: loanAmount,
            interestRate: interestRate, monthlyPayment: monthlyPayment)
        let afa = afaBasis * depreciationRate
        let income = (coldRentMonthly + parkingRentMonthly) * 12
        let deductions = (hoaUnitNonRecoverableMonthly + hoaParkingNonRecoverableMonthly
            + hoaParkingRecoverableMonthly + propertyTaxParkingMonthly
            + propertyManagementMonthly + otherCostsMonthly) * 12
        return income - interest - afa - deductions
    }
}
