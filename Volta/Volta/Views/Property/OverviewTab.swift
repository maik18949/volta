import SwiftUI

struct OverviewTab: View {
    let vm: PropertyViewModel

    var body: some View {
        VStack(spacing: 0) {
            kpiBar
            Divider()
            ScrollView {
                VStack(spacing: 0) {
                    coverHeader
                    VStack(spacing: 16) {
                        card1AktuellerStand
                        card2RenditeInvestment
                        card3Finanzierung
                        card4Objekt
                    }
                    .padding(16)
                }
            }
        }
        .background(Color.appContentBackground)
    }

    // MARK: - KPI Bar (sticky, outside ScrollView)

    private var kpiBar: some View {
        HStack(spacing: 0) {
            kpiBarSlot(
                label: "CF NACH\nSTEUERN",
                valueText: Formatters.formatCurrency(vm.cashflowAfterTaxMonthly),
                valueColor: Color.valueColor(vm.cashflowAfterTaxMonthly),
                subtextView: AnyView(
                    Text("vor St.: \(Formatters.formatCurrency(vm.cashflowAfterDebtMonthly))")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.appSecondaryText)
                )
            )
            kpiBarSlot(
                label: "NETTO-\nRENDITE",
                valueText: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                valueColor: .appPrimaryText,
                subtextView: AnyView(
                    Group {
                        if let gross = vm.grossYield {
                            Text("Brutto: \(Formatters.formatPercentOneDecimal(gross))")
                                .font(.system(size: 11))
                                .foregroundStyle(Color.appSecondaryText)
                        }
                    }
                )
            )
            kpiBarSlot(
                label: "CASH-ON-\nCASH",
                valueText: vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                valueColor: .appPrimaryText,
                subtextView: AnyView(EmptyView())
            )
            kpiBarSlot(
                label: "DSCR",
                valueText: vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–",
                valueColor: .appPrimaryText,
                subtextView: AnyView(dscrChip)
            )
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        #if os(iOS)
        .background(Color(UIColor.systemBackground))
        #else
        .background(Color.white)
        #endif
        .shadow(color: .black.opacity(0.06), radius: 4, x: 0, y: 2)
    }

    @ViewBuilder
    private func kpiBarSlot(
        label: String,
        valueText: String,
        valueColor: Color,
        subtextView: AnyView
    ) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color.appSecondaryText)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
            Text(valueText)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            subtextView
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var dscrChip: some View {
        let (chipLabel, chipColor): (String, Color) = {
            guard let dscr = vm.dscrNOI else { return ("–", Color.appSecondaryText) }
            if dscr >= 1.25 { return ("Gut", Color.green) }
            else if dscr >= 1.0 { return ("Ok", Color.orange) }
            else { return ("Schlecht", Color.red) }
        }()
        return Text(chipLabel)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(chipColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(chipColor.opacity(0.15))
            .clipShape(Capsule())
    }

    // MARK: - Cover Header

    private var coverHeader: some View {
        Group {
            #if os(iOS)
            let coverPhoto = vm.property.photos.first(where: { $0.isCoverPhoto })
                ?? vm.property.photos.sorted(by: { $0.sortOrder < $1.sortOrder }).first
            if let path = coverPhoto?.filePath, let img = UIImage(contentsOfFile: path) {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 200)
                    .clipped()
            } else {
                coverPlaceholder
            }
            #else
            coverPlaceholder
            #endif
        }
    }

    private var coverPlaceholder: some View {
        LinearGradient(
            colors: [Color.appGradientFrom, Color.appGradientTo],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(height: 200)
        .overlay(
            Image(systemName: propertyTypeIcon)
                .font(.system(size: 48))
                .foregroundStyle(Color.appAccent.opacity(0.6))
        )
    }

    private var propertyTypeIcon: String {
        switch vm.property.propertyType {
        case .apartment:        return "building"
        case .einfamilienhaus:  return "house"
        case .mehrfamilienhaus: return "building.2"
        case .gewerbe:          return "storefront"
        case .grundstuck:       return "map"
        case .sonstiges:        return "questionmark.square"
        }
    }

    // MARK: - Card 1: Aktueller Stand

    private var card1AktuellerStand: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeader(title: "Aktueller Stand")
                    .padding(.horizontal, 16)

                if vm.property.statusHistory.isEmpty {
                    Text("Noch kein Status vorhanden.")
                        .font(.appBody)
                        .foregroundStyle(Color.appSecondaryText)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                } else if let currentEntry = vm.currentStatus {
                    HStack(spacing: 8) {
                        StatusBadge(status: currentEntry.status)
                        Text("seit \(currentEntry.date, format: .dateTime.month().year())")
                            .font(.appCaption)
                            .foregroundStyle(Color.appSecondaryText)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)

                    Divider().padding(.horizontal, 16)

                    VStack(spacing: 0) {
                        cashflowRow(
                            label: "Einnahmen",
                            valueText: Formatters.formatCurrency(vm.grossIncomeMonthly),
                            color: .appPositive
                        )
                        cashflowRow(
                            label: "Kreditrate",
                            valueText: Formatters.formatCurrency(-vm.monthlyMortgage),
                            color: .appNegative
                        )
                        cashflowRow(
                            label: "Laufende Kosten",
                            valueText: Formatters.formatCurrency(-vm.operatingCostsNonRecoverableMonthly),
                            color: .appNegative
                        )

                        Divider().padding(.horizontal, 16)

                        cashflowSumRow(
                            label: "CF vor Steuern",
                            valueText: Formatters.formatCurrency(vm.cashflowAfterDebtMonthly),
                            color: Color.valueColor(vm.cashflowAfterDebtMonthly),
                            fontSize: 15
                        )
                        cashflowRow(
                            label: "Steuereffekt",
                            valueText: Formatters.formatCurrency(vm.taxEffectMonthly),
                            color: .appAccent
                        )

                        Divider().padding(.horizontal, 16)

                        let cfAfterTax = vm.cashflowAfterDebtMonthly + vm.taxEffectMonthly
                        cashflowSumRow(
                            label: "CF nach Steuern",
                            valueText: Formatters.formatCurrency(cfAfterTax),
                            color: Color.valueColor(cfAfterTax),
                            fontSize: 22
                        )
                    }
                    .padding(.bottom, 8)
                }
            }
            .padding(.top, 4)
        }
    }

    @ViewBuilder
    private func cashflowRow(label: String, valueText: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(valueText)
                .font(.appBody)
                .foregroundStyle(color)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func cashflowSumRow(label: String, valueText: String, color: Color, fontSize: CGFloat) -> some View {
        HStack {
            Text(label)
                .font(.system(size: fontSize, weight: .semibold))
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(valueText)
                .font(.system(size: fontSize, weight: .bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: - Card 2: Rendite & Investment

    private var card2RenditeInvestment: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeader(title: "Rendite & Investment")
                    .padding(.horizontal, 16)

                VStack(spacing: 0) {
                    kpiRowWithDot(
                        label: "Bruttorendite",
                        valueText: vm.grossYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        dotColor: benchmarkColor(vm.grossYield, thresholds: (good: 0.05, ok: 0.03), invert: false)
                    )
                    Divider().padding(.leading, 16)
                    kpiRowWithDot(
                        label: "Nettorendite",
                        valueText: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        dotColor: benchmarkColor(vm.netYield, thresholds: (good: 0.04, ok: 0.02), invert: false)
                    )
                    Divider().padding(.leading, 16)
                    kpiRowWithDot(
                        label: "Cash-on-Cash",
                        valueText: vm.cashOnCashReturn.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        dotColor: benchmarkColor(vm.cashOnCashReturn, thresholds: (good: 0.06, ok: 0.03), invert: false)
                    )
                    Divider().padding(.leading, 16)
                    kpiRowWithDot(
                        label: "Kaufpreisfaktor",
                        valueText: vm.mietmultiplikator.map { Formatters.formatMultiplier($0) } ?? "–",
                        dotColor: benchmarkColor(vm.mietmultiplikator, thresholds: (good: 20.0, ok: 25.0), invert: true)
                    )
                    Divider().padding(.leading, 16)
                    kpiRowWithDot(
                        label: "DSCR (NOI)",
                        valueText: vm.dscrNOI.map { String(format: "%.2f", $0) } ?? "–",
                        dotColor: benchmarkColor(vm.dscrNOI, thresholds: (good: 1.25, ok: 1.0), invert: false)
                    )
                    Divider().padding(.leading, 16)
                    kpiRowWithDot(
                        label: "LTV",
                        valueText: vm.ltvRatio.map { Formatters.formatPercentOneDecimal($0) } ?? "–",
                        dotColor: benchmarkColor(vm.ltvRatio, thresholds: (good: 0.70, ok: 0.80), invert: true)
                    )
                }
                .padding(.bottom, 4)

                Divider().padding(.horizontal, 16)

                VStack(spacing: 0) {
                    plainInfoRow(label: "Gesamtinvestment", value: Formatters.formatCurrencyRounded(vm.totalInvestment))
                    Divider().padding(.leading, 16)
                    plainInfoRow(label: "Eigenkapital", value: Formatters.formatCurrencyRounded(vm.equityUsed))
                    Divider().padding(.leading, 16)
                    plainInfoRow(label: "NOI / Jahr", value: Formatters.formatCurrencyRounded(vm.netOperatingIncomeYearly))
                    Divider().padding(.leading, 16)
                    plainInfoRow(label: "Break-Even-Miete", value: Formatters.formatCurrency(vm.breakEvenRentMonthly))
                }
                .padding(.bottom, 4)

                if let marketValue = vm.property.currentMarketValue, marketValue > 0 {
                    Divider().padding(.horizontal, 16)
                    VStack(spacing: 0) {
                        plainInfoRow(label: "Aktueller Marktwert", value: Formatters.formatCurrencyRounded(marketValue))
                        Divider().padding(.leading, 16)
                        let appreciation = marketValue - vm.totalPurchasePrice
                        let appreciationPct = vm.totalPurchasePrice > 0
                            ? appreciation / vm.totalPurchasePrice * 100
                            : 0.0
                        HStack {
                            Text("Wertsteigerung")
                                .font(.appBody)
                                .foregroundStyle(Color.appSecondaryText)
                            Spacer()
                            Text(
                                "\(appreciation >= 0 ? "+" : "")\(Formatters.formatCurrencyRounded(appreciation))"
                                + " (\(appreciationPct >= 0 ? "+" : "")\(String(format: "%.1f", appreciationPct))%)"
                            )
                            .font(.appBody)
                            .foregroundStyle(Color.valueColor(appreciation))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }
                    .padding(.bottom, 4)
                }
            }
            .padding(.top, 4)
        }
    }

    @ViewBuilder
    private func kpiRowWithDot(label: String, valueText: String, dotColor: Color) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(valueText)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Circle()
                .fill(dotColor)
                .frame(width: 8, height: 8)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private func benchmarkColor(_ value: Double?, thresholds: (good: Double, ok: Double), invert: Bool) -> Color {
        guard let v = value else { return Color.appDimText }
        if invert {
            if v <= thresholds.good { return .green }
            else if v <= thresholds.ok { return .orange }
            else { return .red }
        } else {
            if v >= thresholds.good { return .green }
            else if v >= thresholds.ok { return .orange }
            else { return .red }
        }
    }

    @ViewBuilder
    private func plainInfoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: - Card 3: Finanzierung

    private var card3Finanzierung: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeader(title: "Finanzierung")
                    .padding(.horizontal, 16)

                if vm.property.loanAmount == 0 {
                    Text("Keine Finanzierung erfasst.")
                        .font(.appBody)
                        .foregroundStyle(Color.appSecondaryText)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                } else {
                    VStack(spacing: 0) {
                        plainInfoRow(label: "Darlehensbetrag", value: Formatters.formatCurrencyRounded(vm.property.loanAmount))
                        Divider().padding(.leading, 16)
                        plainInfoRow(label: "Restschuld (heute)", value: Formatters.formatCurrencyRounded(vm.remainingDebtNow))
                        Divider().padding(.leading, 16)
                        plainInfoRow(label: "Monatliche Rate", value: Formatters.formatCurrency(vm.monthlyMortgage))
                        Divider().padding(.leading, 16)
                        plainInfoRow(label: "Zinssatz", value: Formatters.formatPercentOneDecimal(vm.property.interestRate))
                        Divider().padding(.leading, 16)
                        plainInfoRow(label: "Tilgungssatz", value: Formatters.formatPercentOneDecimal(vm.property.amortizationRate))
                        Divider().padding(.leading, 16)
                        plainInfoRow(label: "Zinsbindung bis", value: fixedInterestEndText)
                    }
                    .padding(.bottom, 8)
                }
            }
            .padding(.top, 4)
        }
    }

    private var fixedInterestEndText: String {
        let endDate = Calendar.current.date(
            byAdding: .year,
            value: vm.property.fixedInterestPeriodYears,
            to: vm.property.loanStartDate
        ) ?? vm.property.loanStartDate
        let yearsRemaining = max(0, Calendar.current.dateComponents([.year], from: Date(), to: endDate).year ?? 0)
        return "\(Formatters.formatMonthYear(endDate)) (noch \(yearsRemaining) Jahre)"
    }

    // MARK: - Card 4: Objekt

    private var card4Objekt: some View {
        let property = vm.property
        return GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                SectionHeader(title: "Objekt")
                    .padding(.horizontal, 16)

                Text("\(property.address)\n\(property.postalCode) \(property.city)")
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)

                Divider().padding(.horizontal, 16)

                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: 4
                ) {
                    infoGridCell(label: "Typ", value: property.propertyType.displayName)
                    infoGridCell(label: "Baujahr", value: property.yearBuilt.map { String($0) } ?? "–")
                    infoGridCell(label: "Wohnfläche", value: "\(Formatters.formatAreaSqm(property.livingAreaSqm)) m²")
                    infoGridCell(label: "Zimmer", value: property.rooms.map { Formatters.formatRooms($0) } ?? "–")
                    infoGridCell(
                        label: "Kaltmiete/m²",
                        value: property.livingAreaSqm > 0
                            ? "\(Formatters.formatCurrency(property.coldRentMonthly / property.livingAreaSqm))/m²"
                            : "–"
                    )
                    infoGridCell(
                        label: "Kaufpreis/m²",
                        value: property.livingAreaSqm > 0
                            ? "\(Formatters.formatCurrencyRounded(vm.purchasePricePerSqm))/m²"
                            : "–"
                    )
                    infoGridCell(label: "Energieklasse", value: property.energyEfficiencyClass?.rawValue ?? "–")
                    infoGridCell(label: "Zustand", value: property.condition?.rawValue ?? "–")
                    if property.heatingType != nil || property.parkingType != .nichtVorhanden {
                        infoGridCell(label: "Heizung", value: property.heatingType?.rawValue ?? "–")
                        infoGridCell(label: "Stellplatz", value: property.parkingType.rawValue)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)

                if !property.notes.isEmpty {
                    Divider().padding(.horizontal, 16)
                    Text(property.notes)
                        .font(.appBody)
                        .foregroundStyle(Color.appSecondaryText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                }
            }
            .padding(.top, 4)
            .padding(.bottom, 8)
        }
    }

    @ViewBuilder
    private func infoGridCell(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 2)
    }
}
