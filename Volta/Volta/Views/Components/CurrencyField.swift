import SwiftUI

struct CurrencyField: View {
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
            TextField("0,00 €", text: $text)
                .font(.appMono)
                .multilineTextAlignment(.trailing)
                .frame(width: 130)
                .focused($isFocused)
                .onChange(of: isFocused) { _, focused in
                    if focused {
                        text = value == 0 ? "" : String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
                    } else {
                        commitValue()
                    }
                }
        }
        .onAppear {
            text = value == 0 ? "" : Formatters.formatCurrency(value)
        }
    }

    private func commitValue() {
        let cleaned = text
            .replacingOccurrences(of: "€", with: "")
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        value = Double(cleaned) ?? value
        text = value == 0 ? "" : Formatters.formatCurrency(value)
    }
}
