import XCTest
@testable import Volta

final class CashflowCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    // MARK: - cashflowBeforeTax

    func test_cashflowBeforeTax_vermietet_noParking() {
        // einnahmen: 950 (Kaltmiete)
        // - 1242.85 (Kredit) - 125 (nichtUmlagef.) - 34.76 (Rücklage)
        // - 396/12=33 (Verwaltung) - 0 (Versicherung=0) - 0 (ownerBorne) - 0 (extraordinary)
        // = 950 - 1435.61 = -485.61
        let result = CashflowCalculator.cashflowBeforeTax(
            einnahmen: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
            propertyInsuranceAnnual: f.propertyInsuranceAnnual,
            propertyManagementAnnual: f.propertyManagementAnnual,
            otherCostsMonthly: 0.0,
            ownerBorneRecoverableCosts: 0.0,
            hoaFeeParkingNonRecoverableMonthly: 0.0,
            hoaFeeParkingMaintenanceReserveMonthly: 0.0,
            hoaFeeParkingRecoverableMonthly: 0.0,
            propertyTaxParkingAnnual: 0.0,
            hasParking: false,
            extraordinaryCostsMonth: 0.0
        )
        XCTAssertEqual(result, -485.61, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_vermietet_withParking() {
        // Same as above + parking: nonRecoverable=20, reserve=10, recoverable=30, tax=60/year
        // Additional deductions: 20 + 10 + 30 + 60/12 = 65
        // Expected: -485.61 - 65 = -550.61
        let result = CashflowCalculator.cashflowBeforeTax(
            einnahmen: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
            propertyInsuranceAnnual: f.propertyInsuranceAnnual,
            propertyManagementAnnual: f.propertyManagementAnnual,
            otherCostsMonthly: 0.0,
            ownerBorneRecoverableCosts: 0.0,
            hoaFeeParkingNonRecoverableMonthly: 20.0,
            hoaFeeParkingMaintenanceReserveMonthly: 10.0,
            hoaFeeParkingRecoverableMonthly: 30.0,
            propertyTaxParkingAnnual: 60.0,
            hasParking: true,
            extraordinaryCostsMonth: 0.0
        )
        XCTAssertEqual(result, -550.61, accuracy: 0.01)
    }

    func test_cashflowBeforeTax_withExtraordinaryCost() {
        let result = CashflowCalculator.cashflowBeforeTax(
            einnahmen: 950.0,
            monthlyMortgage: f.monthlyMortgageActual,
            hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
            hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
            propertyInsuranceAnnual: f.propertyInsuranceAnnual,
            propertyManagementAnnual: f.propertyManagementAnnual,
            otherCostsMonthly: 0.0,
            ownerBorneRecoverableCosts: 0.0,
            hoaFeeParkingNonRecoverableMonthly: 0.0,
            hoaFeeParkingMaintenanceReserveMonthly: 0.0,
            hoaFeeParkingRecoverableMonthly: 0.0,
            propertyTaxParkingAnnual: 0.0,
            hasParking: false,
            extraordinaryCostsMonth: 500.0
        )
        XCTAssertEqual(result, -985.61, accuracy: 0.01)
    }

    // MARK: - ownerBorneRecoverableCosts

    func test_ownerBorneRecoverable_vermietet_fullMonth_isZero() {
        // January 2026 (31 days), one entry: vermietet from Jan 1
        let entry = StatusEntry(
            date: Date.firstDay(year: 2026, month: 1),
            status: .vermietet
        )
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            month: 1,
            year: 2026,
            statusEntries: [entry],
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxAnnual: f.propertyTaxAnnual
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_ownerBorneRecoverable_leerstand_fullMonth_isFullCosts() {
        // January 2026 (31 days), one entry: leerstand from Jan 1
        // Expected: (292 + 205/12) × 1.0 = 309.0833...
        let entry = StatusEntry(
            date: Date.firstDay(year: 2026, month: 1),
            status: .leerstand
        )
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            month: 1,
            year: 2026,
            statusEntries: [entry],
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxAnnual: f.propertyTaxAnnual
        )
        XCTAssertEqual(result, f.operatingCostsRecoverableMonthly, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_midMonthChange_tagesanteilig() {
        // June 2026 (30 days):
        //   leerstand Jun 1–15 (15 days, fraction = 15/30 = 0.5)
        //   vermietet Jun 16–30 (15 days, fraction = 0.5 → 0)
        // Expected: (292 + 205/12) × 0.5 = 154.5416...
        let leerstandEntry = StatusEntry(
            date: Date.firstDay(year: 2026, month: 6),
            status: .leerstand
        )
        var comps = DateComponents()
        comps.year = 2026; comps.month = 6; comps.day = 16
        comps.timeZone = TimeZone(identifier: "UTC")
        let vermietetStart = Calendar(identifier: .gregorian).date(from: comps)!
        let vermietetEntry = StatusEntry(date: vermietetStart, status: .vermietet)

        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            month: 6,
            year: 2026,
            statusEntries: [leerstandEntry, vermietetEntry],
            hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            propertyTaxAnnual: f.propertyTaxAnnual
        )
        let expected = (f.hoaFeeRecoverableMonthly + f.propertyTaxAnnual / 12.0) * (15.0 / 30.0)
        XCTAssertEqual(result, expected, accuracy: 0.01)
    }

    // MARK: - cashflowAfterTax

    func test_cashflowAfterTax() {
        let result = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: -485.61,
            taxEffectMonthly: f.taxEffectMonthly
        )
        XCTAssertEqual(result, -136.51, accuracy: 0.01)
    }

    // MARK: - PropertyStatus

    func test_propertyStatus_hasIncome() {
        XCTAssertTrue(PropertyStatus.vermietet.hasIncome)
        XCTAssertFalse(PropertyStatus.leerstand.hasIncome)
        XCTAssertTrue(PropertyStatus.mietgarantie.hasIncome)
    }
}
