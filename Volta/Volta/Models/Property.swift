import Foundation
import SwiftData

// MARK: - Enums

enum PropertyType: String, Codable, CaseIterable {
    case apartment = "Apartment"
    case einfamilienhaus = "Einfamilienhaus"
    case mehrfamilienhaus = "Mehrfamilienhaus"
    case gewerbe = "Gewerbe"
    case grundstuck = "Grundstück"
    case sonstiges = "Sonstiges"

    var displayName: String {
        switch self {
        case .apartment: return "Eigentumswohnung"
        case .einfamilienhaus: return "Einfamilienhaus"
        case .mehrfamilienhaus: return "Mehrfamilienhaus"
        case .gewerbe: return "Gewerbe"
        case .grundstuck: return "Grundstück"
        case .sonstiges: return "Sonstiges"
        }
    }
}

enum AcquisitionType: String, Codable, CaseIterable {
    case kauf      = "Kauf"
    case erbschaft = "Erbschaft"
    case schenkung = "Schenkung"
}

enum ParkingType: String, Codable, CaseIterable {
    case nichtVorhanden   = "Nicht vorhanden"
    case tiefgarage       = "Tiefgarage"
    case aussenstellplatz = "Außenstellplatz"
    case garage           = "Garage"
}

enum HeatingType: String, Codable, CaseIterable {
    case fernwarme = "Fernwärme"
    case gas = "Gas"
    case ol = "Öl"
    case warmepumpe = "Wärmepumpe"
    case pellet = "Pellet"
    case elektro = "Elektro"
    case sonstiges = "Sonstiges"
}

enum EnergyClass: String, Codable, CaseIterable {
    case aPlusPlus = "A+"
    case a = "A"
    case b = "B"
    case c = "C"
    case d = "D"
    case e = "E"
    case f = "F"
    case g = "G"
    case h = "H"
}

enum PropertyCondition: String, Codable, CaseIterable {
    case neubau = "Neubau"
    case erstbezug = "Erstbezug"
    case gepflegt = "Gepflegt"
    case renovierungsbedurftig = "Renovierungsbedürftig"
    case sanierungsbedurftig = "Sanierungsbedürftig"
}

// MARK: - Property Model

@Model
class Property {
    // Stammdaten
    var id: UUID = UUID()
    var name: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var postalCode: String = ""
    var propertyType: PropertyType = PropertyType.apartment
    var acquisitionType: AcquisitionType = AcquisitionType.kauf
    var yearBuilt: Int?
    var notes: String = ""

    // Objektdaten
    var livingAreaSqm: Double = 0.0
    var usableAreaSqm: Double?
    var landAreaSqm: Double?
    var rooms: Double?
    var bedrooms: Int?
    var bathrooms: Int?
    var floorLevel: Int?
    var hasBalcony: Bool = false
    var hasTerrace: Bool = false
    var hasGarden: Bool = false
    var hasBasement: Bool = false
    var basementSizeSqm: Double?
    var hasFittedKitchen: Bool = false
    var parkingType: ParkingType = ParkingType.nichtVorhanden
    var parkingCount: Int = 0
    var heatingType: HeatingType?
    var energyEfficiencyClass: EnergyClass?
    var condition: PropertyCondition?
    var lastRenovationYear: Int?

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

    // Einnahmen (Prognose)
    var coldRentMonthly: Double = 0.0
    var parkingRentMonthly: Double = 0.0
    var otherIncomeMonthly: Double = 0.0
    var warmmieteMonthly: Double?             // Bruttomiete / Monat, optional, informativ
    var vacancyRateAssumption: Double = 0.03

    // Kosten Wohnung
    var hoaFeeTotalMonthly: Double = 0.0
    var hoaFeeRecoverableMonthly: Double = 0.0
    var isHoaUnitSplit: Bool = false
    var hoaFeeMaintenanceReserveMonthly: Double = 0.0
    var propertyTaxAnnual: Double = 0.0
    var propertyManagementAnnual: Double = 0.0
    var propertyInsuranceAnnual: Double = 0.0
    var otherCostsMonthly: Double = 0.0

    // Kosten Stellplatz
    var hoaFeeParkingTotalMonthly: Double = 0.0
    var isHoaParkingSplit: Bool = false
    var hoaFeeParkingRecoverableMonthly: Double = 0.0
    var hoaFeeParkingMaintenanceReserveMonthly: Double = 0.0
    var propertyTaxParkingAnnual: Double = 0.0

    // Finanzierung
    var loanAmount: Double = 0.0
    var interestRate: Double = 0.0
    var amortizationRate: Double = 0.0
    var fixedInterestPeriodYears: Int = 10
    var loanStartDate: Date = Date()
    var monthlyMortgage: Double = 0.0         // direkt gespeichert, editierbar im Wizard
    var equityContributed: Double = 0.0
    var brokerCommissionAgreement: Double = 0.0

    // AfA & Steuer
    var landValue: Double = 0.0
    var buildingValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0

    // Relationen
    @Relationship(deleteRule: .cascade) var statusHistory: [StatusEntry] = []
    @Relationship(deleteRule: .cascade) var extraordinaryCosts: [ExtraordinaryCost] = []
    @Relationship(deleteRule: .cascade) var photos: [PropertyPhoto] = []

    // Annahmen
    var currentMarketValue: Double? = nil
    var marketRentPerSqm: Double? = nil

    var sortOrder: Int = 0
    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    init() {}
}
