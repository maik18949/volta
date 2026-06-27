import XCTest
@testable import Volta

final class TaxCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    // MARK: - Legacy API (kept for backward compat)

    func test_taxableIncomeVV() {
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertEqual(result, f.taxableIncomeVV, accuracy: 1.0)
    }

    func test_taxableIncomeVV_isNegativeForTypicalHighLeverageProperty() {
        let result = TaxCalculator.taxableIncomeVV(
            effectiveGrossIncomeYearly: f.effectiveGrossIncomeYearly,
            operatingCostsNonRecoverableYearly: f.operatingCostsNonRecoverableYearly,
            interestAnnual: f.interestAnnual,
            depreciationYearly: f.depreciationYearly
        )
        XCTAssertLessThan(result, 0)
    }

    func test_taxEffectYearly_negativeTaxableIncome_isPositive() {
        let result = TaxCalculator.taxEffectYearly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectYearly, accuracy: 1.0)
        XCTAssertGreaterThan(result, 0)
    }

    func test_taxEffectYearly_positiveTaxableIncome_isNegative() {
        let result = TaxCalculator.taxEffectYearly(taxableIncomeVV: 5_000, marginalTaxRate: 0.42)
        XCTAssertEqual(result, -2_100.0, accuracy: 0.01)
    }

    func test_taxEffectMonthly() {
        let result = TaxCalculator.taxEffectMonthly(
            taxableIncomeVV: f.taxableIncomeVV,
            marginalTaxRate: f.marginalTaxRate
        )
        XCTAssertEqual(result, f.taxEffectMonthly, accuracy: 0.10)
    }

    func test_taxEffectMonthly_zeroMarginalRate() {
        let result = TaxCalculator.taxEffectMonthly(taxableIncomeVV: -10_000, marginalTaxRate: 0.0)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    // MARK: - taxEffect (new API)

    func test_taxEffect_negativeIncome_returnsPositive() {
        // Verlust → Erstattung (positive value)
        let result = TaxCalculator.taxEffect(annualTaxableIncome: -10_000, marginalTaxRate: 0.42)
        XCTAssertEqual(result, 4_200.0, accuracy: 0.01)
        XCTAssertGreaterThan(result, 0)
    }

    func test_taxEffect_positiveIncome_returnsZero() {
        // Positives Einkommen → kein Erstattungseffekt, result = 0
        let result = TaxCalculator.taxEffect(annualTaxableIncome: 5_000, marginalTaxRate: 0.42)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    func test_taxEffect_zeroIncome_returnsZero() {
        let result = TaxCalculator.taxEffect(annualTaxableIncome: 0, marginalTaxRate: 0.42)
        XCTAssertEqual(result, 0.0, accuracy: 0.001)
    }

    // MARK: - leerstandDays

    func test_leerstandDays_noEntries_returnsZero() {
        let days = TaxCalculator.leerstandDays(in: 2026, statusEntries: [])
        XCTAssertEqual(days, 0)
    }

    func test_leerstandDays_fullYearVermietet() {
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .vermietet)
        ]
        let days = TaxCalculator.leerstandDays(in: 2026, statusEntries: entries)
        XCTAssertEqual(days, 0)
    }

    func test_leerstandDays_fullYearLeerstand() {
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .leerstand)
        ]
        let days = TaxCalculator.leerstandDays(in: 2026, statusEntries: entries)
        XCTAssertEqual(days, 365, accuracy: 1) // 2026 is not a leap year
    }

    func test_leerstandDays_midYearStatusChange() {
        // Leerstand Jan 1 – Jun 30 (181 days), Vermietet Jul 1 – Dec 31
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .leerstand),
            StatusEntry(date: Date.firstDay(year: 2026, month: 7), status: .vermietet)
        ]
        let days = TaxCalculator.leerstandDays(in: 2026, statusEntries: entries)
        // Jan(31) + Feb(28) + Mar(31) + Apr(30) + May(31) + Jun(30) = 181
        XCTAssertEqual(days, 181, accuracy: 1)
    }

    func test_leerstandDays_mietgarantieCountsAsLeerstand() {
        // Mietgarantie for full year should count all days
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .mietgarantie, incomeActualMonthly: 800)
        ]
        let days = TaxCalculator.leerstandDays(in: 2026, statusEntries: entries)
        XCTAssertEqual(days, 365, accuracy: 1)
    }

    // MARK: - incomeForMonth

    func test_incomeForMonth_vermietet() {
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .vermietet)
        ]
        let income = TaxCalculator.incomeForMonth(
            month: 3, year: 2026, statusEntries: entries,
            coldRentMonthly: 950, parkingRentMonthly: 48, otherIncomeMonthly: 0
        )
        XCTAssertEqual(income, 998.0, accuracy: 0.01)
    }

    func test_incomeForMonth_leerstand() {
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .leerstand)
        ]
        let income = TaxCalculator.incomeForMonth(
            month: 3, year: 2026, statusEntries: entries,
            coldRentMonthly: 950, parkingRentMonthly: 48, otherIncomeMonthly: 0
        )
        XCTAssertEqual(income, 0, accuracy: 0.001)
    }

    func test_incomeForMonth_mietgarantie() {
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .mietgarantie, incomeActualMonthly: 800)
        ]
        let income = TaxCalculator.incomeForMonth(
            month: 3, year: 2026, statusEntries: entries,
            coldRentMonthly: 950, parkingRentMonthly: 48, otherIncomeMonthly: 0
        )
        XCTAssertEqual(income, 800.0, accuracy: 0.01)
    }

    func test_incomeForMonth_midMonthStatusChange() {
        // June 2026 (30 days): Leerstand 1–15, Vermietet 16–30
        let entries = [
            StatusEntry(date: Date.firstDay(year: 2026, month: 1), status: .leerstand),
            StatusEntry(date: Date.firstDay(year: 2026, month: 6).addingMonths(0).addingDays(15), status: .vermietet)
        ]
        let income = TaxCalculator.incomeForMonth(
            month: 6, year: 2026, statusEntries: entries,
            coldRentMonthly: 950, parkingRentMonthly: 9, otherIncomeMonthly: 0
        )
        // Vermietet 15/30 of month: (950+9) × 15/30 = 479.5
        XCTAssertEqual(income, 479.5, accuracy: 1.0)
    }

    // MARK: - annualTaxableIncome — full year fully vermietet

    func test_annualTaxableIncome_fullYearVermietet() {
        // Year 2025, property owned from Jan 1 2025 (not acquisition year)
        // Loan: 200_000, 4% interest, 1_000/month mortgage
        // Cold rent: 1_000/month, no parking
        // HOA non-recoverable: 100/month, recoverable: 200/month
        // Property tax: 240/year, management: 480/year
        // No extraordinary costs
        let year = 2025
        let transferDate = Date.firstDay(year: 2025, month: 1)   // not acquisition year if year == 2024+1
        // transferDate is Jan 2025, year is 2025 → isErwerbsjahr = true, eigentumsMonateAnzahl = 12
        let loanStart = Date.firstDay(year: 2025, month: 1)
        let loanAmount = 200_000.0
        let interestRate = 0.04
        let monthlyMortgage = 1_000.0

        let entries = [
            StatusEntry(date: Date.firstDay(year: 2025, month: 1), status: .vermietet)
        ]

        let income = TaxCalculator.annualTaxableIncome(
            year: year,
            economicTransferDate: transferDate,
            loanStartDate: loanStart,
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyMortgage: monthlyMortgage,
            afaBemessungsgrundlage: 200_000,
            depreciationRate: 0.02,
            hoaFeeNonRecoverableMonthly: 100,
            hoaFeeRecoverableMonthly: 200,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            propertyTaxAnnual: 240,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: 480,
            propertyInsuranceAnnual: 0,
            otherCostsMonthly: 0,
            coldRentMonthly: 1_000,
            parkingRentMonthly: 0,
            otherIncomeMonthly: 0,
            hasParking: false,
            statusEntries: entries,
            extraordinaryCosts: []
        )

        // Einnahmen: 12 × 1_000 = 12_000 (fully vermietet)
        // Zinsen: amortizing from Jan 2025, 4% on 200k → approx 7_900 (first year)
        // AfA (Erwerbsjahr, 12 months): 200_000 × 0.02 / 12 × 12 = 4_000
        // Abzüge immer: 100×12 + 480/12×12 = 1_200 + 480 = 1_680
        // Leerstand-Anteil: 0 (fully vermietet) → recoverable costs = 0, propertyTax = 0
        // Expected: 12_000 - ~7_900 - 4_000 - 1_680 ≈ -1_580 (negative, Verlust)
        XCTAssertLessThan(income, 0, "Vollvermietung with high interest should still produce Verlust")
        // Income should be in range (accounting for exact amortizing interest)
        XCTAssertGreaterThan(income, -4_000, "Verlust should not be extreme with this scenario")
    }

    func test_annualTaxableIncome_fullYearLeerstand() {
        // Year 2025, property owned full year, 100% leerstand
        let year = 2025
        let transferDate = Date.firstDay(year: 2024, month: 1) // owned since prior year
        let loanStart = Date.firstDay(year: 2024, month: 1)

        let entries = [
            StatusEntry(date: Date.firstDay(year: 2024, month: 1), status: .leerstand)
        ]

        let income = TaxCalculator.annualTaxableIncome(
            year: year,
            economicTransferDate: transferDate,
            loanStartDate: loanStart,
            loanAmount: 200_000,
            interestRate: 0.04,
            monthlyMortgage: 1_000,
            afaBemessungsgrundlage: 200_000,
            depreciationRate: 0.02,
            hoaFeeNonRecoverableMonthly: 100,
            hoaFeeRecoverableMonthly: 200,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            propertyTaxAnnual: 240,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: 480,
            propertyInsuranceAnnual: 0,
            otherCostsMonthly: 0,
            coldRentMonthly: 1_000,
            parkingRentMonthly: 0,
            otherIncomeMonthly: 0,
            hasParking: false,
            statusEntries: entries,
            extraordinaryCosts: []
        )

        // Einnahmen = 0 (100% Leerstand)
        // Leerstand-Anteil = 1.0 → recoverable deducted fully
        // result must be negative (only costs, no income)
        XCTAssertLessThan(income, 0, "100% Leerstand with no income must produce Verlust")

        // Also check leerstand cost deductions are included:
        // hoaFeeRecoverable × 12 × 1.0 = 2_400
        // propertyTax × 1.0 = 240
        // hoaFeeNonRecoverable × 12 = 1_200
        // management = 480
        // Total non-interest, non-AfA costs ≥ 4_320
        XCTAssertLessThan(income, -4_000, "Leerstand costs should be fully deducted")
    }

    func test_annualTaxableIncome_notOwnedYet_returnsZero() {
        // economicTransferDate is in a future year
        let income = TaxCalculator.annualTaxableIncome(
            year: 2025,
            economicTransferDate: Date.firstDay(year: 2026, month: 1),
            loanStartDate: Date.firstDay(year: 2025, month: 1),
            loanAmount: 200_000,
            interestRate: 0.04,
            monthlyMortgage: 1_000,
            afaBemessungsgrundlage: 200_000,
            depreciationRate: 0.02,
            hoaFeeNonRecoverableMonthly: 100,
            hoaFeeRecoverableMonthly: 200,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            propertyTaxAnnual: 240,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: 480,
            propertyInsuranceAnnual: 0,
            otherCostsMonthly: 0,
            coldRentMonthly: 1_000,
            parkingRentMonthly: 0,
            otherIncomeMonthly: 0,
            hasParking: false,
            statusEntries: [],
            extraordinaryCosts: []
        )
        XCTAssertEqual(income, 0, accuracy: 0.001)
    }

    func test_annualTaxableIncome_extraordinaryCostsDeductible() {
        let year = 2025
        let transferDate = Date.firstDay(year: 2024, month: 1)
        let loanStart = Date.firstDay(year: 2024, month: 1)
        let entries = [StatusEntry(date: Date.firstDay(year: 2025, month: 1), status: .vermietet)]

        let extraDeductible = ExtraordinaryCost(
            costMonth: Date.firstDay(year: 2025, month: 6),
            amount: 2_000,
            category: .reparatur,
            isDeductible: true
        )
        let extraNotDeductible = ExtraordinaryCost(
            costMonth: Date.firstDay(year: 2025, month: 6),
            amount: 5_000,
            category: .sonderumlage,
            isDeductible: false
        )

        let withExtra = TaxCalculator.annualTaxableIncome(
            year: year,
            economicTransferDate: transferDate,
            loanStartDate: loanStart,
            loanAmount: 200_000,
            interestRate: 0.04,
            monthlyMortgage: 1_000,
            afaBemessungsgrundlage: 200_000,
            depreciationRate: 0.02,
            hoaFeeNonRecoverableMonthly: 100,
            hoaFeeRecoverableMonthly: 200,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            propertyTaxAnnual: 240,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: 480,
            propertyInsuranceAnnual: 0,
            otherCostsMonthly: 0,
            coldRentMonthly: 1_000,
            parkingRentMonthly: 0,
            otherIncomeMonthly: 0,
            hasParking: false,
            statusEntries: entries,
            extraordinaryCosts: [extraDeductible, extraNotDeductible]
        )

        let withoutExtra = TaxCalculator.annualTaxableIncome(
            year: year,
            economicTransferDate: transferDate,
            loanStartDate: loanStart,
            loanAmount: 200_000,
            interestRate: 0.04,
            monthlyMortgage: 1_000,
            afaBemessungsgrundlage: 200_000,
            depreciationRate: 0.02,
            hoaFeeNonRecoverableMonthly: 100,
            hoaFeeRecoverableMonthly: 200,
            hoaFeeParkingNonRecoverableMonthly: 0,
            hoaFeeParkingRecoverableMonthly: 0,
            propertyTaxAnnual: 240,
            propertyTaxParkingAnnual: 0,
            propertyManagementAnnual: 480,
            propertyInsuranceAnnual: 0,
            otherCostsMonthly: 0,
            coldRentMonthly: 1_000,
            parkingRentMonthly: 0,
            otherIncomeMonthly: 0,
            hasParking: false,
            statusEntries: entries,
            extraordinaryCosts: []
        )

        // Only the deductible 2_000 should affect the result, not the 5_000 non-deductible
        XCTAssertEqual(withExtra - withoutExtra, -2_000, accuracy: 0.01,
                       "Only deductible extraordinary costs reduce taxable income")
    }
}

// MARK: - Date helper for tests
private extension Date {
    func addingDays(_ days: Int) -> Date {
        Calendar(identifier: .gregorian).date(byAdding: .day, value: days, to: self) ?? self
    }
}
