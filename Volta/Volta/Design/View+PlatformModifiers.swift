import SwiftUI

extension View {
    /// On iOS: applies `.keyboardType(.decimalPad)`. On macOS: no-op.
    func decimalKeyboard() -> some View {
        #if os(iOS)
        self.keyboardType(.decimalPad)
        #else
        self
        #endif
    }

    /// On iOS: applies `.keyboardType(.numberPad)`. On macOS: no-op.
    func numberKeyboard() -> some View {
        #if os(iOS)
        self.keyboardType(.numberPad)
        #else
        self
        #endif
    }
}
