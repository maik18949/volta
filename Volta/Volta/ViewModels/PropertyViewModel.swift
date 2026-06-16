import Foundation
import Observation

@Observable
class PropertyViewModel {
    let property: Property

    init(property: Property) {
        self.property = property
    }

    // MARK: - Kauf / Preis

    var purchasePrice: Double {
        property.purchasePriceUnit + property.purchasePriceParking
    }

    var closingCostsTotal: Double {
        KPICalculator.closingCostsTotal(
            landTransferTax: property.landTransferTax,
            notaryCosts: property.notaryCosts,
            landRegistryCosts: property.landRegistryCosts,
            agentFee: property.agentFee,
            appraisalCosts: property.appraisalCosts
        )
    }

    var totalInvestment: Double {
        KPICalculator.totalInvestment(
            purchasePrice: purchasePrice,
            closingCostsTotal: closingCostsTotal,
            renovationModernizationCosts: property.renovationModernizationCosts
        )
    }

    var equityUsed: Double {
        KPICalculator.equityUsed(totalInvestment: totalInvestment, loanAmount: property.loanAmount)
    }

    // MARK: - Einnahmen

    var grossIncomeMonthly: Double {
        property.coldRentMonthly + property.parkingRentMonthly + property.otherIncomeMonthly
    }

    var grossIncomeYearly: Double { grossIncomeMonthly * 12 }

    var effectiveGrossIncomeYearly: Double {
        KPICalculator.effectiveGrossIncomeYearly(
            grossIncomeYearly: grossIncomeYearly,
            vacancyRate: property.vacancyRateAssumption
        )
    }

    // MARK: - Kosten

    var propertyTaxMonthly: Double { property.propertyTaxAnnual / 12.0 }
    var propertyTaxUnitMonthly: Double { property.propertyTaxAnnual / 12.0 }
    var propertyTaxParkingMonthly: Double { property.parkingPropertyTaxAnnual / 12.0 }

    var propertyManagementMonthly: Double { property.propertyManagementAnnual / 12.0 }
    var propertyInsuranceMonthly: Double { property.propertyInsuranceAnnual / 12.0 }

    // Hausgeld Wohnung — nicht umlagefähig für Steuer (ohne Instandhaltungsrücklage)
    var hoaFeeNonRecoverableUnitMonthly: Double {
        property.isHoaUnitSplit
            ? property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly - property.hoaFeeMaintenanceReserveUnitMonthly
            : property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly
    }

    // Hausgeld Stellplatz — nicht umlagefähig für Steuer
    var hoaFeeNonRecoverableParkingMonthly: Double {
        property.isHoaParkingSplit
            ? property.hoaFeeParkingTotalMonthly - property.hoaFeeParkingRecoverableMonthly - property.hoaFeeParkingMaintenanceReserveMonthly
            : property.hoaFeeParkingTotalMonthly
    }

    // Cashflow-Kosten nicht umlagefähig (inkl. Rücklage — echter Geldabfluss)
    var operatingCostsNonRecoverableMonthly: Double {
        let hoaUnit = property.isHoaUnitSplit
            ? hoaFeeNonRecoverableUnitMonthly + property.hoaFeeMaintenanceReserveUnitMonthly
            : property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly
        let hoaParking = property.isHoaParkingSplit
            ? hoaFeeNonRecoverableParkingMonthly + property.hoaFeeParkingMaintenanceReserveMonthly
            : property.hoaFeeParkingTotalMonthly
        return hoaUnit + hoaParking + propertyManagementMonthly
            + property.maintenanceReserveMonthly + property.otherCostsMonthly
    }

    var operatingCostsNonRecoverableYearly: Double { operatingCostsNonRecoverableMonthly * 12.0 }

    var operatingCostsRecoverableMonthly: Double {
        KPICalculator.operatingCostsRecoverableMonthly(
            hoaFeeRecoverable: property.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: propertyTaxMonthly,
            propertyInsuranceMonthly: propertyInsuranceMonthly
        )
    }

    // MARK: - Finanzierung

    var monthlyMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            amortizationRate: property.amortizationRate,
            monthlyMortgageActual: property.monthlyMortgageActual
        )
    }

    var debtServiceAnnual: Double { monthlyMortgage * 12.0 }

    var remainingDebtNow: Double {
        guard let monthsElapsed = property.loanStartDate.monthsBetween(Date()) else {
            return property.loanAmount
        }
        return AmortizationCalculator.remainingDebt(
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            atMonth: monthsElapsed
        )
    }

    // MARK: - AfA & Steuer

    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: property.buildingValue,
            closingCostsTotal: closingCostsTotal,
            purchasePrice: purchasePrice,
            renovationAfaEligible: property.renovationAfaEligible
        )
    }

    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: property.depreciationRate)
    }

    var depreciationMonthly: Double {
        DepreciationCalculator.depreciationMonthly(afaBasis: afaBasis, rate: property.depreciationRate)
    }

    var ownershipMonthsCurrentYear: Int {
        let year = Calendar.current.component(.year, from: Date())
        let transferYear = property.economicTransferDate.year
        if year > transferYear { return 12 }
        if year < transferYear { return 0 }
        return 13 - property.economicTransferDate.month
    }

    var annualTaxableIncomeCurrentYear: Double {
        TaxCalculator.annualTaxableIncome(
            year: Calendar.current.component(.year, from: Date()),
            statusHistory: property.statusHistory,
            economicTransferDate: property.economicTransferDate,
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            afaBasis: afaBasis,
            depreciationRate: property.depreciationRate,
            hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableUnitMonthly,
            hoaUnitRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: hoaFeeNonRecoverableParkingMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxUnitMonthly: propertyTaxUnitMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly,
            coldRentMonthly: property.coldRentMonthly,
            parkingRentMonthly: property.parkingRentMonthly
        )
    }

    var taxEffectYearlyCurrentYear: Double {
        TaxCalculator.taxEffectYearly(
            taxableIncomeVV: annualTaxableIncomeCurrentYear,
            marginalTaxRate: property.marginalTaxRate
        )
    }

    var taxEffectMonthlyCurrentYear: Double {
        TaxCalculator.taxEffectMonthly(
            taxEffectYearly: taxEffectYearlyCurrentYear,
            ownershipMonths: ownershipMonthsCurrentYear
        )
    }

    // Keep old name for views still referencing it (TaxTab stub; replaced in Task 10)
    var taxableIncomeVV: Double { annualTaxableIncomeCurrentYear }
    var taxEffectMonthly: Double { taxEffectMonthlyCurrentYear }

    var interestCurrentYear: Double {
        AmortizationCalculator.interestForCalendarYear(
            year: Calendar.current.component(.year, from: Date()),
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage
        )
    }

    var afaCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        let months = ownershipMonthsCurrentYear
        if year == property.economicTransferDate.year {
            return (afaBasis * property.depreciationRate / 12.0) * Double(months)
        }
        return afaBasis * property.depreciationRate
    }

    var annualIncomeCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        return (1...12).reduce(0.0) { sum, month in
            let d = Date.firstDay(year: year, month: month)
            guard StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate) > 0 else { return sum }
            return sum + StatusPeriodCalculator.incomeForMonth(
                d, statusHistory: property.statusHistory, today: Date(),
                coldRentMonthly: property.coldRentMonthly,
                parkingRentMonthly: property.parkingRentMonthly)
        }
    }

    var recoverableUnitLeerstandDeductionCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        return (1...12).reduce(0.0) { sum, month in
            let d = Date.firstDay(year: year, month: month)
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate)
            guard ownerFraction > 0 else { return sum }
            let leerstand = StatusPeriodCalculator.leerstandDayFraction(
                month: d, statusHistory: property.statusHistory, today: Date())
            return sum + property.hoaFeeRecoverableMonthly * ownerFraction * leerstand
        }
    }

    var grundsteuerUnitLeerstandDeductionCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        return (1...12).reduce(0.0) { sum, month in
            let d = Date.firstDay(year: year, month: month)
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate)
            guard ownerFraction > 0 else { return sum }
            let leerstand = StatusPeriodCalculator.leerstandDayFraction(
                month: d, statusHistory: property.statusHistory, today: Date())
            return sum + propertyTaxUnitMonthly * ownerFraction * leerstand
        }
    }

    func prognoseTaxableIncome(year: Int, coldRent: Double, parkingRent: Double, hoaTotal: Double) -> Double {
        let hoaNonRecovUnitRatio: Double = property.hoaFeeTotalMonthly > 0
            ? hoaFeeNonRecoverableUnitMonthly / property.hoaFeeTotalMonthly : 0
        let progHoaUnit = hoaTotal * hoaNonRecovUnitRatio
        return TaxCalculator.prognoseAnnualTaxableIncome(
            year: year,
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            afaBasis: afaBasis,
            depreciationRate: property.depreciationRate,
            hoaUnitNonRecoverableMonthly: progHoaUnit,
            hoaParkingNonRecoverableMonthly: hoaFeeNonRecoverableParkingMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly,
            coldRentMonthly: coldRent,
            parkingRentMonthly: parkingRent
        )
    }

    // MARK: - KPIs (Prognose)

    var netOperatingIncomeYearly: Double {
        KPICalculator.netOperatingIncomeYearly(
            effectiveGrossIncomeYearly: effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: operatingCostsNonRecoverableYearly
        )
    }

    var cashflowAfterDebtYearly: Double {
        KPICalculator.cashflowAfterDebtYearly(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var cashflowAfterDebtMonthly: Double { cashflowAfterDebtYearly / 12.0 }

    var cashflowAfterTaxMonthly: Double {
        CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: cashflowAfterDebtMonthly,
            taxEffectMonthly: taxEffectMonthlyCurrentYear
        )
    }

    var grossYield: Double? {
        KPICalculator.grossYield(
            coldRentYearly: property.coldRentMonthly * 12,
            parkingRentYearly: property.parkingRentMonthly * 12,
            purchasePrice: purchasePrice
        )
    }

    var netYield: Double? {
        KPICalculator.netYield(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            totalInvestment: totalInvestment
        )
    }

    var capRate: Double? {
        KPICalculator.capRate(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            purchasePrice: purchasePrice
        )
    }

    var cashOnCashReturn: Double? {
        KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: cashflowAfterDebtYearly,
            equityUsed: equityUsed
        )
    }

    var dscrNOI: Double? {
        KPICalculator.dscrNOI(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var mietmultiplikator: Double? {
        KPICalculator.mietmultiplikator(
            purchasePrice: purchasePrice,
            coldRentYearly: property.coldRentMonthly * 12,
            parkingRentYearly: property.parkingRentMonthly * 12
        )
    }

    var ltvRatio: Double? {
        KPICalculator.ltvRatio(remainingDebt: remainingDebtNow, totalInvestment: totalInvestment)
    }

    var breakEvenRentMonthly: Double {
        KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            monthlyMortgage: monthlyMortgage
        )
    }

    // MARK: - Statushistorie

    func activeStatus(for month: Date) -> StatusEntry? {
        let monthStart = month.firstDayOfMonth
        return property.statusHistory
            .filter { $0.statusFrom.firstDayOfMonth <= monthStart }
            .sorted { $0.statusFrom < $1.statusFrom }
            .last
    }

    var currentStatus: StatusEntry? { activeStatus(for: Date()) }

    func cashflowActual(for month: Date) -> (beforeTax: Double, afterTax: Double)? {
        guard month.firstDayOfMonth >= property.economicTransferDate.firstDayOfMonth else { return nil }
        guard !property.statusHistory.isEmpty else { return nil }

        let income = StatusPeriodCalculator.incomeForMonth(
            month, statusHistory: property.statusHistory, today: Date(),
            coldRentMonthly: property.coldRentMonthly,
            parkingRentMonthly: property.parkingRentMonthly)

        let activeEntry = property.statusHistory
            .sorted { $0.statusFrom < $1.statusFrom }
            .last { $0.statusFrom.firstDayOfMonth <= month.firstDayOfMonth }

        let ownerRecoverable = CashflowCalculator.ownerBorneRecoverableCosts(
            status: activeEntry?.status ?? .leerstand,
            hoaUnitRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxUnitMonthly: propertyTaxUnitMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly
        )

        let monthStart = month.firstDayOfMonth
        let extraordinary = property.extraordinaryCosts
            .filter { $0.costMonth.firstDayOfMonth == monthStart }
            .reduce(0) { $0 + $1.amount }

        let beforeTax = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: income,
            monthlyMortgage: monthlyMortgage,
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: ownerRecoverable,
            extraordinaryCostsThisMonth: extraordinary
        )
        let afterTax = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: beforeTax,
            taxEffectMonthly: taxEffectMonthlyCurrentYear
        )
        return (beforeTax, afterTax)
    }
}
