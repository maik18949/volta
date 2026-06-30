import Foundation
import SwiftUI
import Observation

@Observable
class PropertySetupState {
    // Stammdaten
    var name = ""
    var address = ""
    var city = ""
    var state = ""
    var postalCode = ""
    var propertyType: PropertyType = .apartment
    var acquisitionType: AcquisitionType = .kauf
    var yearBuilt: String = ""
    var notes = ""

    // Objektdaten
    var livingAreaSqm = ""
    var usableAreaSqm = ""
    var rooms = ""
    var hasBalcony = false
    var hasTerrace = false
    var hasGarden = false
    var hasBasement = false
    var hasFittedKitchen = false
    var parkingType: ParkingType = .nichtVorhanden
    var heatingType: HeatingType? = nil
    var energyClass: EnergyClass? = nil
    var condition: PropertyCondition? = nil
    var lastRenovationYear: String = ""

    // Photos (managed in Objektdaten step, saved on finish — iOS only)
    #if canImport(UIKit)
    var photos: [UIImage] = []
    #endif
    var coverIndex: Int = 0

    // Kauf
    var purchaseDate = Date()
    var economicTransferDate = Date()
    var purchasePriceUnit = ""
    var purchasePriceParking = ""
    var landTransferTax = ""
    var notaryCosts = ""
    var landRegistryCosts = ""
    var agentFee = ""
    var appraisalCosts = ""
    var renovationTotal = ""
    var renovationAfaEligible = ""

    // Einnahmen
    var coldRentMonthly = ""
    var warmmieteMonthly = ""
    var parkingRentMonthly = ""
    var otherIncomeMonthly = ""

    // Kosten
    var hoaFeeTotalMonthly = ""
    var isHoaUnitSplit = false
    var hoaFeeRecoverableMonthly = ""
    var hoaFeeMaintenanceReserveMonthly = ""
    var propertyTaxAnnual = ""
    var propertyManagementAnnual = ""
    var propertyInsuranceAnnual = ""
    var otherCostsMonthly = ""
    var hoaFeeParkingTotalMonthly = ""
    var isHoaParkingSplit = false
    var hoaFeeParkingRecoverableMonthly = ""
    var hoaFeeParkingMaintenanceReserveMonthly = ""
    var propertyTaxParkingAnnual = ""

    // Finanzierung
    var loanAmount = ""
    var interestRate = ""
    var amortizationRate = ""
    var fixedInterestPeriodYears = 10
    var loanStartDate = Date()
    var monthlyMortgage = ""
    var equityContributed = ""
    var brokerCommissionAgreement = ""

    // AfA & Steuer
    var buildingValue = ""
    var landValue = ""
    var depreciationRate = ""
    var marginalTaxRate = ""

    // Status-Onboarding
    var firstStatusDate = Date()
    var firstStatus: PropertyStatus = .vermietet
    var firstStatusIncome = ""
    var firstStatusNotes = ""

    // MARK: - Computed helpers

    var hasParking: Bool { parkingType != .nichtVorhanden }

    var requiresStatusOnboarding: Bool {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let transferStart = cal.startOfDay(for: economicTransferDate)
        return transferStart <= today
    }

    var canFinish: Bool {
        !name.isEmpty && !address.isEmpty && !city.isEmpty
            && (Double(purchasePriceUnit) ?? 0) > 0
            && (Double(coldRentMonthly) ?? 0) > 0
            && (Double(loanAmount) ?? 0) > 0
            && (Double(interestRate) ?? 0) > 0
            && (Double(amortizationRate) ?? 0) > 0
            && (Double(buildingValue) ?? 0) > 0
            && (Double(landValue) ?? 0) > 0
    }
}
