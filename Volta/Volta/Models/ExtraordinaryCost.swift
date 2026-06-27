import Foundation
import SwiftData

enum ExtraordinaryCostCategory: String, Codable, CaseIterable {
    case sonderumlage = "Sonderumlage"
    case reparatur = "Reparatur"
    case gutachter = "Gutachter"
    case rechtskosten = "Rechtskosten"
    case sonstiges = "Sonstiges"
}

@Model
class ExtraordinaryCost {
    var id: UUID = UUID()
    var property: Property?
    var costMonth: Date = Date()
    var amount: Double = 0.0
    var category: ExtraordinaryCostCategory = ExtraordinaryCostCategory.sonstiges
    var descriptionText: String?
    /// Steuerlich absetzbar (§9 EStG Werbungskosten). Sonderumlage z.B. nicht immer.
    var isDeductible: Bool = true

    init(costMonth: Date, amount: Double, category: ExtraordinaryCostCategory, descriptionText: String? = nil, isDeductible: Bool = true) {
        self.costMonth = costMonth.firstDayOfMonth
        self.amount = amount
        self.category = category
        self.descriptionText = descriptionText
        self.isDeductible = isDeductible
    }
}
