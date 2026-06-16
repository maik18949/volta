import SwiftUI

struct TaxTab: View {
    let vm: PropertyViewModel

    // Prognose in-memory state (not persisted)
    @State private var prognoseYear: Int = Calendar.current.component(.year, from: Date()) + 1
    @State private var prognoseRent: Double = 0
    @State private var prognoseParking: Double = 0
    @State private var prognoseHoa: Double = 0
    @State private var prognoseInitialized = false

    private var currentYear: Int { Calendar.current.component(.year, from: Date()) }

    private var prognoseYears: [Int] {
        let base = currentYear + 1
        return Array(base...(base + 9))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                afaSection
                istSection
                prognoseSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
        .onAppear {
            if !prognoseInitialized {
                prognoseRent    = vm.property.coldRentMonthly
                prognoseParking = vm.property.parkingRentMonthly
                prognoseHoa     = vm.property.hoaFeeTotalMonthly
                prognoseInitialized = true
            }
        }
    }

    // MARK: - AfA Section

    private var afaSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "AfA — Absetzung für Abnutzung")
            VStack(spacing: 0) {
                taxRow(label: "Gebäudewert", value: Formatters.formatCurrency(vm.property.buildingValue))
                taxRow(label: "Grundstückswert", value: Formatters.formatCurrency(vm.property.landValue))
                taxRow(label: "AfA-Basis", value: Formatters.formatCurrency(vm.afaBasis), isBold: true)
                taxRow(label: "AfA-Satz", value: Formatters.formatPercentOneDecimal(vm.property.depreciationRate))
                taxRow(label: "AfA jährlich", value: Formatters.formatCurrency(vm.depreciationYearly), isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Ist Section

    private var istSection: some View {
        let taxableIncome = vm.annualTaxableIncomeCurrentYear
        let taxEffect = vm.taxEffectYearlyCurrentYear
        let ownershipMonths = vm.ownershipMonthsCurrentYear
        let showHoaWarning = !vm.property.isHoaUnitSplit

        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Laufendes Jahr \(currentYear) — Steuerliches Ergebnis")

            if showHoaWarning {
                warningBanner("Für genaue Berechnung Hausgeld Wohnung aufteilen (Einstellungen)")
            }

            VStack(spacing: 0) {
                taxRow(label: "Einnahmen (Ist + Projektion)", value: Formatters.formatCurrency(vm.annualIncomeCurrentYear))
                taxRow(label: "− Zinsen (amortisierend, inkl. vor Besitzübergang)",
                       value: "−" + Formatters.formatCurrency(vm.interestCurrentYear), valueColor: .appNegative)
                taxRow(label: "− AfA (\(ownershipMonths) Monate)",
                       value: "−" + Formatters.formatCurrency(vm.afaCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Nicht umlagefähige Kosten Wohnung",
                       value: "−" + Formatters.formatCurrency(vm.hoaFeeNonRecoverableUnitMonthly * Double(ownershipMonths)), valueColor: .appNegative)
                if vm.property.hasParking {
                    taxRow(label: "− Hausgeld Stellplatz (immer)",
                           value: "−" + Formatters.formatCurrency(
                            (vm.hoaFeeNonRecoverableParkingMonthly + vm.property.hoaFeeParkingRecoverableMonthly) * Double(ownershipMonths)),
                           valueColor: .appNegative)
                    taxRow(label: "− Grundsteuer Stellplatz",
                           value: "−" + Formatters.formatCurrency(vm.propertyTaxParkingMonthly * Double(ownershipMonths)),
                           valueColor: .appNegative)
                }
                taxRow(label: "− Umlagefähige Kosten Wohnung (Leerstand)",
                       value: "−" + Formatters.formatCurrency(vm.recoverableUnitLeerstandDeductionCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Grundsteuer Wohnung (Leerstand)",
                       value: "−" + Formatters.formatCurrency(vm.grundsteuerUnitLeerstandDeductionCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Hausverwaltung",
                       value: "−" + Formatters.formatCurrency(vm.propertyManagementMonthly * Double(ownershipMonths)), valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "= Steuerliches Ergebnis", value: Formatters.formatCurrency(taxableIncome),
                       valueColor: Color.valueColor(-taxableIncome), isBold: true)
                taxRow(label: "× Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "= Steuererstattung Jahr", value: Formatters.formatCurrency(taxEffect),
                       valueColor: taxEffect > 0 ? .appPositive : .appNegative, isBold: true)
                taxRow(label: "÷ \(ownershipMonths) Eigentumsmonate",
                       value: "= " + Formatters.formatCurrency(vm.taxEffectMonthlyCurrentYear) + "/Mon",
                       isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Prognose Section

    private var prognoseSection: some View {
        let taxableIncome = vm.prognoseTaxableIncome(
            year: prognoseYear,
            coldRent: prognoseRent,
            parkingRent: prognoseParking,
            hoaTotal: prognoseHoa
        )
        let taxEffect = TaxCalculator.taxEffectYearly(taxableIncomeVV: taxableIncome, marginalTaxRate: vm.property.marginalTaxRate)

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionHeader(title: "Prognose")
                Spacer()
                Picker("Jahr", selection: $prognoseYear) {
                    ForEach(prognoseYears, id: \.self) { y in Text(String(y)).tag(y) }
                }.pickerStyle(.menu).frame(width: 100)
                Button("Zurücksetzen") {
                    prognoseRent    = vm.property.coldRentMonthly
                    prognoseParking = vm.property.parkingRentMonthly
                    prognoseHoa     = vm.property.hoaFeeTotalMonthly
                }.font(.appCaption).foregroundStyle(Color.appAccent)
            }

            VStack(spacing: 0) {
                prognoseSlider("Kaltmiete/Monat", value: $prognoseRent, range: 0...3000, step: 10)
                if vm.property.hasParking {
                    prognoseSlider("Stellplatz/Monat", value: $prognoseParking, range: 0...500, step: 5)
                }
                prognoseSlider("Hausgeld gesamt/Monat", value: $prognoseHoa, range: 0...1500, step: 10)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(spacing: 0) {
                taxRow(label: "Einnahmen (Vollvermietung, 12 Mon.)",
                       value: Formatters.formatCurrency((prognoseRent + prognoseParking) * 12))
                taxRow(label: "− Zinsen (amortisierend \(prognoseYear))",
                       value: "−" + Formatters.formatCurrency(
                        AmortizationCalculator.interestForCalendarYear(
                            year: prognoseYear,
                            loanStartDate: vm.property.loanStartDate,
                            loanAmount: vm.property.loanAmount,
                            interestRate: vm.property.interestRate,
                            monthlyPayment: vm.monthlyMortgage)
                       ), valueColor: .appNegative)
                taxRow(label: "− AfA", value: "−" + Formatters.formatCurrency(vm.depreciationYearly), valueColor: .appNegative)
                taxRow(label: "− Nicht umlagefähige Kosten × 12",
                       value: "−" + Formatters.formatCurrency(vm.hoaFeeNonRecoverableUnitMonthly * 12), valueColor: .appNegative)
                if vm.property.hasParking {
                    taxRow(label: "− Stellplatz-Kosten × 12",
                           value: "−" + Formatters.formatCurrency(
                            (vm.hoaFeeNonRecoverableParkingMonthly + vm.property.hoaFeeParkingRecoverableMonthly + vm.propertyTaxParkingMonthly) * 12),
                           valueColor: .appNegative)
                }
                taxRow(label: "− Hausverwaltung × 12",
                       value: "−" + Formatters.formatCurrency(vm.propertyManagementMonthly * 12), valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "= Steuerliches Ergebnis (Prognose)",
                       value: Formatters.formatCurrency(taxableIncome),
                       valueColor: Color.valueColor(-taxableIncome), isBold: true)
                taxRow(label: "× Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "= Steuererstattung (Prognose)",
                       value: Formatters.formatCurrency(taxEffect),
                       valueColor: taxEffect > 0 ? .appPositive : .appNegative, isBold: true)
                taxRow(label: "÷ 12", value: "= " + Formatters.formatCurrency(taxEffect / 12) + "/Mon", isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func taxRow(label: String, value: String,
                        valueColor: Color = .appPrimaryText, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(value).font(isBold ? .appMono.weight(.semibold) : .appMono).foregroundStyle(valueColor)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }

    @ViewBuilder
    private func prognoseSlider(_ label: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label).font(.appBody).foregroundStyle(Color.appPrimaryText)
                Spacer()
                Text(Formatters.formatCurrency(value.wrappedValue)).font(.appMono).foregroundStyle(Color.appPrimaryText).frame(width: 100, alignment: .trailing)
            }
            Slider(value: value, in: range, step: step)
                .padding(.horizontal, 4)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }

    @ViewBuilder
    private func warningBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle").foregroundStyle(Color(hex: "#D97706"))
            Text(message).font(.appCaption).foregroundStyle(Color(hex: "#D97706"))
        }
        .padding(10)
        .background(Color(hex: "#D97706").opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
