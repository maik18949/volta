import SwiftUI

struct CashflowTab: View {
    let vm: PropertyViewModel
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())

    private var availableYears: [Int] {
        let start = Calendar.current.component(.year, from: vm.property.economicTransferDate)
        let current = Calendar.current.component(.year, from: Date())
        return Array(start...max(start, current))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                sollIstSection
                statusHistorySection
                extraordinaryCostsSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
    }

    private var sollIstSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Cashflow — Soll vs. Ist")
                Spacer()
                Picker("Jahr", selection: $selectedYear) {
                    ForEach(availableYears, id: \.self) { year in
                        Text(String(year)).tag(year)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 100)
            }

            HStack {
                Text("Monat").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 60, alignment: .leading)
                Spacer()
                Text("Soll").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 100, alignment: .trailing)
                Text("Ist").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 100, alignment: .trailing)
                Text("Abweichung").font(.appCaption).foregroundStyle(Color.appSecondaryText).frame(width: 80, alignment: .trailing)
            }
            .padding(.horizontal, 12)

            Divider()

            VStack(spacing: 0) {
                ForEach(1...12, id: \.self) { month in
                    let date = Date.firstDay(year: selectedYear, month: month)
                    if date.firstDayOfMonth >= vm.property.economicTransferDate.firstDayOfMonth
                        && date <= Date().firstDayOfMonth {
                        monthRow(date: date, month: month)
                        if month < 12 { Divider().padding(.leading, 12) }
                    }
                }
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func monthRow(date: Date, month: Int) -> some View {
        let monthName = DateFormatter().monthSymbols[month - 1]
        let soll = vm.cashflowAfterDebtMonthly
        let actual = vm.cashflowActual(for: date)
        let ist = actual?.afterTax
        let deviation = ist.map { $0 - soll }

        HStack {
            Text(monthName.prefix(3))
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 60, alignment: .leading)
            Spacer()
            Text(Formatters.formatCurrencyRounded(soll))
                .font(.appMono)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 100, alignment: .trailing)
            Text(ist.map { Formatters.formatCurrencyRounded($0) } ?? "–")
                .font(.appMono)
                .foregroundStyle(ist.map { Color.valueColor($0) } ?? .appSecondaryText)
                .frame(width: 100, alignment: .trailing)
            Text(deviation.map {
                ($0 >= 0 ? "+" : "") + Formatters.formatCurrencyRounded($0)
            } ?? "–")
                .font(.appMonoSmall)
                .foregroundStyle(deviation.map { Color.valueColor($0) } ?? .appSecondaryText)
                .frame(width: 80, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(month % 2 == 0 ? Color.appCardBackground : Color.appCardBackground.opacity(0.6))
    }

    private var statusHistorySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Statushistorie")

            if vm.property.statusHistory.isEmpty {
                Text("Noch kein Statuseintrag vorhanden.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
            } else {
                VStack(spacing: 0) {
                    ForEach(vm.property.statusHistory.sorted(by: { $0.statusFrom < $1.statusFrom })) { entry in
                        HStack {
                            StatusBadge(status: entry.status)
                            Text("ab \(entry.statusFrom, format: .dateTime.month().year())")
                                .font(.appCaption)
                                .foregroundStyle(Color.appSecondaryText)
                            Spacer()
                            Text(Formatters.formatCurrency(entry.incomeActualMonthly) + "/Mon")
                                .font(.appMono)
                                .foregroundStyle(Color.appPrimaryText)
                            if let notes = entry.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.appCaption)
                                    .foregroundStyle(Color.appSecondaryText)
                                    .lineLimit(1)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        Divider().padding(.leading, 12)
                    }
                }
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var extraordinaryCostsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Außerordentliche Kosten")

            if vm.property.extraordinaryCosts.isEmpty {
                Text("Keine außerordentlichen Kosten erfasst.")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
            } else {
                extraordinaryCostsList
            }
        }
    }

    @ViewBuilder
    private var extraordinaryCostsList: some View {
        let sortedCosts = vm.property.extraordinaryCosts.sorted(by: { $0.costMonth < $1.costMonth })
        VStack(spacing: 0) {
            ForEach(sortedCosts) { cost in
                HStack {
                    Text(cost.costMonth, format: .dateTime.month().year())
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                        .frame(width: 80, alignment: .leading)
                    Text(cost.category.rawValue)
                        .font(.appBody)
                        .foregroundStyle(Color.appPrimaryText)
                    if let desc = cost.descriptionText, !desc.isEmpty {
                        Text("— \(desc)")
                            .font(.appCaption)
                            .foregroundStyle(Color.appSecondaryText)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(Formatters.formatCurrency(cost.amount))
                        .font(.appMono)
                        .foregroundStyle(Color.appNegative)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                Divider().padding(.leading, 12)
            }
        }
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
