import SwiftUI

// MARK: - PrognoseModus

private enum PrognoseModus: String, CaseIterable {
    case vollvermietung = "Vollvermietung"
    case leerstand = "Leerstand"
}

// MARK: - TaxTab

struct TaxTab: View {
    let vm: PropertyViewModel

    @State private var prognoseYear: Int = Calendar.current.component(.year, from: Date()) + 1
    @State private var prognoseModus: PrognoseModus = .vollvermietung

    private var currentYear: Int {
        Calendar.current.component(.year, from: Date())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard {
                    VStack(alignment: .leading, spacing: 0) {
                        // Sektion 1 — Laufendes Jahr
                        laufendesJahrSection
                            .padding(16)

                        // Warnungen unter Sektion 1
                        warningSection
                            .padding(.horizontal, 16)
                            .padding(.bottom, laufendesJahrWarnings.isEmpty ? 0 : 12)

                        // Gradient Divider
                        Rectangle()
                            .fill(LinearGradient(
                                colors: [Color(hex: "#3B82F6").opacity(0.35), .clear],
                                startPoint: .leading, endPoint: .trailing
                            ))
                            .frame(height: 1.5)

                        // Sektion 2 — Prognose
                        prognoseSection
                            .padding(16)
                    }
                }
            }
            .padding(16)
        }
        .background(Color.appContentBackground)
    }

    // MARK: - Sektion 1: Laufendes Jahr

    private var laufendesJahrSection: some View {
        let data = laufendesJahrData()

        return VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("LAUFENDES JAHR \(String(currentYear))")
                    .font(.appCaption).fontWeight(.bold)
                    .foregroundStyle(Color.appSecondaryText)
                Spacer()
                Text("Ist")
                    .font(.appCaption)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.appAccent.opacity(0.15))
                    .foregroundStyle(Color.appAccent)
                    .clipShape(Capsule())
            }

            // Transfer date hint
            if isFutureTransfer {
                Text("Besitzübergang am \(formattedTransferDate) — Werte ab diesem Datum.")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
            }

            // Rows
            VStack(spacing: 0) {
                taxRow(label: "Einnahmen",
                       value: formatEuro(data.einnahmen, sign: .plus),
                       valueColor: .appPositive)

                taxRow(label: "Zinsen",
                       value: formatEuro(data.zinsen, sign: .minus),
                       valueColor: .appNegative)

                taxRow(label: "AfA",
                       value: formatEuro(data.afa, sign: .minus),
                       valueColor: .appNegative)

                taxRow(label: "Nicht umlagef. Kosten Wohnung",
                       value: formatEuro(data.nichtUmlagWE, sign: .minus),
                       valueColor: .appNegative)

                if vm.property.propertyInsuranceAnnual > 0 {
                    taxRow(label: "Gebäudeversicherung",
                           value: formatEuro(data.versicherung, sign: .minus),
                           valueColor: .appNegative)
                }

                taxRow(label: "Hausverwaltung",
                       value: formatEuro(data.verwaltung, sign: .minus),
                       valueColor: .appNegative)

                if vm.property.otherCostsMonthly > 0 {
                    taxRow(label: "Sonstige Kosten",
                           value: formatEuro(data.sonstige, sign: .minus),
                           valueColor: .appNegative)
                }

                taxRow(label: "Umlagef. Kosten Wohnung",
                       value: formatEuro(data.umlagWE, sign: .minus),
                       valueColor: .appNegative)

                taxRow(label: "Grundsteuer Wohnung",
                       value: formatEuro(data.grundsteuerWE, sign: .minus),
                       valueColor: .appNegative)

                if vm.hasParking {
                    taxRow(label: "Nicht umlagef. Kosten Stellplatz",
                           value: formatEuro(data.nichtUmlagTE, sign: .minus),
                           valueColor: .appNegative)

                    taxRow(label: "Umlagef. Kosten Stellplatz",
                           value: formatEuro(data.umlagTE, sign: .minus),
                           valueColor: .appNegative)

                    taxRow(label: "Grundsteuer Stellplatz",
                           value: formatEuro(data.grundsteuerTE, sign: .minus),
                           valueColor: .appNegative)
                }

                if data.aussergewoehnliche > 0 {
                    taxRow(label: "Außergewöhnliche Kosten",
                           value: formatEuro(data.aussergewoehnliche, sign: .minus),
                           valueColor: .appNegative)
                }

                // Divider
                Divider()
                    .padding(.vertical, 4)

                taxRow(label: "Steuerliches Ergebnis",
                       value: formatEuroSigned(data.ergebnis),
                       valueColor: data.ergebnis < 0 ? .appPositive : .appNegative,
                       isBold: true)

                // Steuereffekt / Mon — 22px fett
                HStack {
                    Text("Steuereffekt / Mon")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Color.appPrimaryText)
                    Spacer()
                    Text(formatEuroSigned(data.steuereffektMonat))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(data.ergebnis < 0 ? Color.appPositive : Color.appNegative)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
        }
    }

    // MARK: - Warnings

    private var laufendesJahrWarnings: [String] {
        var warnings: [String] = []
        if !vm.property.isHoaUnitSplit {
            warnings.append("Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Einstellungen)")
        }
        if vm.hasParking && !vm.property.isHoaParkingSplit {
            warnings.append("Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Einstellungen)")
        }
        return warnings
    }

    @ViewBuilder
    private var warningSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(laufendesJahrWarnings, id: \.self) { warning in
                HStack(alignment: .top, spacing: 6) {
                    Text("⚠")
                        .font(.appCaption)
                        .foregroundStyle(Color(hex: "#D97706"))
                    Text(warning)
                        .font(.appCaption)
                        .foregroundStyle(Color(hex: "#D97706"))
                }
            }
        }
    }

    // MARK: - Sektion 2: Prognose

    private var prognoseSection: some View {
        let data = prognoseData()

        return VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("PROGNOSE")
                    .font(.appCaption).fontWeight(.bold)
                    .foregroundStyle(Color.appSecondaryText)
                Spacer()
                Text("Prognose")
                    .font(.appCaption)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.appSecondaryText.opacity(0.12))
                    .foregroundStyle(Color.appSecondaryText)
                    .clipShape(Capsule())
            }

            // Jahr-Picker
            HStack(spacing: 12) {
                Button(action: { prognoseYear -= 1 }) {
                    Image(systemName: "chevron.left")
                        .font(.appCaption.weight(.semibold))
                        .foregroundStyle(Color.appAccent)
                }
                Text(String(prognoseYear))
                    .font(.appBody.weight(.semibold))
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(minWidth: 40, alignment: .center)
                Button(action: { prognoseYear += 1 }) {
                    Image(systemName: "chevron.right")
                        .font(.appCaption.weight(.semibold))
                        .foregroundStyle(Color.appAccent)
                }
            }

            // Segmented picker
            Picker("Modus", selection: $prognoseModus) {
                ForEach(PrognoseModus.allCases, id: \.self) { modus in
                    Text(modus.rawValue).tag(modus)
                }
            }
            .pickerStyle(.segmented)

            // Rows
            VStack(spacing: 0) {
                taxRow(label: "Einnahmen",
                       value: formatEuro(data.einnahmen, sign: .plus),
                       valueColor: .appPositive)

                taxRow(label: "Zinsen",
                       value: formatEuro(data.zinsen, sign: .minus),
                       valueColor: .appNegative)

                taxRow(label: "AfA",
                       value: formatEuro(data.afa, sign: .minus),
                       valueColor: .appNegative)

                taxRow(label: "Nicht umlagef. Kosten Wohnung",
                       value: formatEuro(data.nichtUmlagWE, sign: .minus),
                       valueColor: .appNegative)

                if vm.property.propertyInsuranceAnnual > 0 {
                    taxRow(label: "Gebäudeversicherung",
                           value: formatEuro(data.versicherung, sign: .minus),
                           valueColor: .appNegative)
                }

                taxRow(label: "Hausverwaltung",
                       value: formatEuro(data.verwaltung, sign: .minus),
                       valueColor: .appNegative)

                if vm.property.otherCostsMonthly > 0 {
                    taxRow(label: "Sonstige Kosten",
                           value: formatEuro(data.sonstige, sign: .minus),
                           valueColor: .appNegative)
                }

                // Umlagef. WE + Grundsteuer WE: nur bei Leerstand
                if prognoseModus == .leerstand {
                    taxRow(label: "Umlagef. Kosten Wohnung",
                           value: formatEuro(data.umlagWE, sign: .minus),
                           valueColor: .appNegative)

                    taxRow(label: "Grundsteuer Wohnung",
                           value: formatEuro(data.grundsteuerWE, sign: .minus),
                           valueColor: .appNegative)
                }

                if vm.hasParking {
                    taxRow(label: "Nicht umlagef. Kosten Stellplatz",
                           value: formatEuro(data.nichtUmlagTE, sign: .minus),
                           valueColor: .appNegative)

                    taxRow(label: "Umlagef. Kosten Stellplatz",
                           value: formatEuro(data.umlagTE, sign: .minus),
                           valueColor: .appNegative)

                    taxRow(label: "Grundsteuer Stellplatz",
                           value: formatEuro(data.grundsteuerTE, sign: .minus),
                           valueColor: .appNegative)
                }

                // Divider
                Divider()
                    .padding(.vertical, 4)

                taxRow(label: "Steuerliches Ergebnis (Prog.)",
                       value: formatEuroSigned(data.ergebnis),
                       valueColor: data.ergebnis < 0 ? .appPositive : .appNegative,
                       isBold: true)

                HStack {
                    Text("Steuereffekt / Mon")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Color.appPrimaryText)
                    Spacer()
                    Text(formatEuroSigned(data.steuereffektMonat))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(data.ergebnis < 0 ? Color.appPositive : Color.appNegative)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
        }
    }

    // MARK: - Shared Row Helper

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

    // MARK: - Data container

    private struct YearData {
        var einnahmen: Double = 0
        var zinsen: Double = 0
        var afa: Double = 0
        var nichtUmlagWE: Double = 0
        var versicherung: Double = 0
        var verwaltung: Double = 0
        var sonstige: Double = 0
        var umlagWE: Double = 0
        var grundsteuerWE: Double = 0
        var nichtUmlagTE: Double = 0
        var umlagTE: Double = 0
        var grundsteuerTE: Double = 0
        var aussergewoehnliche: Double = 0
        var ergebnis: Double = 0
        var steuereffektMonat: Double = 0
    }

    // MARK: - Calculations: Laufendes Jahr

    private func laufendesJahrData() -> YearData {
        var d = YearData()
        let year = currentYear
        let p = vm.property

        // Einnahmen: tagesgenau über alle Monate
        var einnahmen = 0.0
        for month in 1...12 {
            einnahmen += TaxCalculator.incomeForMonth(
                month: month,
                year: year,
                statusEntries: p.statusHistory,
                coldRentMonthly: p.coldRentMonthly,
                parkingRentMonthly: p.parkingRentMonthly,
                otherIncomeMonthly: p.otherIncomeMonthly
            )
        }
        d.einnahmen = einnahmen

        // Zinsen: amortisierend für das laufende Jahr
        d.zinsen = annualInterest(year: year)

        // AfA: anteilig im Erwerbsjahr, sonst voll
        let transferYear = Calendar.current.component(.year, from: p.economicTransferDate)
        if year == transferYear {
            d.afa = DepreciationCalculator.depreciationProratedInAcquisitionYear(
                afaBasis: vm.afaBasis,
                rate: p.depreciationRate,
                economicTransferDate: p.economicTransferDate
            )
        } else {
            d.afa = vm.depreciationYearly
        }

        // Eigentumsmonate im Jahr
        let eigentumsMonateAnzahl = eigentumsMonateInJahr(year: year)

        // Kosten immer (× Eigentumsmonate)
        d.nichtUmlagWE = vm.hoaFeeNonRecoverableMonthly * Double(eigentumsMonateAnzahl)
        d.versicherung = (p.propertyInsuranceAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        d.verwaltung   = (p.propertyManagementAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        d.sonstige     = p.otherCostsMonthly * Double(eigentumsMonateAnzahl)

        // Leerstandsanteil für umlagefähige WE-Kosten
        let leerAnteil = leerstandsAnteil(year: year)
        d.umlagWE       = p.hoaFeeRecoverableMonthly * 12.0 * leerAnteil
        d.grundsteuerWE = p.propertyTaxAnnual * leerAnteil

        // Stellplatz
        if vm.hasParking {
            d.nichtUmlagTE  = vm.hoaFeeParkingNonRecoverableMonthly * Double(eigentumsMonateAnzahl)
            d.umlagTE       = p.hoaFeeParkingRecoverableMonthly * Double(eigentumsMonateAnzahl)
            d.grundsteuerTE = (p.propertyTaxParkingAnnual / 12.0) * Double(eigentumsMonateAnzahl)
        }

        // Außergewöhnliche absetzbare Kosten im laufenden Jahr
        let cal = Calendar.current
        d.aussergewoehnliche = p.extraordinaryCosts
            .filter { $0.isDeductible && cal.component(.year, from: $0.costMonth) == year }
            .reduce(0.0) { $0 + $1.amount }

        // Steuerliches Ergebnis
        d.ergebnis = d.einnahmen
            - d.zinsen
            - d.afa
            - d.nichtUmlagWE
            - d.versicherung
            - d.verwaltung
            - d.sonstige
            - d.umlagWE
            - d.grundsteuerWE
            - d.nichtUmlagTE
            - d.umlagTE
            - d.grundsteuerTE
            - d.aussergewoehnliche

        // Steuereffekt / Monat
        let steuererstattung = max(0, -d.ergebnis) * p.marginalTaxRate
        let eigMonate = Double(max(1, eigentumsMonateAnzahl))
        d.steuereffektMonat = steuererstattung / eigMonate

        return d
    }

    // MARK: - Calculations: Prognose

    private func prognoseData() -> YearData {
        var d = YearData()
        let p = vm.property

        // Einnahmen je Szenario
        switch prognoseModus {
        case .vollvermietung:
            d.einnahmen = (p.coldRentMonthly + p.parkingRentMonthly + p.otherIncomeMonthly) * 12
        case .leerstand:
            d.einnahmen = 0
        }

        // Zinsen für prognoseYear (amortisierend)
        d.zinsen = annualInterest(year: prognoseYear)

        // AfA: voll (kein Erwerbsjahr-Abzug für Prognose)
        d.afa = vm.depreciationYearly

        // Kosten immer (12 Monate)
        d.nichtUmlagWE = vm.hoaFeeNonRecoverableMonthly * 12
        d.versicherung = p.propertyInsuranceAnnual
        d.verwaltung   = p.propertyManagementAnnual
        d.sonstige     = p.otherCostsMonthly * 12

        // Umlagef. WE + Grundsteuer WE: nur bei Leerstand
        switch prognoseModus {
        case .vollvermietung:
            d.umlagWE       = 0
            d.grundsteuerWE = 0
        case .leerstand:
            d.umlagWE       = p.hoaFeeRecoverableMonthly * 12
            d.grundsteuerWE = p.propertyTaxAnnual
        }

        // Stellplatz (immer)
        if vm.hasParking {
            d.nichtUmlagTE  = vm.hoaFeeParkingNonRecoverableMonthly * 12
            d.umlagTE       = p.hoaFeeParkingRecoverableMonthly * 12
            d.grundsteuerTE = p.propertyTaxParkingAnnual
        }

        // Steuerliches Ergebnis
        d.ergebnis = d.einnahmen
            - d.zinsen
            - d.afa
            - d.nichtUmlagWE
            - d.versicherung
            - d.verwaltung
            - d.sonstige
            - d.umlagWE
            - d.grundsteuerWE
            - d.nichtUmlagTE
            - d.umlagTE
            - d.grundsteuerTE

        // Steuereffekt / Monat (Prognose: immer 12 Monate)
        let steuererstattung = max(0, -d.ergebnis) * p.marginalTaxRate
        d.steuereffektMonat = steuererstattung / 12.0

        return d
    }

    // MARK: - Helper: Amortizing interest for a year

    private func annualInterest(year: Int) -> Double {
        let p = vm.property
        let cal = Calendar.current

        guard let yearStart = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let yearEnd = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1)) else {
            return 0
        }

        let loanStart = p.loanStartDate.firstDayOfMonth
        if loanStart >= yearEnd { return 0 }

        let r = p.interestRate / 12.0
        let calcStart = max(loanStart, yearStart)
        let warmUpMonths: Int
        if loanStart < calcStart {
            warmUpMonths = cal.dateComponents([.month], from: loanStart, to: calcStart).month ?? 0
        } else {
            warmUpMonths = 0
        }

        var restschuld = p.loanAmount
        let rate = vm.monthlyMortgage
        for _ in 0..<warmUpMonths {
            let zins = restschuld * r
            let tilgung = rate - zins
            restschuld = max(0, restschuld - tilgung)
        }

        let monthsToCalc = cal.dateComponents([.month], from: calcStart, to: yearEnd).month ?? 0
        var totalInterest = 0.0
        for _ in 0..<monthsToCalc {
            let zins = restschuld * r
            totalInterest += zins
            let tilgung = rate - zins
            restschuld = max(0, restschuld - tilgung)
        }
        return totalInterest
    }

    // MARK: - Helper: Eigentumsmonate im Jahr

    private func eigentumsMonateInJahr(year: Int) -> Int {
        let cal = Calendar.current
        let transferYear = cal.component(.year, from: vm.property.economicTransferDate)
        let transferMonth = cal.component(.month, from: vm.property.economicTransferDate)
        if transferYear > year { return 0 }
        if transferYear == year { return 12 - transferMonth + 1 }
        return 12
    }

    // MARK: - Helper: Leerstandsanteil

    private func leerstandsAnteil(year: Int) -> Double {
        let leerTage = TaxCalculator.leerstandDays(in: year, statusEntries: vm.property.statusHistory)
        let cal = Calendar.current
        guard let start = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let end = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1)) else {
            return 0
        }
        let daysInYear = cal.dateComponents([.day], from: start, to: end).day ?? 365
        return leerTage / Double(daysInYear)
    }

    // MARK: - Transfer date helpers

    private var isFutureTransfer: Bool {
        vm.property.economicTransferDate > Date()
    }

    private var formattedTransferDate: String {
        let df = DateFormatter()
        df.dateStyle = .medium
        df.locale = Locale(identifier: "de_DE")
        return df.string(from: vm.property.economicTransferDate)
    }

    // MARK: - Formatting helpers

    private enum SignMode { case plus, minus, none }

    private func formatEuro(_ value: Double, sign: SignMode = .none) -> String {
        let formatted = Formatters.formatCurrency(abs(value))
        switch sign {
        case .plus:  return "+\(formatted)"
        case .minus: return "−\(formatted)"
        case .none:  return formatted
        }
    }

    private func formatEuroSigned(_ value: Double) -> String {
        if value < 0 {
            return "−\(Formatters.formatCurrency(abs(value)))"
        } else if value > 0 {
            return "+\(Formatters.formatCurrency(value))"
        } else {
            return Formatters.formatCurrency(0)
        }
    }
}
