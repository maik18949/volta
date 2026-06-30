import SwiftUI

struct HoaFeeSection: View {
    let title: String
    @Binding var total: String
    @Binding var isSplit: Bool
    @Binding var recoverable: String
    @Binding var maintenanceReserve: String
    var infoText: String? = nil

    private var totalVal: Double { Double(total) ?? 0 }
    private var recoverableVal: Double { Double(recoverable) ?? 0 }
    private var reserveVal: Double { Double(maintenanceReserve) ?? 0 }
    private var nonRecoverable: Double { max(0, totalVal - recoverableVal - reserveVal) }
    private var isValid: Bool { recoverableVal + reserveVal <= totalVal }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.appSectionLabel)
                .foregroundStyle(Color.appSectionLabel)

            TextField("Gesamt/Monat (€)", text: $total)
                .decimalKeyboard()

            Toggle("Aufteilen", isOn: $isSplit)

            if isSplit {
                TextField("davon umlagefähig/Monat (€)", text: $recoverable)
                    .decimalKeyboard()
                TextField("davon Instandhaltungsrücklage/Monat (€)", text: $maintenanceReserve)
                    .decimalKeyboard()
                Text("davon nicht umlagefähig: \(Formatters.formatCurrency(nonRecoverable))/Monat")
                    .foregroundStyle(Color.appSecondaryText)
                    .font(.appSubtext)
                if !isValid {
                    Text("⚠ Umlagefähig + Rücklage darf nicht größer als Gesamt sein")
                        .foregroundStyle(Color.appNegative)
                        .font(.appSubtext)
                }
            } else {
                if let info = infoText {
                    Text(info).font(.appSubtext).foregroundStyle(Color.appSecondaryText)
                } else {
                    Text("ⓘ Hausgeld aufteilen für genaue steuerliche Berechnung")
                        .font(.appSubtext).foregroundStyle(Color.appSecondaryText)
                }
            }
        }
    }
}
