import SwiftUI

struct OverviewTab: View {
    let vm: PropertyViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                kpiSection
                objectDataSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    private var kpiSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Rendite & Ertrag")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                KPICardWithContext(
                    label: "Bruttorendite",
                    value: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.grossYield.map { BenchmarkContext.grossYield($0) } ?? BenchmarkResult(rating: .neutral, context: "Kaufpreis oder Miete fehlt."),
                    width: 200
                )
                KPICardWithContext(
                    label: "Nettorendite",
                    value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.netYield.map { BenchmarkContext.netYield($0) } ?? BenchmarkResult(rating: .neutral, context: "Kosten oder Investment fehlt."),
                    width: 200
                )
                KPICardWithContext(
                    label: "Kaufpreisfaktor",
                    value: vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–",
                    benchmark: vm.mietmultiplikator.map { BenchmarkContext.mietmultiplikator($0) } ?? BenchmarkResult(rating: .neutral, context: "Miete fehlt."),
                    width: 200
                )
                KPICardWithContext(
                    label: "Cash-on-Cash",
                    value: vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.cashOnCashReturn.map { BenchmarkContext.cashOnCash($0) } ?? BenchmarkResult(rating: .neutral, context: "Eigenkapital fehlt."),
                    width: 200
                )
                KPICardWithContext(
                    label: "DSCR (NOI)",
                    value: vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–",
                    benchmark: vm.dscrNOI.map { BenchmarkContext.dscr($0) } ?? BenchmarkResult(rating: .neutral, context: "Schuldendienst fehlt."),
                    width: 200
                )
                KPICardWithContext(
                    label: "LTV",
                    value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                    benchmark: vm.ltvRatio.map { BenchmarkContext.ltv($0) } ?? BenchmarkResult(rating: .neutral, context: "Darlehen fehlt."),
                    width: 200
                )
            }

            HStack(spacing: 12) {
                KPICard(label: "Break-Even-Miete", value: Formatters.formatCurrency(vm.breakEvenRentMonthly), width: 180)
                KPICard(label: "Cap Rate", value: vm.capRate.map { Formatters.formatPercentOneDecimal($0) } ?? "–", width: 150)
                KPICard(label: "NOI / Jahr", value: Formatters.formatCurrencyRounded(vm.netOperatingIncomeYearly), width: 160)
                KPICard(label: "Eigenkapital", value: Formatters.formatCurrencyRounded(vm.equityUsed), width: 160)
            }
        }
    }

    private var objectDataSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Objektdaten")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                infoRow(label: "Typ", value: vm.property.propertyType.displayName)
                infoRow(label: "Baujahr", value: vm.property.yearBuilt.map { String($0) } ?? "–")
                infoRow(label: "Wohnfläche", value: "\(String(format: "%.2f", vm.property.livingAreaSqm)) m²")
                infoRow(label: "Zimmer", value: vm.property.rooms.map { String(format: "%.1f", $0) } ?? "–")
                infoRow(label: "Kaltmiete/m²", value: vm.property.livingAreaSqm > 0
                    ? Formatters.formatCurrency(vm.property.coldRentMonthly / vm.property.livingAreaSqm)
                    : "–")
                infoRow(label: "Kaufpreis/m²", value: vm.property.livingAreaSqm > 0
                    ? Formatters.formatCurrencyRounded(vm.property.purchasePriceUnit / vm.property.livingAreaSqm)
                    : "–")
                infoRow(label: "Energieklasse", value: vm.property.energyEfficiencyClass?.rawValue ?? "–")
                infoRow(label: "Zustand", value: vm.property.condition?.rawValue ?? "–")
            }

            if !vm.property.notes.isEmpty {
                Text(vm.property.notes)
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
                    .padding(.top, 4)
            }
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
        .padding(.vertical, 2)
    }
}
