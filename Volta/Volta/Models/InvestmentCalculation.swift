import Foundation
import SwiftData

@Model
class InvestmentCalculation {
    var id: UUID = UUID()
    var name: String = ""

    // Kauf
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
    var vacancyRateAssumption: Double = 0.03

    // Kosten
    var hoaFeeNonRecoverableMonthly: Double = 0.0
    var propertyManagementAnnual: Double = 0.0
    var maintenanceReserveMonthly: Double = 0.0

    // Finanzierung
    var loanAmount: Double = 0.0
    var interestRate: Double = 0.0
    var amortizationRate: Double = 0.0
    var monthlyMortgageActual: Double?

    // AfA & Steuer
    var buildingValue: Double = 0.0
    var landValue: Double = 0.0
    var depreciationRate: Double = 0.02
    var marginalTaxRate: Double = 0.0

    // Promote
    var promotedPropertyId: UUID?
    var isPromoted: Bool = false
    var promotedAt: Date?
    var notes: String = ""

    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    init() {}
}
