import SwiftUI

struct WizardStepStatusOnboarding: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "info.circle")
                    .foregroundStyle(Color.appAccent)
                Text("Der wirtschaftliche Übergang (\(state.economicTransferDate, format: .dateTime.day().month().year())) liegt in der Vergangenheit. Erfasse den bisherigen Nutzungsverlauf — mindestens ein Eintrag ab diesem Datum ist Pflicht.")
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)
            }
            .padding(12)
            .background(Color.appAccent.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text("Erster Statuseintrag ab (Datum) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                DatePicker("", selection: $state.firstStatusDate, in: state.economicTransferDate..., displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
                    .onAppear { state.firstStatusDate = state.economicTransferDate }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Status *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("", selection: $state.firstStatus) {
                    ForEach(PropertyStatus.allCases, id: \.self) { s in Text(s.rawValue).tag(s) }
                }.pickerStyle(.segmented)
            }

            CurrencyField(label: "Einnahmen in diesem Zeitraum/Monat *", value: $state.firstStatusIncome)

            VStack(alignment: .leading, spacing: 4) {
                Text("Notiz (optional)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z. B. Mietgarantie Cosona", text: $state.firstStatusNotes)
                    .textFieldStyle(.roundedBorder)
            }

            Text("Weitere Statuswechsel (z. B. Leerstand → Vermietet) können nach dem Anlegen im Cashflow-Tab ergänzt werden.")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
        }
    }
}
