import SwiftUI

struct PercentField: View {
    let label: String
    @Binding var value: Double
    var isRequired: Bool = false

    @State private var text: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            TextField("0,00 %", text: $text)
                .font(.appMono)
                .multilineTextAlignment(.trailing)
                .frame(width: 100)
                .focused($isFocused)
                .onChange(of: isFocused) { _, focused in
                    if focused {
                        let displayValue = value * 100
                        text = displayValue == 0 ? "" : String(format: "%.2f", displayValue)
                    } else {
                        commitValue()
                    }
                }
        }
        .onAppear {
            let displayValue = value * 100
            text = displayValue == 0 ? "" : Formatters.formatPercentOneDecimal(value)
        }
    }

    private func commitValue() {
        let cleaned = text
            .replacingOccurrences(of: "%", with: "")
            .replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        if let parsed = Double(cleaned) {
            value = parsed / 100.0
        }
        let displayValue = value * 100
        text = displayValue == 0 ? "" : Formatters.formatPercentOneDecimal(value)
    }
}
