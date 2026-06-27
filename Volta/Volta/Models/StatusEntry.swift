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
    // Stored as plain String to avoid SwiftData composite-attribute decoding failures
    // when the schema evolves. Exposed as PropertyStatus via the computed property below.
    var statusRaw: String = PropertyStatus.vermietet.rawValue
    var incomeActualMonthly: Double?    // nur für .mietgarantie — Garantiebetrag/Monat
    var notes: String = ""
    var createdAt: Date = Date()        // für Feed-Sortierung bei gleichem Datum
    var property: Property?

    var status: PropertyStatus {
        get { PropertyStatus(rawValue: statusRaw) ?? .vermietet }
        set { statusRaw = newValue.rawValue }
    }

    init(date: Date, status: PropertyStatus, incomeActualMonthly: Double? = nil, notes: String = "") {
        self.date = date
        self.statusRaw = status.rawValue
        self.incomeActualMonthly = incomeActualMonthly
        self.notes = notes
        self.createdAt = Date()
    }
}
