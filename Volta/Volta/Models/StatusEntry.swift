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
    var date: Date = Date()
    var status: PropertyStatus = PropertyStatus.vermietet
    var incomeActualMonthly: Double?    // nur für .mietgarantie — Garantiebetrag/Monat
    var notes: String = ""
    var createdAt: Date = Date()        // für Feed-Sortierung bei gleichem Datum
    var property: Property?

    init(date: Date, status: PropertyStatus, incomeActualMonthly: Double? = nil, notes: String = "") {
        self.date = date
        self.status = status
        self.incomeActualMonthly = incomeActualMonthly
        self.notes = notes
        self.createdAt = Date()
    }
}
