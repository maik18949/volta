import Foundation
import SwiftData

@Model
class RentGuarantee {
    var id: UUID = UUID()
    var property: Property?
    var guaranteeProvider: String = ""
    var guaranteeAmountMonthly: Double = 0.0
    var guaranteeStartDate: Date = Date()
    var guaranteeEndDate: Date = Date()
    var guaranteeNotes: String = ""

    init(guaranteeProvider: String, guaranteeAmountMonthly: Double,
         guaranteeStartDate: Date, guaranteeEndDate: Date, guaranteeNotes: String = "") {
        self.guaranteeProvider = guaranteeProvider
        self.guaranteeAmountMonthly = guaranteeAmountMonthly
        self.guaranteeStartDate = guaranteeStartDate
        self.guaranteeEndDate = guaranteeEndDate
        self.guaranteeNotes = guaranteeNotes
    }
}
