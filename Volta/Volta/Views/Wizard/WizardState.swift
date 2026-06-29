import Foundation
import Observation

@Observable
class WizardState {
    // Stammdaten
    var name: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var propertyType: PropertyType = .apartment
    var acquisitionType: AcquisitionType = .kauf
    var yearBuilt: String = ""
    var notes: String = ""

    // Objektdaten
    var livingAreaSqm: Double = 0.0
    var usableAreaSqm: Double = 0.0
    var landAreaSqm: Double = 0.0
    var rooms: Double = 0.0
    var bedrooms: Int = 0
    var bathrooms: Int = 0
    var hasBalcony: Bool = false
    var hasTerrace: Bool = false
    var hasGarden: Bool = false
    var hasBasement: Bool = false
    var hasFittedKitchen: Bool = false
    var parkingType: ParkingType = .nichtVorhanden
    var parkingCount: Int = 0
    var heatingType: HeatingType? = nil
    var energyEfficiencyClass: EnergyClass? = nil
    var condition: PropertyCondition? = nil
    var lastRenovationYear: String = ""

    // Kauf
    var purchaseDate: Date = Date()
    var economicTransferDate: Date = Date()
    var purchasePriceUnit: Double = 0.0
    var purchasePriceParking: Double = 0.0
    var landTransferTax: Double = 0.0
    var notaryCosts: Double = 0.0
    var landRegistryCosts: Double = 0.0
    var agentFee: Double = 0.0
    var appraisalCosts: Double = 0.0
    var renovationModernizationCosts: Double = 0.0
    var renovationAfaEligible: Double = 0.0

    // Einnahmen
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var warmmieteMonthly: Double = 0.0
    var vacancyRateAssumption: Double = 0.03
    var rentMarketSqm: Double = 0.0

    // Kosten
    var hoaFeeTotalMonthly: Double = 0.0
    var hoaFeeRecoverableMonthly: Double = 0.0
    var propertyTaxAnnual: Double = 0.0
    var propertyManagementAnnual: Double = 0.0
    var hoaFeeMaintenanceReserveMonthly: Double = 0.0
    var propertyInsuranceAnnual: Double = 0.0
    var otherCostsMonthly: Double = 0.0

    // Finanzierung
    var loanAmount: Double = 0.0
    var interestRate: Double = 0.0
    var amortizationRate: Double = 0.0
    var fixedInterestPeriodYears: Int = 10
    var loanStartDate: Date = Date()
    var monthlyMortgage: Double = 0.0

    // AfA & Steuer
    var landValue: Double = 0.0
    var buildingValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0

    // Status Onboarding (conditional step)
    var firstStatusDate: Date = Date()
    var firstStatus: PropertyStatus = .leerstand
    var firstStatusIncome: Double = 0.0
    var firstStatusNotes: String = ""

    var canFinish: Bool {
        !name.isEmpty
            && !address.isEmpty
            && !city.isEmpty
            && purchasePriceUnit > 0
            && coldRentMonthly > 0
            && loanAmount > 0
            && interestRate > 0
            && amortizationRate > 0
            && buildingValue > 0
            && landValue > 0
    }

    var requiresStatusOnboarding: Bool {
        economicTransferDate.firstDayOfMonth <= Date().firstDayOfMonth
    }

    var totalSteps: Int { requiresStatusOnboarding ? 8 : 7 }
}
