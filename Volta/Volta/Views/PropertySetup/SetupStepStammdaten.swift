import SwiftUI

struct SetupStepStammdaten: View {
    @Bindable var state: PropertySetupState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Stammdaten")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                labeledField("Name *", placeholder: "z.B. ETW Dresden Neustadt", text: $state.name)
                labeledField("Adresse *", placeholder: "Straße und Hausnummer", text: $state.address)
                labeledField("Stadt *", placeholder: "Stadt", text: $state.city)
                labeledField("PLZ", placeholder: "Postleitzahl", text: $state.postalCode)
                labeledField("Bundesland", placeholder: "Bundesland", text: $state.state)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Typ")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    Picker("Typ", selection: $state.propertyType) {
                        ForEach(PropertyType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Erwerb")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    Picker("Erwerb", selection: $state.acquisitionType) {
                        ForEach(AcquisitionType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Baujahr")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    TextField("z.B. 1985", text: $state.yearBuilt)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Notizen")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    TextEditor(text: $state.notes)
                        .frame(minHeight: 80)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.appDimText, lineWidth: 1)
                        )
                }
            }
            .padding(20)
        }
    }

    @ViewBuilder
    private func labeledField(_ label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            TextField(placeholder, text: text)
                .textFieldStyle(.roundedBorder)
        }
    }
}
