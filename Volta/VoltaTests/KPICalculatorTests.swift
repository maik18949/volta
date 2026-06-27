import XCTest
@testable import Volta

final class KPICalculatorTests: XCTestCase {
    let f = TestFixtures.self

    func test_grossYield() {
        let result = KPICalculator.grossYield(
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.04297, accuracy: 0.0001)
    }

    func test_grossYield_zeroPurchasePrice_returnsNil() {
        let result = KPICalculator.grossYield(
            coldRentYearly: 11_400, parkingRentYearly: 576, purchasePrice: 0)
        XCTAssertNil(result)
    }

    func test_netYield() {
        let result = KPICalculator.netYield(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            totalInvestment: f.totalInvestment
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03114, accuracy: 0.0001)
    }

    func test_netYield_zeroInvestment_returnsNil() {
        let result = KPICalculator.netYield(netOperatingIncomeYearly: 9_303, totalInvestment: 0)
        XCTAssertNil(result)
    }

    func test_capRate() {
        let result = KPICalculator.capRate(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            purchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.03339, accuracy: 0.0001)
    }

    func test_cashOnCashReturn() {
        let result = KPICalculator.cashOnCashReturn(
            cashflowAfterDebtYearly: f.cashflowAfterDebtYearly,
            equityUsed: f.equityUsed
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, -0.08163, accuracy: 0.0001)
    }

    func test_cashOnCashReturn_zeroEquity_returnsNil() {
        let result = KPICalculator.cashOnCashReturn(cashflowAfterDebtYearly: -5_000, equityUsed: 0)
        XCTAssertNil(result)
    }

    func test_dscrNOI() {
        let result = KPICalculator.dscrNOI(
            netOperatingIncomeYearly: f.netOperatingIncomeYearly,
            debtServiceAnnual: f.debtServiceAnnual
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.6238, accuracy: 0.001)
    }

    func test_dscrNOI_zeroDebtService_returnsNil() {
        let result = KPICalculator.dscrNOI(netOperatingIncomeYearly: 9_000, debtServiceAnnual: 0)
        XCTAssertNil(result)
    }

    func test_mietmultiplikator() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: f.purchasePrice,
            coldRentYearly: f.coldRentYearly,
            parkingRentYearly: f.parkingRentYearly
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 23.26, accuracy: 0.01)
    }

    func test_mietmultiplikator_zeroRent_returnsNil() {
        let result = KPICalculator.mietmultiplikator(
            purchasePrice: 278_600, coldRentYearly: 0, parkingRentYearly: 0)
        XCTAssertNil(result)
    }

    func test_breakEvenRent_noParking() {
        // hoaFeeNonRecoverable=125 + maintenanceReserve=34.76 + mgmt=396/12=33 + insurance=0 + other=0 + mortgage=1242.85
        // = 125 + 34.76 + 33 + 1242.85 = 1435.61
        let result = KPICalculator.breakEvenRent(
            hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            hoaFeeParkingMaintenanceReserveMonthly: 0,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: f.propertyManagementAnnual,
            propertyInsuranceAnnual: f.propertyInsuranceAnnual,
            otherCostsMonthly: 0,
            monthlyMortgage: f.monthlyMortgageActual,
            hasParking: false
        )
        XCTAssertEqual(result, 1_435.61, accuracy: 0.01)
    }

    func test_breakEvenRent_withParking() {
        // Same as above + parking: nonRecoverable=20 + recoverable=10 + reserve=5 + taxParking=120/12=10
        // = 1435.61 + 20 + 10 + 5 + 10 = 1480.61
        let result = KPICalculator.breakEvenRent(
            hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
            hoaFeeParkingNonRecoverableMonthly: 20,
            hoaFeeParkingRecoverableMonthly: 10,
            hoaFeeParkingMaintenanceReserveMonthly: 5,
            propertyTaxParkingAnnual: 120,
            propertyManagementAnnual: f.propertyManagementAnnual,
            propertyInsuranceAnnual: f.propertyInsuranceAnnual,
            otherCostsMonthly: 0,
            monthlyMortgage: f.monthlyMortgageActual,
            hasParking: true
        )
        XCTAssertEqual(result, 1_480.61, accuracy: 0.01)
    }

    func test_actualVacancyRate_noEntries_returnsNil() {
        let result = KPICalculator.actualVacancyRate(
            statusEntries: [],
            economicTransferDate: f.economicTransferDate
        )
        XCTAssertNil(result)
    }

    func test_actualVacancyRate_fiftyPercentLeerstand() {
        // 100 days total, first 50 days Leerstand, next 50 days Vermietet → 50%
        let start = f.economicTransferDate
        let midpoint = Calendar.current.date(byAdding: .day, value: 50, to: start)!
        let entry1 = StatusEntry(date: start, status: .leerstand)
        let entry2 = StatusEntry(date: midpoint, status: .vermietet)
        // We need today to be start + 100 days — but we can't control Date()
        // Instead, use a range entirely in the past: set economicTransferDate 100 days ago
        let hundredDaysAgo = Calendar.current.date(byAdding: .day, value: -100, to: Date())!
        let fiftyDaysAgo   = Calendar.current.date(byAdding: .day, value: -50,  to: Date())!
        let e1 = StatusEntry(date: hundredDaysAgo, status: .leerstand)
        let e2 = StatusEntry(date: fiftyDaysAgo, status: .vermietet)
        let result = KPICalculator.actualVacancyRate(
            statusEntries: [e1, e2],
            economicTransferDate: hundredDaysAgo
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!, 0.5, accuracy: 0.02)
    }

    func test_capitalGain_nilMarketValue_returnsNil() {
        let result = KPICalculator.capitalGain(
            currentMarketValue: nil,
            totalPurchasePrice: f.purchasePrice
        )
        XCTAssertNil(result)
    }

    func test_capitalGain_positiveGain() {
        // currentMarketValue = 300_000, purchasePrice = 278_600
        // absolute = 21_400, percent = 21_400 / 278_600 ≈ 0.07682
        let result = KPICalculator.capitalGain(
            currentMarketValue: 300_000,
            totalPurchasePrice: f.purchasePrice
        )
        XCTAssertNotNil(result)
        XCTAssertEqual(result!.absolute, 21_400, accuracy: 0.01)
        XCTAssertEqual(result!.percent, 0.07682, accuracy: 0.0001)
    }
}
