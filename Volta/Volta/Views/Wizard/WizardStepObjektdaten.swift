import SwiftUI

struct WizardStepObjektdaten: View {
    @Bindable var state: WizardState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Objektdaten sind optional — trage nur ein, was du weißt.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Wohnfläche (m²) *", value: $state.livingAreaSqm, isRequired: true)
            CurrencyField(label: "Nutzfläche (m²)", value: $state.usableAreaSqm)
            CurrencyField(label: "Zimmer", value: $state.rooms)

            HStack(spacing: 24) {
                Toggle("Balkon", isOn: $state.hasBalcony)
                Toggle("Terrasse", isOn: $state.hasTerrace)
                Toggle("Garten", isOn: $state.hasGarden)
                Toggle("Keller", isOn: $state.hasBasement)
                Toggle("Einbauküche", isOn: $state.hasFittedKitchen)
            }
            .font(.appBody)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stellplatz").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.parkingType) {
                        ForEach(ParkingType.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(t)
                        }
                    }.pickerStyle(.menu)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Heizung").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.heatingType) {
                        Text("–").tag(Optional<HeatingType>.none)
                        ForEach(HeatingType.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Energieklasse").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.energyEfficiencyClass) {
                        Text("–").tag(Optional<EnergyClass>.none)
                        ForEach(EnergyClass.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Zustand").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Picker("", selection: $state.condition) {
                        Text("–").tag(Optional<PropertyCondition>.none)
                        ForEach(PropertyCondition.allCases, id: \.self) { t in
                            Text(t.rawValue).tag(Optional(t))
                        }
                    }.pickerStyle(.menu)
                }
            }
        }
    }
}
