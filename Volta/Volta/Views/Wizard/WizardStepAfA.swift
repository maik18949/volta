import SwiftUI

struct WizardStepAfA: View {
    @Bindable var state: WizardState

    var purchasePrice: Double { state.purchasePriceUnit + state.purchasePriceParking }
    var closingCosts: Double {
        state.landTransferTax + state.notaryCosts + state.landRegistryCosts
            + state.agentFee + state.appraisalCosts
    }
    var afaBasis: Double {
        DepreciationCalculator.afaBasis(
            buildingValue: state.buildingValue,
            closingCostsTotal: closingCosts,
            purchasePrice: purchasePrice,
            renovationAfaEligible: state.renovationAfaEligible
        )
    }
    var depreciationYearly: Double {
        DepreciationCalculator.depreciationYearly(afaBasis: afaBasis, rate: state.depreciationRate)
    }
    var sumDeviation: Double {
        abs((state.landValue + state.buildingValue) - purchasePrice) / max(1, purchasePrice)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (Regierungs-Excel). Beide Werte sollten sich zum Kaufpreis addieren (Toleranz ±5%).")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Gebäudewert (Excel) *", value: $state.buildingValue, isRequired: true)
            CurrencyField(label: "Grundstückswert (Excel) *", value: $state.landValue, isRequired: true)

            if sumDeviation > 0.05 && purchasePrice > 0 {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(Color(hex: "#D97706"))
                    Text("Gebäude + Grundstück (\(Formatters.formatCurrencyRounded(state.buildingValue + state.landValue))) weicht \(Formatters.formatPercentOneDecimal(sumDeviation)) vom Kaufpreis ab.")
                        .font(.appCaption)
                        .foregroundStyle(Color(hex: "#D97706"))
                }
                .padding(10)
                .background(Color(hex: "#D97706").opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            PercentField(label: "AfA-Satz *", value: $state.depreciationRate, isRequired: true)

            Text("Standard: 2,0% (ab 1925) · 2,5% (vor 1925) · 3,0% (Neubau ab 2023) · Individuell per Gutachten (z.B. 3,84%)")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)

            PercentField(label: "Grenzsteuersatz *", value: $state.marginalTaxRate, isRequired: true)

            if afaBasis > 0 {
                Divider()
                VStack(spacing: 4) {
                    summaryRow("AfA-Basis", value: afaBasis)
                    summaryRow("AfA jährlich", value: depreciationYearly, isBold: true)
                    summaryRow("AfA monatlich", value: depreciationYearly / 12)
                }
                .padding(12)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }
}
