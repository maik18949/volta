import XCTest
@testable import Volta

final class TaxCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    // MARK: - annualTaxableIncome

    func test_annualTaxableIncome_allVermietet_acquisitionYear() {
        let history = [StatusEntry(statusFrom: f.economicTransferDate, status: .vermietet, incomeActualMonthly: 0)]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -9100.44, accuracy: 5.0)
    }

    func test_annualTaxableIncome_allLeerstand_acquisitionYear() {
        let history = [StatusEntry(statusFrom: f.economicTransferDate, status: .leerstand, incomeActualMonthly: 0)]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -23478.36, accuracy: 5.0)
    }

    func test_annualTaxableIncome_mixed_leerstandToVermietet() {
        let history = [
            StatusEntry(statusFrom: f.economicTransferDate,              status: .leerstand,  incomeActualMonthly: 0),
            StatusEntry(statusFrom: Date.firstDay(year: 2026, month: 3), status: .vermietet, incomeActualMonthly: 0)
        ]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -10407.52, accuracy: 5.0)
    }

    func test_annualTaxableIncome_fullYear_noProration() {
        let history = [StatusEntry(statusFrom: Date.firstDay(year: 2027, month: 1), status: .vermietet, incomeActualMonthly: 0)]
        let interest2027 = AmortizationCalculator.interestForCalendarYear(
            year: 2027, loanStartDate: f.loanStartDate, loanAmount: f.loanAmount,
            interestRate: f.interestRate, monthlyPayment: f.monthlyMortgageActual)
        let afa2027 = f.afaBasis * f.depreciationRate
        let income2027 = (f.coldRentMonthly + f.parkingRentMonthly) * 12
        let expected = income2027 - interest2027 - afa2027 - (125.0 + f.propertyManagementMonthly) * 12
        let result = TaxCalculator.annualTaxableIncome(
            year: 2027,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2027, month: 12, day: 31)
        )
        XCTAssertEqual(result, expected, accuracy: 5.0)
    }

    // MARK: - taxEffectYearly / taxEffectMonthly

    func test_taxEffectYearly_negativeTaxableIncome_isPositive() {
        XCTAssertGreaterThan(TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42), 0)
    }

    func test_taxEffectYearly_value() {
        XCTAssertEqual(TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42),
                       3822.18, accuracy: 1.0)
    }

    func test_taxEffectMonthly_divisorIsOwnershipMonths() {
        let yearly = TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42)
        let monthly = TaxCalculator.taxEffectMonthly(taxEffectYearly: yearly, ownershipMonths: 11)
        XCTAssertEqual(monthly, yearly / 11.0, accuracy: 0.01)
    }
}
