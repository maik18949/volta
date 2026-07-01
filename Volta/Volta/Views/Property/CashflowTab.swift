import SwiftUI
import SwiftData

struct CashflowTab: View {
    let vm: PropertyViewModel

    @State private var modus: PrognoseModus = .vollvermietung
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())

    private enum PrognoseModus: String, CaseIterable {
        case vollvermietung = "Vollvermietung"
        case leerstand = "Leerstand"
    }

    private var property: Property { vm.property }
    private let cal = Calendar.current
    private var currentYear: Int { cal.component(.year, from: Date()) }
    private var currentMonth: Int { cal.component(.month, from: Date()) }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                prognoseCard
                jahresCard
                warnungSection
            }
            .padding(16)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - Card 1: Prognose / Monat

    private var prognoseCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Prognose / Monat")

                Picker("", selection: $modus) {
                    ForEach(PrognoseModus.allCases, id: \.self) { m in
                        Text(m.rawValue).tag(m)
                    }
                }
                .pickerStyle(.segmented)

                prognoseRows(leerstand: modus == .leerstand)
            }
        }
    }

    @ViewBuilder
    private func prognoseRows(leerstand: Bool) -> some View {
        let d = prognosData(leerstand: leerstand)

        VStack(spacing: 0) {
            costRow("+", "Einnahmen", d.einnahmen, color: .appPositive)
            costRow("−", "Kreditrate", d.kreditrate, color: .appNegative)

            gradientDivider

            sectionLabel("Kosten Wohnung")
            costRow("−", "Nicht umlagef. HG", d.hoaNonRec, color: .appNegative)
            costRow("−", "Instandhaltungsrücklage WE", d.hoaResWE, color: .appNegative)
            if d.versicherung > 0 {
                costRow("−", "Gebäudeversicherung", d.versicherung, color: .appNegative)
            }
            costRow("−", "Verwaltung", d.verwaltung, color: .appNegative)
            if d.sonstige > 0 {
                costRow("−", "Sonstige Kosten", d.sonstige, color: .appNegative)
            }
            if leerstand {
                costRow("−", "Umlagef. Kosten WE", d.hoaRecWE, color: .appNegative)
                costRow("−", "Grundsteuer WE", d.grundsteuerWE, color: .appNegative)
            }

            if vm.hasParking {
                gradientDivider
                sectionLabel("Kosten Stellplatz")
                costRow("−", "Nicht umlagef. HG TE", d.hoaParkNonRec, color: .appNegative)
                costRow("−", "Instandhaltungsrücklage TE", d.hoaParkRes, color: .appNegative)
                costRow("−", "Umlagef. Kosten TE", d.hoaParkRec, color: .appNegative)
                if d.grundsteuerTE > 0 {
                    costRow("−", "Grundsteuer TE", d.grundsteuerTE, color: .appNegative)
                }
            }

            gradientDivider

            sumRow("CF vor Steuern", d.cfVorSteuer)

            HStack {
                Text("Steuereffekt")
                    .font(.appBody)
                    .foregroundStyle(Color.appSecondaryText)
                Spacer()
                Text(formatSigned(d.steuereffekt))
                    .font(.appMono)
                    .foregroundStyle(Color.appAccent)
            }
            .padding(.vertical, 4)

            gradientDivider

            HStack {
                Text("CF nach Steuern")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color.appPrimaryText)
                Spacer()
                Text(formatSigned(d.cfNachSteuer))
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Color.valueColor(d.cfNachSteuer))
            }
            .padding(.vertical, 6)
        }
    }

    // MARK: - Card 2: Jahrestabelle

    private var jahresCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: "Jahres-Cashflow")
                yearPicker
                yearlyTable
            }
        }
    }

    private var yearPicker: some View {
        let minYear = cal.component(.year, from: property.economicTransferDate)
        let maxYear = currentYear + 1
        return HStack(spacing: 16) {
            Button {
                if selectedYear > minYear { selectedYear -= 1 }
            } label: {
                Image(systemName: "chevron.left")
                    .foregroundStyle(selectedYear > minYear ? Color.appAccent : Color.appDimText)
            }
            .buttonStyle(.plain)
            .disabled(selectedYear <= minYear)

            Text(String(selectedYear))
                .font(.appHeadline)
                .frame(minWidth: 60)
                .multilineTextAlignment(.center)

            Button {
                if selectedYear < maxYear { selectedYear += 1 }
            } label: {
                Image(systemName: "chevron.right")
                    .foregroundStyle(selectedYear < maxYear ? Color.appAccent : Color.appDimText)
            }
            .buttonStyle(.plain)
            .disabled(selectedYear >= maxYear)

            Spacer()
        }
    }

    private var yearlyTable: some View {
        let months = (1...12).map { monthData(month: $0, year: selectedYear) }
        let isFutureYear = selectedYear > currentYear
        let extraRows = extraCostRows(year: selectedYear)

        return ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                tableHeaderRow(months: months)
                Divider()

                // Rows
                tableRow("Einnahmen", months.map { $0.einnahmen }, color: .appPositive, bold: false)
                tableRow("Kreditrate", months.map { $0.kreditrate }, color: .appNegative, bold: false)

                tableSection("Kosten Wohnung")
                tableRow("Nicht umlagef. HG", months.map { $0.hoaNonRec }, color: .appNegative, bold: false)
                tableRow("Instandhaltungsrücklage WE", months.map { $0.hoaResWE }, color: .appNegative, bold: false)
                if property.propertyInsuranceAnnual > 0 {
                    tableRow("Gebäudeversicherung", months.map { $0.versicherung }, color: .appNegative, bold: false)
                }
                tableRow("Verwaltung", months.map { $0.verwaltung }, color: .appNegative, bold: false)
                if property.otherCostsMonthly > 0 {
                    tableRow("Sonstige Kosten", months.map { $0.sonstige }, color: .appNegative, bold: false)
                }
                // Umlagef. WE — only show row if at least 1 month has leerstand/mietgarantie
                if months.contains(where: { $0.hoaRecWE > 0 }) {
                    tableRow("Umlagef. Kosten WE", months.map { $0.hoaRecWE }, color: .appNegative, bold: false)
                    tableRow("Grundsteuer WE", months.map { $0.grundsteuerWE }, color: .appNegative, bold: false)
                }

                if vm.hasParking {
                    tableSection("Kosten Stellplatz")
                    tableRow("Nicht umlagef. HG TE", months.map { $0.hoaParkNonRec }, color: .appNegative, bold: false)
                    tableRow("Instandhaltungsrücklage TE", months.map { $0.hoaParkRes }, color: .appNegative, bold: false)
                    tableRow("Umlagef. Kosten TE", months.map { $0.hoaParkRec }, color: .appNegative, bold: false)
                    if property.propertyTaxParkingAnnual > 0 {
                        tableRow("Grundsteuer TE", months.map { $0.grundsteuerTE }, color: .appNegative, bold: false)
                    }
                }

                if !extraRows.isEmpty {
                    tableSection("Außergewöhnliche Kosten")
                    ForEach(extraRows, id: \.label) { row in
                        tableRow(row.label, row.values, color: .appNegative, bold: false)
                    }
                }

                Divider()
                    .padding(.vertical, 2)

                tableRow("CF vor Steuern", months.map { $0.cfVorSteuer }, color: nil, bold: true)

                if isFutureYear {
                    futureYearNote
                } else {
                    tableRow("Steuereffekt", months.map { _ in vm.taxEffectMonthly }, color: .appAccent, bold: false)
                    tableRow("CF nach Steuern", months.map { $0.cfVorSteuer + vm.taxEffectMonthly }, color: nil, bold: true)
                }
            }
        }
    }

    // MARK: - Table rows

    private func tableHeaderRow(months: [MonthData]) -> some View {
        HStack(spacing: 0) {
            Text("")
                .frame(width: labelWidth, alignment: .leading)
            ForEach(0..<12, id: \.self) { i in
                let abbr = cal.shortMonthSymbols[i]
                VStack(spacing: 2) {
                    Text(abbr)
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                    if let status = months[i].status {
                        statusDot(status)
                    }
                }
                .frame(width: colWidth)
            }
            Text("Ø Mon")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: summaryWidth)
            Text("Total")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: summaryWidth)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 4)
    }

    private func tableRow(_ label: String, _ values: [Double], color: Color?, bold: Bool) -> some View {
        let avg = values.filter { $0 != 0 }.isEmpty ? 0 : values.reduce(0, +) / 12.0
        let total = values.reduce(0, +)
        let textFont: Font = bold ? .appMonoSmall.bold() : .appMonoSmall

        return HStack(spacing: 0) {
            Text(label)
                .font(bold ? .appBody.bold() : .appBody)
                .foregroundStyle(bold ? Color.appPrimaryText : Color.appSecondaryText)
                .frame(width: labelWidth, alignment: .leading)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            ForEach(0..<12, id: \.self) { i in
                let v = values[i]
                Text(v == 0 ? "–" : formatRounded(v))
                    .font(textFont)
                    .foregroundStyle(cellColor(v, override: color, bold: bold))
                    .frame(width: colWidth, alignment: .trailing)
            }

            Text(avg == 0 ? "–" : formatRounded(avg))
                .font(textFont)
                .foregroundStyle(cellColor(avg, override: color, bold: bold))
                .frame(width: summaryWidth, alignment: .trailing)
                .background(Color.appSumRowTint)

            Text(total == 0 ? "–" : formatRounded(total))
                .font(textFont)
                .foregroundStyle(cellColor(total, override: color, bold: bold))
                .frame(width: summaryWidth, alignment: .trailing)
                .background(Color.appSumRowTint)
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 4)
    }

    private func tableSection(_ title: String) -> some View {
        HStack(spacing: 0) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.appDimText)
                .padding(.vertical, 3)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 4)
    }

    private var futureYearNote: some View {
        HStack(spacing: 0) {
            Text("⚠ Steuereffekt für Zukunftsjahre wird noch berechnet")
                .font(.appCaption)
                .foregroundStyle(Color.appWarning)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 6)
    }

    // MARK: - Warnungen

    @ViewBuilder
    private var warnungSection: some View {
        if !property.isHoaUnitSplit {
            warningBanner("Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung Hausgeld aufteilen (→ Einstellungen)")
        }
        if vm.hasParking && !property.isHoaParkingSplit {
            warningBanner("Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung aufteilen (→ Einstellungen)")
        }
    }

    private func warningBanner(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.appWarning)
                .font(.footnote)
            Text(text)
                .font(.appCaption)
                .foregroundStyle(Color.appWarning)
        }
        .padding(12)
        .background(Color.appWarning.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Helpers / Subviews

    private func costRow(_ sign: String, _ label: String, _ amount: Double, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text("\(sign)\(Formatters.formatCurrency(amount))")
                .font(.appMono)
                .foregroundStyle(color)
        }
        .padding(.vertical, 4)
    }

    private func sumRow(_ label: String, _ value: Double) -> some View {
        HStack {
            Text(label)
                .font(.appBody.bold())
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(formatSigned(value))
                .font(.appMono.bold())
                .foregroundStyle(Color.valueColor(value))
        }
        .padding(.vertical, 6)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Color.appDimText)
            .padding(.vertical, 3)
    }

    private var gradientDivider: some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [Color(hex: "#3B82F6").opacity(0.35), .clear],
                startPoint: .leading, endPoint: .trailing
            ))
            .frame(height: 1.5)
            .padding(.vertical, 4)
    }

    private func statusDot(_ status: PropertyStatus) -> some View {
        let color: Color = {
            switch status {
            case .vermietet: return .appPositive
            case .leerstand: return .appNegative
            case .mietgarantie: return .orange
            }
        }()
        return Circle()
            .fill(color)
            .frame(width: 5, height: 5)
    }

    private func cellColor(_ value: Double, override: Color?, bold: Bool) -> Color {
        if let c = override { return c }
        return bold ? Color.valueColor(value) : Color.appPrimaryText
    }

    private func formatSigned(_ value: Double) -> String {
        let s = Formatters.formatCurrency(abs(value))
        return value >= 0 ? "+\(s)" : "−\(s)"
    }

    private func formatRounded(_ value: Double) -> String {
        Formatters.formatCurrencyRounded(value)
    }

    // MARK: - Layout constants

    private let labelWidth: CGFloat = 170
    private let colWidth: CGFloat = 62
    private let summaryWidth: CGFloat = 80

    // MARK: - Data helpers

    struct MonthData {
        let einnahmen: Double
        let kreditrate: Double
        let hoaNonRec: Double
        let hoaResWE: Double
        let versicherung: Double
        let verwaltung: Double
        let sonstige: Double
        let hoaRecWE: Double
        let grundsteuerWE: Double
        let hoaParkNonRec: Double
        let hoaParkRes: Double
        let hoaParkRec: Double
        let grundsteuerTE: Double
        let status: PropertyStatus?

        var cfVorSteuer: Double {
            einnahmen
                - kreditrate
                - hoaNonRec
                - hoaResWE
                - versicherung
                - verwaltung
                - sonstige
                - hoaRecWE
                - grundsteuerWE
                - hoaParkNonRec
                - hoaParkRes
                - hoaParkRec
                - grundsteuerTE
        }
    }

    struct ExtraRow {
        let label: String
        let values: [Double]
    }

    private func monthData(month: Int, year: Int) -> MonthData {
        guard let date = cal.date(from: DateComponents(year: year, month: month, day: 1)) else {
            return emptyMonthData
        }

        let activeEntry = vm.activeStatus(for: date)
        let status = activeEntry?.status
        let isLeerstand = status == .leerstand || status == .mietgarantie

        let einnahmen: Double = {
            switch status {
            case .vermietet:
                return property.coldRentMonthly + property.parkingRentMonthly + property.otherIncomeMonthly
            case .mietgarantie:
                return activeEntry?.incomeActualMonthly ?? 0
            case .leerstand, .none:
                return 0
            }
        }()

        let afterLoanStart = property.loanAmount > 0 && date >= property.loanStartDate.firstDayOfMonth
        let kreditrate = afterLoanStart ? vm.monthlyMortgage : 0

        let hoaNonRec = vm.hoaFeeNonRecoverableMonthly
        let hoaResWE = property.hoaFeeMaintenanceReserveMonthly
        let versicherung = property.propertyInsuranceAnnual / 12.0
        let verwaltung = property.propertyManagementAnnual / 12.0
        let sonstige = property.otherCostsMonthly
        let hoaRecWE = isLeerstand ? property.hoaFeeRecoverableMonthly : 0
        let grundsteuerWE = isLeerstand ? property.propertyTaxAnnual / 12.0 : 0
        let hoaParkNonRec = vm.hasParking ? vm.hoaFeeParkingNonRecoverableMonthly : 0
        let hoaParkRes = vm.hasParking ? property.hoaFeeParkingMaintenanceReserveMonthly : 0
        let hoaParkRec = vm.hasParking ? property.hoaFeeParkingRecoverableMonthly : 0
        let grundsteuerTE = vm.hasParking ? property.propertyTaxParkingAnnual / 12.0 : 0

        return MonthData(
            einnahmen: einnahmen,
            kreditrate: kreditrate,
            hoaNonRec: hoaNonRec,
            hoaResWE: hoaResWE,
            versicherung: versicherung,
            verwaltung: verwaltung,
            sonstige: sonstige,
            hoaRecWE: hoaRecWE,
            grundsteuerWE: grundsteuerWE,
            hoaParkNonRec: hoaParkNonRec,
            hoaParkRes: hoaParkRes,
            hoaParkRec: hoaParkRec,
            grundsteuerTE: grundsteuerTE,
            status: status
        )
    }

    private var emptyMonthData: MonthData {
        MonthData(einnahmen: 0, kreditrate: 0, hoaNonRec: 0, hoaResWE: 0,
                  versicherung: 0, verwaltung: 0, sonstige: 0, hoaRecWE: 0,
                  grundsteuerWE: 0, hoaParkNonRec: 0, hoaParkRes: 0, hoaParkRec: 0,
                  grundsteuerTE: 0, status: PropertyStatus?.none)
    }

    private func extraCostRows(year: Int) -> [ExtraRow] {
        let costsInYear = property.extraordinaryCosts.filter {
            cal.component(.year, from: $0.costMonth) == year
        }
        guard !costsInYear.isEmpty else { return [] }

        let categories = Dictionary(grouping: costsInYear) { cost in
            cost.descriptionText?.isEmpty == false ? (cost.descriptionText ?? cost.category.rawValue) : cost.category.rawValue
        }

        return categories.map { label, costs in
            let values: [Double] = (1...12).map { month in
                costs.filter { cal.component(.month, from: $0.costMonth) == month }
                     .reduce(0) { $0 + $1.amount }
            }
            return ExtraRow(label: label, values: values)
        }.sorted { $0.label < $1.label }
    }

    struct PrognosSnapshot {
        let einnahmen: Double
        let kreditrate: Double
        let hoaNonRec: Double
        let hoaResWE: Double
        let versicherung: Double
        let verwaltung: Double
        let sonstige: Double
        let hoaRecWE: Double
        let grundsteuerWE: Double
        let hoaParkNonRec: Double
        let hoaParkRes: Double
        let hoaParkRec: Double
        let grundsteuerTE: Double
        let steuereffekt: Double

        var cfVorSteuer: Double {
            einnahmen - kreditrate - hoaNonRec - hoaResWE - versicherung - verwaltung - sonstige
                - hoaRecWE - grundsteuerWE - hoaParkNonRec - hoaParkRes - hoaParkRec - grundsteuerTE
        }

        var cfNachSteuer: Double { cfVorSteuer + steuereffekt }
    }

    private func prognosData(leerstand: Bool) -> PrognosSnapshot {
        let einnahmen: Double = leerstand ? 0
            : property.coldRentMonthly + property.parkingRentMonthly + property.otherIncomeMonthly
        return PrognosSnapshot(
            einnahmen: einnahmen,
            kreditrate: vm.monthlyMortgage,
            hoaNonRec: vm.hoaFeeNonRecoverableMonthly,
            hoaResWE: property.hoaFeeMaintenanceReserveMonthly,
            versicherung: property.propertyInsuranceAnnual / 12.0,
            verwaltung: property.propertyManagementAnnual / 12.0,
            sonstige: property.otherCostsMonthly,
            hoaRecWE: leerstand ? property.hoaFeeRecoverableMonthly : 0,
            grundsteuerWE: leerstand ? property.propertyTaxAnnual / 12.0 : 0,
            hoaParkNonRec: vm.hasParking ? vm.hoaFeeParkingNonRecoverableMonthly : 0,
            hoaParkRes: vm.hasParking ? property.hoaFeeParkingMaintenanceReserveMonthly : 0,
            hoaParkRec: vm.hasParking ? property.hoaFeeParkingRecoverableMonthly : 0,
            grundsteuerTE: vm.hasParking ? property.propertyTaxParkingAnnual / 12.0 : 0,
            steuereffekt: vm.taxEffectMonthly
        )
    }
}
