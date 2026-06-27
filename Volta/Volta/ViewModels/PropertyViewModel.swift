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

    var hasParking: Bool {
        property.parkingType != .nichtVorhanden
    }

    var hoaFeeNonRecoverableMonthly: Double {
        property.hoaFeeTotalMonthly
            - property.hoaFeeRecoverableMonthly
            - property.hoaFeeMaintenanceReserveMonthly
    }

    var hoaFeeParkingNonRecoverableMonthly: Double {
        property.hoaFeeParkingTotalMonthly
            - property.hoaFeeParkingRecoverableMonthly
            - property.hoaFeeParkingMaintenanceReserveMonthly
    }

    var propertyTaxMonthly: Double { property.propertyTaxAnnual / 12.0 }

    var propertyManagementMonthly: Double { property.propertyManagementAnnual / 12.0 }

    var propertyInsuranceMonthly: Double { property.propertyInsuranceAnnual / 12.0 }

    var operatingCostsNonRecoverableMonthly: Double {
        KPICalculator.operatingCostsNonRecoverableMonthly(
            hoaFeeNonRecoverable: hoaFeeNonRecoverableMonthly,
            maintenanceReserve: property.hoaFeeMaintenanceReserveMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly
        )
    }

    var operatingCostsNonRecoverableYearly: Double {
        operatingCostsNonRecoverableMonthly * 12.0
    }

    var operatingCostsRecoverableMonthly: Double {
        KPICalculator.operatingCostsRecoverableMonthly(
            hoaFeeRecoverable: property.hoaFeeRecoverableMonthly,
            propertyTaxMonthly: propertyTaxMonthly,
            propertyInsuranceMonthly: propertyInsuranceMonthly
        )
    }

    // MARK: - Finanzierung

    var monthlyMortgage: Double {
        if property.monthlyMortgage > 0 {
            return property.monthlyMortgage
        }
        return AmortizationCalculator.monthlyMortgageCalc(
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            amortizationRate: property.amortizationRate
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

    // Uses current remaining debt as basis — a closer approximation than original loan amount for established properties.
    var interestAnnual: Double {
        TaxCalculator.interestAnnual(loanAmount: remainingDebtNow, interestRate: property.interestRate)
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

    var taxableIncomeVV: Double {
        TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: operatingCostsNonRecoverableYearly,
            interestAnnual: interestAnnual,
            depreciationYearly: depreciationYearly
        )
    }

    var taxEffectMonthly: Double {
        TaxCalculator.taxEffectMonthly(
            taxableIncomeVV: taxableIncomeVV,
            marginalTaxRate: property.marginalTaxRate
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
            taxEffectMonthly: taxEffectMonthly
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
            .filter { $0.date.firstDayOfMonth <= monthStart }
            .sorted { $0.date < $1.date }
            .last
    }

    var currentStatus: StatusEntry? { activeStatus(for: Date()) }

    func cashflowActual(for month: Date) -> (beforeTax: Double, afterTax: Double)? {
        let calendar = Calendar.current
        let comps = calendar.dateComponents([.year, .month], from: month)
        guard let monthYear = comps.year, let monthMonth = comps.month,
              month.firstDayOfMonth >= property.economicTransferDate.firstDayOfMonth else {
            return nil
        }

        let ownerRecoverable = CashflowCalculator.ownerBorneRecoverableCosts(
            month: monthMonth,
            year: monthYear,
            statusEntries: property.statusHistory,
            hoaFeeRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            propertyTaxAnnual: property.propertyTaxAnnual
        )

        // Income: use status-based income for the month (simplified: active status at month start)
        let income: Double
        if let status = activeStatus(for: month) {
            switch status.status {
            case .vermietet:
                income = property.coldRentMonthly + property.parkingRentMonthly + property.otherIncomeMonthly
            case .mietgarantie:
                income = status.incomeActualMonthly ?? 0.0
            case .leerstand:
                income = 0.0
            }
        } else {
            income = 0.0
        }

        let monthStart = month.firstDayOfMonth
        let extraordinary = property.extraordinaryCosts
            .filter { $0.costMonth.firstDayOfMonth == monthStart }
            .reduce(0) { $0 + $1.amount }

        let beforeTax = CashflowCalculator.cashflowBeforeTax(
            einnahmen: income,
            monthlyMortgage: monthlyMortgage,
            hoaFeeNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: property.hoaFeeMaintenanceReserveMonthly,
            propertyInsuranceAnnual: property.propertyInsuranceAnnual,
            propertyManagementAnnual: property.propertyManagementAnnual,
            otherCostsMonthly: property.otherCostsMonthly,
            ownerBorneRecoverableCosts: ownerRecoverable,
            hoaFeeParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
            hoaFeeParkingMaintenanceReserveMonthly: property.hoaFeeParkingMaintenanceReserveMonthly,
            hoaFeeParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxParkingAnnual: property.propertyTaxParkingAnnual,
            hasParking: hasParking,
            extraordinaryCostsMonth: extraordinary
        )
        let afterTax = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: beforeTax,
            taxEffectMonthly: taxEffectMonthly
        )
        return (beforeTax, afterTax)
    }
}
