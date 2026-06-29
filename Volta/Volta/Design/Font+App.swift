import SwiftUI

extension Font {
    static let appTabTitle     = Font.system(size: 20, weight: .bold)
    static let appSectionLabel = Font.system(size: 11, weight: .bold)
    static let appResultValue  = Font.system(size: 22, weight: .heavy)
    static let appRowLabel     = Font.system(size: 12, weight: .medium)
    static let appRowValue     = Font.system(size: 12, weight: .semibold).monospacedDigit()
    static let appColumnHeader = Font.system(size: 10, weight: .bold)
    static let appSubtext      = Font.system(size: 11, weight: .regular)
    // MARK: - Legacy (backwards compat — do not use in new code)
    static let appHeadline     = Font.system(size: 17, weight: .semibold)
    static let appBody         = Font.system(size: 15, weight: .regular)
    static let appCaption      = Font.system(size: 12, weight: .regular)
    static let appDisplay      = Font.system(size: 28, weight: .semibold)
    static let appMono         = Font.system(size: 13, weight: .regular, design: .monospaced)
    static let appMonoSmall    = Font.system(size: 11, weight: .regular, design: .monospaced)
}
