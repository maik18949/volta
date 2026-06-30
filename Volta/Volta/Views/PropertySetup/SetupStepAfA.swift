import SwiftUI

struct SetupStepAfA: View {
    @Bindable var state: PropertySetupState

    private var buildingVal: Double { Double(state.buildingValue) ?? 0 }
    private var landVal: Double { Double(state.landValue) ?? 0 }
    private var depRate: Double { (Double(state.depreciationRate) ?? 2.0) / 100.0 }
    private var purchaseUnit: Double { Double(state.purchasePriceUnit) ?? 0 }
    private var purchaseParking: Double { Double(state.purchasePriceParking) ?? 0 }
    private var totalPurchase: Double { purchaseUnit + purchaseParking }

    private var closingCosts: Double {
        let a = Double(state.landTransferTax) ?? 0
        let b = Double(state.notaryCosts) ?? 0
        let c = Double(state.landRegistryCosts) ?? 0
        let d = Double(state.agentFee) ?? 0
        let e = Double(state.appraisalCosts) ?? 0
        return a + b + c + d + e
    }

    private var renovationAfaEligible: Double { Double(state.renovationAfaEligible) ?? 0 }

    // AfA-Bemessungsgrundlage: Gebäudewert + (Nebenkosten × Gebäudewert / Kaufpreis) + aktivierungspfl. Renovierung
    private var afaBasis: Double {
        guard totalPurchase > 0 else {
            return buildingVal + renovationAfaEligible
        }
        return buildingVal
            + (closingCosts * buildingVal / totalPurchase)
            + renovationAfaEligible
    }

    private var afaJahr: Double { afaBasis * depRate }
    private var afaMonat: Double { afaJahr / 12.0 }

    // Warning if |building + land - purchase| > 5% of purchase
    private var showWarning: Bool {
        guard totalPurchase > 0 else { return false }
        return abs((buildingVal + landVal) - totalPurchase) > totalPurchase * 0.05
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("AfA & Steuer")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                currencyField("Gebäudewert * (aus Regierungs-Excel)", text: $state.buildingValue)
                currencyField("Grundstückswert * (aus Regierungs-Excel)", text: $state.landValue)

                if showWarning {
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Color.appWarning)
                        Text("Gebäude + Grundstück weicht stark vom Kaufpreis ab. Werte aus dem Regierungs-Excel prüfen.")
                            .font(.appSubtext)
                            .foregroundStyle(Color.appWarning)
                    }
                    .padding(10)
                    .background(Color.appWarning.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                percentField("AfA-Satz (%) *", text: $state.depreciationRate, placeholder: "z.B. 2")
                percentField("Grenzsteuersatz (%) *", text: $state.marginalTaxRate, placeholder: "z.B. 42")

                // Zusammenfassung
                Text("ZUSAMMENFASSUNG")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                readonlyRow("AfA-Bemessungsgrundlage", value: Formatters.formatCurrencyRounded(afaBasis))
                Text("= Gebäudewert + (Nebenkosten × Gebäudewert / Kaufpreis) + aktiv. Renovierung")
                    .font(.appSubtext)
                    .foregroundStyle(Color.appSecondaryText)

                readonlyRow("AfA / Jahr", value: Formatters.formatCurrencyRounded(afaJahr))
                readonlyRow("AfA / Monat", value: Formatters.formatCurrencyRounded(afaMonat))
            }
            .padding(20)
        }
    }

    @ViewBuilder
    private func currencyField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField("0", text: text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.decimalPad)
        }
    }

    @ViewBuilder
    private func percentField(_ label: String, text: Binding<String>, placeholder: String = "0") -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField(placeholder, text: text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.decimalPad)
        }
    }

    @ViewBuilder
    private func readonlyRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label).font(.appRowLabel).foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value).font(.appMono).foregroundStyle(Color.appPrimaryText)
        }
    }
}
