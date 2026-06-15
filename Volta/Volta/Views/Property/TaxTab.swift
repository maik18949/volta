import SwiftUI

struct TaxTab: View {
    let vm: PropertyViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                afaSection
                vvSection
                taxEffectSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    private var afaSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "AfA — Absetzung für Abnutzung")

            VStack(spacing: 0) {
                taxRow(label: "Gebäudewert (Sachwertverfahren)",
                       value: Formatters.formatCurrency(vm.property.buildingValue))
                taxRow(label: "Grundstückswert",
                       value: Formatters.formatCurrency(vm.property.landValue))
                taxRow(label: "Gebäudeanteil am Kaufpreis",
                       value: vm.purchasePrice > 0
                           ? Formatters.formatPercentOneDecimal(vm.property.buildingValue / vm.purchasePrice)
                           : "–")
                taxRow(label: "Kaufnebenkosten (Gebäudeanteil)",
                       value: Formatters.formatCurrency(
                           vm.closingCostsTotal * (vm.purchasePrice > 0 ? vm.property.buildingValue / vm.purchasePrice : 0)
                       ))
                taxRow(label: "Aktivierungspflichtige Renovierung",
                       value: Formatters.formatCurrency(vm.property.renovationAfaEligible))
                Divider().padding(.leading, 12)
                taxRow(label: "AfA-Basis", value: Formatters.formatCurrency(vm.afaBasis), isBold: true)
                taxRow(label: "AfA-Satz", value: Formatters.formatPercentOneDecimal(vm.property.depreciationRate))
                taxRow(label: "AfA jährlich", value: Formatters.formatCurrency(vm.depreciationYearly), isBold: true)
                taxRow(label: "AfA monatlich", value: Formatters.formatCurrency(vm.depreciationMonthly))
                taxRow(label: "AfA im Erwerbsjahr (anteilig)",
                       value: Formatters.formatCurrency(
                           DepreciationCalculator.depreciationProratedInAcquisitionYear(
                               afaBasis: vm.afaBasis,
                               rate: vm.property.depreciationRate,
                               economicTransferDate: vm.property.economicTransferDate
                           )
                       ))
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var vvSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Einkünfte aus Vermietung & Verpachtung (Prognose)")

            VStack(spacing: 0) {
                taxRow(label: "Effektive Mieteinnahmen (nach Leerstand)",
                       value: Formatters.formatCurrency(vm.effectiveGrossIncomeYearly))
                taxRow(label: "− Nicht umlagefähige Kosten",
                       value: "−" + Formatters.formatCurrency(vm.operatingCostsNonRecoverableYearly),
                       valueColor: .appNegative)
                taxRow(label: "− Zinsen",
                       value: "−" + Formatters.formatCurrency(vm.interestAnnual),
                       valueColor: .appNegative)
                taxRow(label: "− AfA",
                       value: "−" + Formatters.formatCurrency(vm.depreciationYearly),
                       valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "V+V-Ergebnis (zu versteuern)",
                       value: Formatters.formatCurrency(vm.taxableIncomeVV),
                       valueColor: Color.valueColor(-vm.taxableIncomeVV),
                       isBold: true)
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var taxEffectSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Steuereffekt")

            VStack(spacing: 0) {
                taxRow(label: "Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "Steuereffekt jährlich",
                       value: Formatters.formatCurrency(
                           TaxCalculator.taxEffectYearly(
                               taxableIncomeVV: vm.taxableIncomeVV,
                               marginalTaxRate: vm.property.marginalTaxRate
                           )
                       ),
                       valueColor: vm.taxableIncomeVV < 0 ? .appPositive : .appNegative,
                       isBold: true)
                taxRow(label: "Steuereffekt monatlich (im Cashflow)",
                       value: Formatters.formatCurrency(vm.taxEffectMonthly),
                       valueColor: vm.taxableIncomeVV < 0 ? .appPositive : .appNegative)
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            if vm.property.marginalTaxRate == 0 {
                Text("⚠️ Grenzsteuersatz ist 0% — Steuereffekt wird nicht berechnet. Wert in Einstellungen setzen.")
                    .font(.appCaption)
                    .foregroundStyle(Color(hex: "#D97706"))
            }
        }
    }

    @ViewBuilder
    private func taxRow(label: String, value: String,
                        valueColor: Color = .appPrimaryText, isBold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(isBold ? .appBody.weight(.semibold) : .appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(value)
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(valueColor)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
