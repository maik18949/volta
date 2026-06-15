import Foundation
import SwiftData

enum PropertyStatus: String, Codable, CaseIterable {
    case vermietet = "Vermietet"
    case leerstandMietgarantie = "Leerstand + Mietgarantie"
    case leerstand = "Leerstand"
    case eigennutzung = "Eigennutzung"
    case renovierung = "Renovierung"

    var hasIncome: Bool {
        switch self {
        case .vermietet, .leerstandMietgarantie, .eigennutzung: return true
        case .leerstand, .renovierung: return false
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
