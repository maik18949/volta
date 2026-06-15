import XCTest
@testable import Volta

final class InvestmentCalculatorViewModelTests: XCTestCase {

    private func makeVM() -> InvestmentCalculatorViewModel {
        let calc = InvestmentCalculation()
        calc.name = "Test ETW"
        calc.purchasePriceUnit = TestFixtures.purchasePriceUnit
        calc.purchasePriceParking = TestFixtures.purchasePriceParking
        calc.landTransferTax = TestFixtures.landTransferTax
        calc.notaryCosts = TestFixtures.notaryCosts
        calc.landRegistryCosts = TestFixtures.landRegistryCosts
        calc.coldRentMonthly = TestFixtures.coldRentMonthly
        calc.parkingRentMonthly = TestFixtures.parkingRentMonthly
        calc.vacancyRateAssumption = TestFixtures.vacancyRateAssumption
        calc.loanAmount = TestFixtures.loanAmount
        calc.interestRate = TestFixtures.interestRate
        calc.amortizationRate = TestFixtures.amortizationRate
        calc.monthlyMortgageActual = TestFixtures.monthlyMortgageActual
        calc.hoaFeeNonRecoverableMonthly = TestFixtures.hoaFeeNonRecoverableMonthly
        calc.propertyManagementAnnual = TestFixtures.propertyManagementAnnual
        calc.maintenanceReserveMonthly = TestFixtures.maintenanceReserveMonthly
        calc.buildingValue = TestFixtures.buildingValue
        calc.depreciationRate = TestFixtures.depreciationRate
        calc.marginalTaxRate = TestFixtures.marginalTaxRate
        return InvestmentCalculatorViewModel(calculation: calc)
    }

    func test_hasBaseData_whenNamePriceAndRentSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasBaseData)
    }

    func test_hasBaseData_falseWhenNameEmpty() {
        let vm = makeVM()
        vm.calculation.name = ""
        XCTAssertFalse(vm.hasBaseData)
    }

    func test_hasFinancingData_whenLoanAndRatesSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasFinancingData)
    }

    func test_hasCostData_whenNonRecoverableCostsSet() {
        let vm = makeVM()
        XCTAssertTrue(vm.hasCostData)
    }

    func test_grossYield_matchesFixture() {
        let vm = makeVM()
        XCTAssertNotNil(vm.grossYield)
        XCTAssertEqual(vm.grossYield!, 0.04297, accuracy: 0.0001)
    }

    func test_cashflowAfterDebtMonthly_matchesFixture() {
        let vm = makeVM()
        XCTAssertEqual(vm.cashflowAfterDebtMonthly, TestFixtures.cashflowAfterDebtMonthly, accuracy: 1.0)
    }

    func test_sensitivityRent_changesEffectiveRent() {
        let vm = makeVM()
        let base = vm.effectiveColdRentMonthly
        vm.sensitivityRentDelta = 50
        XCTAssertEqual(vm.effectiveColdRentMonthly, base + 50, accuracy: 0.01)
    }

    func test_sensitivityRent_changesCashflow() {
        let vm = makeVM()
        let baseCF = vm.cashflowAfterDebtMonthly
        vm.sensitivityRentDelta = 100
        XCTAssertGreaterThan(vm.cashflowAfterDebtMonthly, baseCF)
    }

    func test_resetSensitivity_restoresBaseValues() {
        let vm = makeVM()
        vm.sensitivityRentDelta = 200
        vm.sensitivityRateDelta = 0.01
        vm.resetSensitivity()
        XCTAssertEqual(vm.sensitivityRentDelta, 0, accuracy: 0.001)
        XCTAssertEqual(vm.sensitivityRateDelta, 0, accuracy: 0.001)
        XCTAssertEqual(vm.effectiveColdRentMonthly, TestFixtures.coldRentMonthly, accuracy: 0.01)
    }

    func test_hasBaseData_falseWhenPriceZero() {
        let vm = makeVM()
        vm.calculation.purchasePriceUnit = 0
        vm.calculation.purchasePriceParking = 0
        XCTAssertFalse(vm.hasBaseData)
    }
}
