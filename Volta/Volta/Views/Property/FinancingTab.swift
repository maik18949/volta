import SwiftUI
import Charts

struct FinancingTab: View {
    let vm: PropertyViewModel

    private var schedule: [AmortizationCalculator.AnnuityRow] {
        let months = vm.property.fixedInterestPeriodYears * 12
        return AmortizationCalculator.amortizationSchedule(
            loanAmount: vm.property.loanAmount,
            interestRate: vm.property.interestRate,
            monthlyPayment: vm.monthlyMortgage,
            loanStartDate: vm.property.loanStartDate,
            months: months
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                summarySection
                ltvChartSection
                scheduleSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Finanzierungsübersicht")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                KPICard(label: "Darlehensbetrag", value: Formatters.formatCurrencyRounded(vm.property.loanAmount), width: 160)
                KPICard(label: "Zinssatz", value: Formatters.formatPercentOneDecimal(vm.property.interestRate), width: 140)
                KPICard(label: "Tilgungssatz", value: Formatters.formatPercentOneDecimal(vm.property.amortizationRate), width: 140)
                KPICard(label: "Monatliche Rate", value: Formatters.formatCurrency(vm.monthlyMortgage), width: 160)
                KPICard(label: "Zinsen / Jahr", value: Formatters.formatCurrencyRounded(vm.interestAnnual), width: 160)
                KPICard(label: "Zinsbindungsende",
                        value: Calendar.current.date(
                            byAdding: .year, value: vm.property.fixedInterestPeriodYears,
                            to: vm.property.loanStartDate
                        ).map { $0.formatted(.dateTime.month().year()) } ?? "–",
                        width: 160)
                KPICard(label: "Aktuelle Restschuld", value: Formatters.formatCurrencyRounded(vm.remainingDebtNow), width: 170)
                KPICard(label: "LTV aktuell",
                        value: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        valueColor: vm.ltvRatio.map { Color.valueColor(0.75 - $0) } ?? .appPrimaryText,
                        width: 140)
                KPICard(label: "Eigenkapital", value: Formatters.formatCurrencyRounded(vm.equityUsed), width: 150)
            }
        }
    }

    private var ltvChartSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "LTV-Kurve über Zinsbindungsperiode")

            Chart {
                ForEach(schedule) { row in
                    LineMark(
                        x: .value("Monat", row.date),
                        y: .value("LTV %", (row.remainingDebt / vm.totalInvestment) * 100)
                    )
                    .foregroundStyle(Color.appAccent)
                }

                RuleMark(y: .value("Pfandbrief-Grenze", 60))
                    .foregroundStyle(Color.appPositive.opacity(0.6))
                    .lineStyle(StrokeStyle(dash: [4, 4]))
                    .annotation(position: .trailing) {
                        Text("60% — Pfandbrief")
                            .font(.appCaption)
                            .foregroundStyle(Color.appPositive)
                    }
            }
            .frame(height: 200)
            .padding(12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Tilgungsplan (\(vm.property.fixedInterestPeriodYears) Jahre)")

            VStack(spacing: 0) {
                scheduleHeader

                Divider()

                ForEach(schedule.filter { $0.id % 12 == 0 }) { row in
                    scheduleRow(row: row)
                }
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var scheduleHeader: some View {
        HStack {
            Text("Datum").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 80, alignment: .leading)
            Spacer()
            Text("Zinsen").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
            Text("Tilgung").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
            Text("Rate").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 90, alignment: .trailing)
            Text("Restschuld").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 110, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func scheduleRow(row: AmortizationCalculator.AnnuityRow) -> some View {
        HStack {
            Text(row.date, format: .dateTime.month().year())
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 80, alignment: .leading)
            Spacer()
            Text(Formatters.formatCurrencyRounded(row.interest))
                .font(.appMonoSmall)
                .foregroundStyle(Color.appNegative)
                .frame(width: 90, alignment: .trailing)
            Text(Formatters.formatCurrencyRounded(row.principal))
                .font(.appMonoSmall)
                .foregroundStyle(Color.appPositive)
                .frame(width: 90, alignment: .trailing)
            Text(Formatters.formatCurrencyRounded(row.payment))
                .font(.appMonoSmall)
                .foregroundStyle(Color.appPrimaryText)
                .frame(width: 90, alignment: .trailing)
            Text(Formatters.formatCurrencyRounded(row.remainingDebt))
                .font(.appMonoSmall)
                .foregroundStyle(Color.appPrimaryText)
                .frame(width: 110, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(row.id % 24 == 0 ? Color.appCardBackground : Color.appCardBackground.opacity(0.6))
    }
}
