import XCTest
@testable import Volta

final class AmortizationCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_monthlyMortgageCalc() {
        let result = AmortizationCalculator.monthlyMortgageCalc(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate
        )
        XCTAssertEqual(result, 1_015.83, accuracy: 0.10)
    }

    func test_effectiveMonthlyMortgage_usesActualWhenProvided() {
        let result = AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate,
            monthlyMortgageActual: f.monthlyMortgageActual
        )
        XCTAssertEqual(result, f.monthlyMortgageActual, accuracy: 0.001)
    }

    func test_effectiveMonthlyMortgage_fallsBackToCalcWhenNil() {
        let result = AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            amortizationRate: f.amortizationRate,
            monthlyMortgageActual: nil
        )
        XCTAssertEqual(result, 1_015.83, accuracy: 0.10)
    }

    func test_remainingDebt_atMonthZero() {
        let result = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            atMonth: 0
        )
        XCTAssertEqual(result, f.loanAmount, accuracy: 0.01)
    }

    func test_remainingDebt_atMonth1() {
        let result = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            atMonth: 1
        )
        XCTAssertEqual(result, 229_581.32, accuracy: 1.0)
    }

    func test_remainingDebt_decreasesOverTime() {
        let r0 = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount, interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual, atMonth: 0)
        let r12 = AmortizationCalculator.remainingDebt(
            loanAmount: f.loanAmount, interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual, atMonth: 12)
        XCTAssertLessThan(r12, r0)
    }

    func test_amortizationSchedule_firstRowIsLoanStart() {
        let schedule = AmortizationCalculator.amortizationSchedule(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            loanStartDate: f.loanStartDate,
            months: 12
        )
        XCTAssertEqual(schedule.count, 12)
        // After the first payment, remaining debt equals loanAmount minus principal repaid in month 1.
        XCTAssertEqual(schedule[0].remainingDebt, 229_581.32, accuracy: 1.0)
    }

    func test_amortizationSchedule_interestPlusPrincipalEqualsPayment() {
        let schedule = AmortizationCalculator.amortizationSchedule(
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            loanStartDate: f.loanStartDate,
            months: 6
        )
        for row in schedule {
            XCTAssertEqual(row.interest + row.principal, row.payment, accuracy: 0.01)
        }
    }

    func test_interestForCalendarYear_2025_threeMonths() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2025,
            loanStartDate: TestFixtures.loanStartDate,    // Oct 1 2025
            loanAmount: TestFixtures.loanAmount,          // 230000
            interestRate: TestFixtures.interestRate,      // 0.043
            monthlyPayment: TestFixtures.monthlyMortgageActual  // 1242.85
        )
        XCTAssertEqual(result, 2467.99, accuracy: 1.0)
    }

    func test_interestForCalendarYear_2026_fullYear() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2026,
            loanStartDate: TestFixtures.loanStartDate,
            loanAmount: TestFixtures.loanAmount,
            interestRate: TestFixtures.interestRate,
            monthlyPayment: TestFixtures.monthlyMortgageActual
        )
        XCTAssertEqual(result, 9734.81, accuracy: 1.0)
    }

    func test_interestForCalendarYear_beforeLoanStart_isZero() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2024,
            loanStartDate: TestFixtures.loanStartDate,
            loanAmount: TestFixtures.loanAmount,
            interestRate: TestFixtures.interestRate,
            monthlyPayment: TestFixtures.monthlyMortgageActual
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }
}
