import Foundation
import SwiftData

enum PropertyStatus: String, Codable, CaseIterable {
    case vermietet    = "Vermietet"
    case leerstand    = "Leerstand"
    case mietgarantie = "Mietgarantie"

    var hasIncome: Bool {
        switch self {
        case .vermietet, .mietgarantie: return true
        case .leerstand: return false
        }
    }
}

@Model
class StatusEntry {
    var id: UUID = UUID()
    var property: Property?
    var statusFrom: Date = Date()
    var status: PropertyStatus = PropertyStatus.vermietet
    var incomeActualMonthly: Double = 0.0
    var notes: String?

    init(statusFrom: Date, status: PropertyStatus, incomeActualMonthly: Double, notes: String? = nil) {
        self.statusFrom = statusFrom
        self.status = status
        self.incomeActualMonthly = incomeActualMonthly
        self.notes = notes
    }
}
