#if DEBUG
import Foundation
import SwiftData

enum SeedData {
    static func insertDresdnerETW(into context: ModelContext) {
        let p = Property()
        p.name = "ETW Dresden Neustadt"
        p.address = "Johann-Meyer-Straße 7b"
        p.city = "Dresden"
        p.state = "Sachsen"
        p.postalCode = "01097"
        p.propertyType = .apartment
        p.acquisitionType = .kauf
        p.yearBuilt = 1998
        p.livingAreaSqm = 63.18
        p.rooms = 2.5
        p.hasBalcony = true
        p.parkingType = .tiefgarage
        p.parkingCount = 1

        // Kauf
        p.purchaseDate = Date.firstDay(year: 2025, month: 9)
        p.economicTransferDate = Date.firstDay(year: 2026, month: 2)
        p.purchasePriceUnit = 263_600
        p.purchasePriceParking = 15_000
        p.landTransferTax = 15_323
        p.notaryCosts = 3_631.96
        p.landRegistryCosts = 1_180
        p.agentFee = 0
        p.appraisalCosts = 0
        p.renovationModernizationCosts = 0
        p.renovationAfaEligible = 0

        // Einnahmen
        p.coldRentMonthly = 950
        p.parkingRentMonthly = 48
        p.otherIncomeMonthly = 0
        p.warmmieteMonthly = 1_242
        p.vacancyRateAssumption = 0.03
        p.marketRentPerSqm = 13.50

        // Kosten
        p.hoaFeeTotalMonthly = 417
        p.isHoaUnitSplit = true
        p.hoaFeeRecoverableMonthly = 292
        p.hoaFeeMaintenanceReserveMonthly = 34.76
        p.isHoaParkingSplit = true   // TG hat kein separates Hausgeld
        p.propertyTaxAnnual = 205
        p.propertyManagementAnnual = 396
        p.propertyInsuranceAnnual = 0
        p.otherCostsMonthly = 0

        // Finanzierung
        p.loanAmount = 230_000
        p.interestRate = 0.043
        p.amortizationRate = 0.01
        p.fixedInterestPeriodYears = 10
        p.loanStartDate = Date.firstDay(year: 2025, month: 10)
        p.monthlyMortgage = 1_242.85

        // AfA & Steuer
        p.landValue = 50_600
        p.buildingValue = 228_000
        p.depreciationRate = 0.0384
        p.marginalTaxRate = 0.42

        // Statushistorie
        let statusMietgarantie = StatusEntry(
            date: Date.firstDay(year: 2026, month: 2),
            status: .mietgarantie,
            incomeActualMonthly: 998,
            notes: "Mietgarantie Cosona"
        )
        statusMietgarantie.property = p
        p.statusHistory = [statusMietgarantie]

        context.insert(p)
        try? context.save()
    }
}
#endif
