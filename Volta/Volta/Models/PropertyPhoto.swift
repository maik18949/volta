import Foundation
import SwiftData

@Model
class PropertyPhoto {
    var filePath: String = ""
    var isCoverPhoto: Bool = false
    var sortOrder: Int = 0
    var createdAt: Date = Date()
    var property: Property?

    init(filePath: String, isCoverPhoto: Bool = false, sortOrder: Int = 0) {
        self.filePath = filePath
        self.isCoverPhoto = isCoverPhoto
        self.sortOrder = sortOrder
        self.createdAt = Date()
    }
}
