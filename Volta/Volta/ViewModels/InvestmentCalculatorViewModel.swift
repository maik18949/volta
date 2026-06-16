import Foundation
import Observation

@Observable
class InvestmentCalculatorViewModel {
    let calculation: InvestmentCalculation

    // Sensitivity overrides (not persisted)
    var sensitivityRentDelta: Double = 0
    var sensitivityRateDelta: Double = 0
    var sensitivityPriceDelta: Double = 0
    var sensitivityVacancyDelta: Double = 0
    var sensitivityMaintenanceDelta: Double = 0

    init(calculation: InvestmentCalculation) {
        self.calculation = calculation
    }

    // MARK: - Effective values (base + sensitivity)

    var effectiveColdRentMonthly: Double {
        max(0, calculation.coldRentMonthly + sensitivityRentDelta)
    }
    var effectiveInterestRate: Double {
        max(0.001, calculation.interestRate + sensitivityRateDelta)
    }
    var effectivePurchasePriceUnit: Double {
        max(1, calculation.purchasePriceUnit + sensitivityPriceDelta)
    }
    var effectiveVacancyRate: Double {
        max(0, min(1, calculation.vacancyRateAssumption + sensitivityVacancyDelta))
    }
    var effectiveNonRecoverableMonthly: Double {
        max(0, calculation.hoaFeeNonRecoverableMonthly + sensitivityMaintenanceDelta)
    }

    // MARK: - Derived values

    var purchasePrice: Double {
        effectivePurchasePriceUnit + calculation.purchasePriceParking
    }

    var closingCostsTotal: Double {
        KPICalculator.closingCostsTotal(
            landTransferTax: calculation.landTransferTax,
            notaryCosts: calculation.notaryCosts,
            landRegistryCosts: calculation.landRegistryCosts,
            agentFee: calculation.agentFee,
            appraisalCosts: calculation.appraisalCosts
        )
    }

    var totalInvestment: Double {
        KPICalculator.totalInvestment(
            purchasePrice: purchasePrice,
            closingCostsTotal: closingCostsTotal,
            renovationModernizationCosts: calculation.renovationModernizationCosts
        )
    }

    var equityUsed: Double {
        KPICalculator.equityUsed(totalInvestment: totalInvestment, loanAmount: calculation.loanAmount)
    }

    var grossIncomeMonthly: Double {
        effectiveColdRentMonthly + calculation.parkingRentMonthly + calculation.otherIncomeMonthly
    }

    var effectiveGrossIncomeYearly: Double {
        KPICalculator.effectiveGrossIncomeYearly(
            grossIncomeYearly: grossIncomeMonthly * 12,
            vacancyRate: effectiveVacancyRate
        )
    }

    var monthlyMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: calculation.loanAmount,
            interestRate: effectiveInterestRate,
            amortizationRate: calculation.amortizationRate,
            monthlyMortgageActual: calculation.monthlyMortgageActual
        )
    }

    var debtServiceAnnual: Double { monthlyMortgage * 12 }

    var interestAnnual: Double {
        calculation.loanAmount * effectiveInterestRate
    }

    var operatingCostsNonRecoverableMonthly: Double {
        effectiveNonRecoverableMonthly
            + calculation.maintenanceReserveMonthly
            + calculation.propertyManagementAnnual / 12
    }

    var operatingCostsNonRecoverableYearly: Double {
        operatingCostsNonRecoverableMonthly * 12
    }

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

    var cashflowAfterDebtMonthly: Double { cashflowAfterDebtYearly / 12 }

    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: calculation.buildingValue,
            closingCostsTotal: closingCostsTotal,
            purchasePrice: purchasePrice,
            renovationAfaEligible: calculation.renovationAfaEligible
        )
    }

    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: calculation.depreciationRate)
    }

    var taxableIncomeVV: Double {
        effectiveGrossIncomeYearly
            - operatingCostsNonRecoverableYearly
            - interestAnnual
            - depreciationYearly
    }

    var taxEffectMonthly: Double {
        let yearly = TaxCalculator.taxEffectYearly(
            taxableIncomeVV: taxableIncomeVV, marginalTaxRate: calculation.marginalTaxRate)
        return TaxCalculator.taxEffectMonthly(taxEffectYearly: yearly, ownershipMonths: 12)
    }

    var cashflowAfterTaxMonthly: Double {
        CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: cashflowAfterDebtMonthly,
            taxEffectMonthly: taxEffectMonthly
        )
    }

    // MARK: - KPIs

    var mietmultiplikator: Double? {
        KPICalculator.mietmultiplikator(
            purchasePrice: purchasePrice,
            coldRentYearly: effectiveColdRentMonthly * 12,
            parkingRentYearly: calculation.parkingRentMonthly * 12
        )
    }

    var grossYield: Double? {
        KPICalculator.grossYield(
            coldRentYearly: effectiveColdRentMonthly * 12,
            parkingRentYearly: calculation.parkingRentMonthly * 12,
            purchasePrice: purchasePrice
        )
    }

    var netYield: Double? {
        KPICalculator.netYield(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            totalInvestment: totalInvestment
        )
    }

    var cashOnCashReturn: Double? {
        guard hasCostData else { return nil }
        return KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: cashflowAfterDebtYearly,
            equityUsed: equityUsed
        )
    }

    var dscrNOI: Double? {
        guard hasFinancingData else { return nil }
        return KPICalculator.dscrNOI(
            netOperatingIncomeYearly: netOperatingIncomeYearly,
            debtServiceAnnual: debtServiceAnnual
        )
    }

    var ltvRatio: Double? {
        guard hasFinancingData, totalInvestment > 0 else { return nil }
        return calculation.loanAmount / totalInvestment
    }

    var breakEvenRentMonthly: Double? {
        guard hasFinancingData else { return nil }
        return KPICalculator.breakEvenRentMonthly(
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            monthlyMortgage: monthlyMortgage
        )
    }

    // MARK: - KPI Stage unlocking

    var hasBaseData: Bool {
        !calculation.name.isEmpty
            && (calculation.purchasePriceUnit + calculation.purchasePriceParking) > 0
            && effectiveColdRentMonthly > 0
    }

    var hasFinancingData: Bool {
        hasBaseData && calculation.loanAmount > 0 && calculation.interestRate > 0
            && calculation.amortizationRate > 0
    }

    var hasCostData: Bool {
        hasFinancingData && (calculation.hoaFeeNonRecoverableMonthly > 0
            || calculation.maintenanceReserveMonthly > 0
            || calculation.propertyManagementAnnual > 0)
    }

    var hasTaxData: Bool {
        hasCostData && calculation.marginalTaxRate > 0 && calculation.buildingValue > 0
    }

    // MARK: - Sensitivity ranges

    var rentSliderRange: ClosedRange<Double> {
        let base = max(1, calculation.coldRentMonthly)
        return (-base * 0.20)...(base * 0.20)
    }

    var rateSliderRange: ClosedRange<Double> { -0.02...0.02 }

    var priceSliderRange: ClosedRange<Double> {
        let base = max(1, calculation.purchasePriceUnit)
        return (-base * 0.15)...(base * 0.15)
    }

    var vacancySliderRange: ClosedRange<Double> { -0.10...0.10 }

    var maintenanceSliderRange: ClosedRange<Double> { -100.0...100.0 }

    func resetSensitivity() {
        sensitivityRentDelta = 0
        sensitivityRateDelta = 0
        sensitivityPriceDelta = 0
        sensitivityVacancyDelta = 0
        sensitivityMaintenanceDelta = 0
    }
}
