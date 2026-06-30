import SwiftUI

struct SetupStepStatus: View {
    @Bindable var state: PropertySetupState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Status-Onboarding")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                Text("Seit wann ist die Immobilie in deinem Besitz? Gib den ersten Status ein.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)

                DatePicker(
                    "Datum *",
                    selection: $state.firstStatusDate,
                    displayedComponents: .date
                )

                VStack(alignment: .leading, spacing: 4) {
                    Text("Status *")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("Status", selection: $state.firstStatus) {
                        ForEach(PropertyStatus.allCases, id: \.self) { status in
                            Text(status.rawValue).tag(status)
                        }
                    }
                    .pickerStyle(.menu)
                }

                if state.firstStatus == .mietgarantie {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Einnahme/Monat (€)")
                            .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                        TextField("Garantiebetrag", text: $state.firstStatusIncome)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Notizen")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextEditor(text: $state.firstStatusNotes)
                        .frame(minHeight: 80)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.appDimText, lineWidth: 1)
                        )
                }
            }
            .padding(20)
        }
        .onAppear {
            // Default firstStatusDate to economicTransferDate
            state.firstStatusDate = state.economicTransferDate
        }
    }
}
