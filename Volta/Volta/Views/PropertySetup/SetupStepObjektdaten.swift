import SwiftUI

struct SetupStepObjektdaten: View {
    @Bindable var state: PropertySetupState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Objektdaten")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                // Area + rooms
                VStack(alignment: .leading, spacing: 4) {
                    Text("Wohnfläche (m²) *")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("z.B. 68", text: $state.livingAreaSqm)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nutzfläche (m²)")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("optional", text: $state.usableAreaSqm)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Zimmer")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("z.B. 3", text: $state.rooms)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                }

                // Ausstattung
                Text("Ausstattung")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                Toggle("Balkon", isOn: $state.hasBalcony)
                Toggle("Terrasse", isOn: $state.hasTerrace)
                Toggle("Garten", isOn: $state.hasGarden)
                Toggle("Keller", isOn: $state.hasBasement)
                Toggle("Einbauküche", isOn: $state.hasFittedKitchen)

                // Stellplatz
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stellplatz")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("Stellplatz", selection: $state.parkingType) {
                        ForEach(ParkingType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Heizung
                VStack(alignment: .leading, spacing: 4) {
                    Text("Heizung")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("Heizung", selection: $state.heatingType) {
                        Text("Keine Angabe").tag(Optional<HeatingType>.none)
                        ForEach(HeatingType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(Optional(type))
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Energieklasse
                VStack(alignment: .leading, spacing: 4) {
                    Text("Energieklasse")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("Energieklasse", selection: $state.energyClass) {
                        Text("Keine Angabe").tag(Optional<EnergyClass>.none)
                        ForEach(EnergyClass.allCases, id: \.self) { ec in
                            Text(ec.rawValue).tag(Optional(ec))
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Zustand
                VStack(alignment: .leading, spacing: 4) {
                    Text("Zustand")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("Zustand", selection: $state.condition) {
                        Text("Keine Angabe").tag(Optional<PropertyCondition>.none)
                        ForEach(PropertyCondition.allCases, id: \.self) { cond in
                            Text(cond.rawValue).tag(Optional(cond))
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Letzte Renovierung (Jahr)")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField("optional", text: $state.lastRenovationYear)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                }

                // Fotos
                Text("Fotos")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                #if canImport(UIKit)
                PhotoGrid(selectedImages: $state.photos, coverIndex: $state.coverIndex)
                #else
                Text("Fotos sind nur auf iOS verfügbar.")
                    .font(.appSubtext).foregroundStyle(Color.appSecondaryText)
                #endif
            }
            .padding(20)
        }
    }
}
