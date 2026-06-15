import SwiftUI

struct WizardStepStammdaten: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gib die Basisdaten deiner Immobilie ein. Name und Adresse sind Pflichtfelder.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            formField("Name *", hint: "z. B. ETW Dresden Neustadt") {
                TextField("ETW Dresden Neustadt", text: $state.name)
                    .textFieldStyle(.roundedBorder)
            }
            formField("Adresse *", hint: "Straße und Hausnummer") {
                TextField("Johann-Meyer-Straße 7b", text: $state.address)
                    .textFieldStyle(.roundedBorder)
            }
            HStack(spacing: 12) {
                VStack(alignment: .leading) {
                    Text("PLZ").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("01097", text: $state.postalCode)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                }
                VStack(alignment: .leading) {
                    Text("Stadt *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("Dresden", text: $state.city)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading) {
                    Text("Bundesland").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("Sachsen", text: $state.state)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 140)
                }
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Objekttyp").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.propertyType) {
                        ForEach(PropertyType.allCases, id: \.self) { t in Text(t.rawValue).tag(t) }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 180)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Erwerbsart").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.acquisitionType) {
                        ForEach(AcquisitionType.allCases, id: \.self) { t in Text(t.rawValue).tag(t) }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 180)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Baujahr").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("1998", text: $state.yearBuilt)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Notizen").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextEditor(text: $state.notes)
                    .font(.appBody)
                    .frame(height: 80)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.appSecondaryText.opacity(0.3)))
            }
        }
    }

    @ViewBuilder
    private func formField<Content: View>(_ label: String, hint: String = "", @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            content()
            if !hint.isEmpty {
                Text(hint).font(.appCaption).foregroundStyle(Color.appSecondaryText.opacity(0.7))
            }
        }
    }
}
