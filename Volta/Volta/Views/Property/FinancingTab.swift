import SwiftUI

struct FinancingTab: View {
    let vm: PropertyViewModel

    // MARK: - Data

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

    private var fixedRateEndDate: Date {
        Calendar.current.date(
            byAdding: .year,
            value: vm.property.fixedInterestPeriodYears,
            to: vm.property.loanStartDate
        )!
    }

    private var yearsRemaining: Int {
        max(0, Calendar.current.dateComponents([.year], from: Date(), to: fixedRateEndDate).year ?? 0)
    }

    private var remainingDebtAtFixedEnd: Double {
        schedule.last?.remainingDebt ?? 0
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if vm.property.loanAmount == 0 {
                    noLoanView
                } else {
                    summarySection
                    scheduleSection
                }
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - No Loan

    private var noLoanView: some View {
        Text("Keine Finanzierung erfasst.\nFinanzierungsdaten können im Immobiliendaten-Tab ergänzt werden.")
            .font(.appBody)
            .foregroundStyle(Color.appSecondaryText)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(24)
    }

    // MARK: - Sektion 1: Finanzierungsübersicht

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Finanzierung")

            VStack(spacing: 0) {
                infoRow(label: "Darlehensbetrag",
                        value: Formatters.formatCurrencyRounded(vm.property.loanAmount))
                Divider().padding(.leading, 12)

                infoRow(label: "Restschuld (heute)",
                        value: Formatters.formatCurrencyRounded(vm.remainingDebtNow))
                Divider().padding(.leading, 12)

                infoRow(label: "Monatliche Rate",
                        value: Formatters.formatCurrency(vm.monthlyMortgage))
                Divider().padding(.leading, 12)

                infoRow(label: "Zinssatz",
                        value: Formatters.formatPercentOneDecimal(vm.property.interestRate))
                Divider().padding(.leading, 12)

                infoRow(label: "Tilgungssatz",
                        value: Formatters.formatPercentOneDecimal(vm.property.amortizationRate))
                Divider().padding(.leading, 12)

                infoRow(label: "Zinsbindung bis",
                        value: "\(Formatters.formatMonthYear(fixedRateEndDate)) (noch \(yearsRemaining) Jahre)")
                Divider().padding(.leading, 12)

                infoRow(label: "Restschuld Zinsbindungsende",
                        value: Formatters.formatCurrencyRounded(remainingDebtAtFixedEnd))
            }
            .padding(.horizontal, 12)
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Sektion 2: Tilgungsplan (jahresweise)

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Tilgungsplan (\(vm.property.fixedInterestPeriodYears) Jahre)")

            VStack(spacing: 0) {
                yearlyScheduleHeader

                Divider()

                ForEach(yearlySchedule()) { row in
                    yearlyScheduleRow(row: row)
                }
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            let endFormatted = Formatters.formatMonthYear(fixedRateEndDate)
            Text("⚠ Ab \(endFormatted): Anschlussfinanzierung noch offen — Konditionen können sich ändern.")
                .font(.appCaption)
                .foregroundStyle(Color.appWarning)
                .padding(.top, 4)
        }
    }

    // MARK: - Yearly Schedule

    struct YearlyRow: Identifiable {
        let id: Int              // Jahr (z.B. 2025)
        let yearStart: Date
        let startDebt: Double
        let totalInterest: Double
        let totalPrincipal: Double
        let totalPayment: Double
        let endDebt: Double
        let isFixedRateEnd: Bool
    }

    private func yearlySchedule() -> [YearlyRow] {
        guard !schedule.isEmpty else { return [] }

        let fixedEndYear = Calendar.current.component(.year, from: fixedRateEndDate)

        // Group monthly rows by year
        var grouped: [Int: [AmortizationCalculator.AnnuityRow]] = [:]
        for row in schedule {
            let year = Calendar.current.component(.year, from: row.date)
            grouped[year, default: []].append(row)
        }

        let sortedYears = grouped.keys.sorted()

        return sortedYears.compactMap { year -> YearlyRow? in
            guard let rows = grouped[year], !rows.isEmpty else { return nil }

            let firstRowId = rows.first!.id  // 1-based month index
            let startDebt: Double
            if firstRowId == 1 {
                startDebt = vm.property.loanAmount
            } else {
                let prevRows = schedule.filter { r in
                    Calendar.current.component(.year, from: r.date) < year
                }
                startDebt = prevRows.last?.remainingDebt ?? vm.property.loanAmount
            }

            let totalInterest = rows.reduce(0) { $0 + $1.interest }
            let totalPrincipal = rows.reduce(0) { $0 + $1.principal }
            let totalPayment = rows.reduce(0) { $0 + $1.payment }
            let endDebt = rows.last!.remainingDebt

            let isFixedRateEnd = (year == fixedEndYear)

            let yearStart = Calendar.current.date(from: DateComponents(year: year, month: 1, day: 1))!

            return YearlyRow(
                id: year,
                yearStart: yearStart,
                startDebt: startDebt,
                totalInterest: totalInterest,
                totalPrincipal: totalPrincipal,
                totalPayment: totalPayment,
                endDebt: endDebt,
                isFixedRateEnd: isFixedRateEnd
            )
        }
    }

    private var yearlyScheduleHeader: some View {
        HStack {
            Text("Jahr")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 48, alignment: .leading)
            Spacer()
            Text("RS Anfang")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 88, alignment: .trailing)
            Text("Zinsen")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 80, alignment: .trailing)
            Text("Tilgung")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 80, alignment: .trailing)
            Text("Rate")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 80, alignment: .trailing)
            Text("RS Ende")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 88, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func yearlyScheduleRow(row: YearlyRow) -> some View {
        VStack(spacing: 0) {
            if row.isFixedRateEnd {
                Divider()
            }

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(row.id)")
                        .font(.appMonoSmall)
                        .foregroundStyle(Color.appPrimaryText)
                    if row.isFixedRateEnd {
                        Text("Zinsbindungsende")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Color.appAccent)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(Color.appAccent.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
                .frame(width: 48, alignment: .leading)

                Spacer()

                Text(Formatters.formatCurrencyRounded(row.startDebt))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(width: 88, alignment: .trailing)
                Text(Formatters.formatCurrencyRounded(row.totalInterest))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appNegative)
                    .frame(width: 80, alignment: .trailing)
                Text(Formatters.formatCurrencyRounded(row.totalPrincipal))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appPositive)
                    .frame(width: 80, alignment: .trailing)
                Text(Formatters.formatCurrencyRounded(row.totalPayment))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(width: 80, alignment: .trailing)
                Text(Formatters.formatCurrencyRounded(row.endDebt))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(width: 88, alignment: .trailing)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(row.isFixedRateEnd ? Color.appAccent.opacity(0.06) : Color.clear)

            if row.isFixedRateEnd {
                Divider()
            }
        }
    }
}
