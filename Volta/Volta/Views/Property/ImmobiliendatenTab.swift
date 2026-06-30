import SwiftUI
import SwiftData

struct ImmobiliendatenTab: View {
    @Bindable var property: Property
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var selectedSection = 0
    @State private var showDeleteConfirmation = false

    // Photos bridge state
    @State private var photosData: [Data] = []
    @State private var coverIndex: Int = 0
    @State private var photosLoaded = false

    // Annahmen: market value input mode
    @State private var marketValueMode: MarketValueMode = .gesamt

    private enum MarketValueMode { case perSqm, gesamt }

    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    private let sections = [
        "Stammdaten", "Objektdaten", "Kauf", "Einnahmen",
        "Annahmen", "Kosten", "Finanzierung", "AfA & Steuer", "Gefahrenzone"
    ]

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Divider()
            ScrollView {
                sectionContent
                    .padding(24)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Sidebar

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(sections.enumerated()), id: \.offset) { index, section in
                Button {
                    selectedSection = index
                } label: {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(index == selectedSection ? Color.appAccent : Color.clear)
                            .frame(width: 8, height: 8)
                            .overlay(
                                Circle().stroke(
                                    index == selectedSection ? Color.appAccent : Color.appDimText,
                                    lineWidth: 1.5
                                )
                            )
                        Text(section)
                            .font(.system(size: 13, weight: index == selectedSection ? .bold : .regular))
                            .foregroundStyle(index == selectedSection ? Color.appAccent : Color.appSecondaryText)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        index == selectedSection
                            ? Color.appAccent.opacity(0.08)
                            : Color.clear
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 8)
        .frame(width: 140)
        .background(Color.appSidebarBackground)
    }

    // MARK: - Section content routing

    @ViewBuilder
    private var sectionContent: some View {
        switch selectedSection {
        case 0: stammdatenSection
        case 1: objektdatenSection
        case 2: kaufSection
        case 3: einnahmenSection
        case 4: annahmenSection
        case 5: kostenSection
        case 6: finanzierungSection
        case 7: afaSteuerSection
        case 8: gefahrenzoneSection
        default: EmptyView()
        }
    }

    // MARK: - Binding helpers

    private func doubleStringBinding(_ value: Binding<Double>) -> Binding<String> {
        Binding(
            get: { value.wrappedValue == 0 ? "" : String(value.wrappedValue) },
            set: { value.wrappedValue = Double($0.replacingOccurrences(of: ",", with: ".")) ?? value.wrappedValue }
        )
    }

    private func optDoubleStringBinding(_ value: Binding<Double?>) -> Binding<String> {
        Binding(
            get: {
                guard let v = value.wrappedValue, v != 0 else { return "" }
                return String(v)
            },
            set: { value.wrappedValue = $0.isEmpty ? nil : Double($0.replacingOccurrences(of: ",", with: ".")) }
        )
    }

    private func percentBinding(_ value: Binding<Double>) -> Binding<String> {
        Binding(
            get: { Formatters.formatPercentInput(value.wrappedValue) },
            set: { value.wrappedValue = (Double($0.replacingOccurrences(of: ",", with: ".")) ?? 0) / 100.0 }
        )
    }

    private func intStringBinding(_ value: Binding<Int?>) -> Binding<String> {
        Binding(
            get: { value.wrappedValue.map { String($0) } ?? "" },
            set: { value.wrappedValue = $0.isEmpty ? nil : Int($0) }
        )
    }

    /// Bridge a Double property field to the String bindings expected by HoaFeeSection.
    private func hoaStringBinding(_ value: Binding<Double>) -> Binding<String> {
        Binding(
            get: { value.wrappedValue == 0 ? "" : String(format: "%.2f", value.wrappedValue) },
            set: { value.wrappedValue = Double($0.replacingOccurrences(of: ",", with: ".")) ?? 0 }
        )
    }

    // MARK: - Shared UI helpers

    @ViewBuilder
    private func labeledField(_ label: String, _ binding: Binding<String>, placeholder: String = "") -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField(placeholder.isEmpty ? label : placeholder, text: binding)
                .textFieldStyle(.roundedBorder)
        }
    }

    @ViewBuilder
    private func readonlyRow(_ label: String, value: String, bold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(bold ? .appRowLabel.weight(.bold) : .appRowLabel)
                .foregroundStyle(bold ? Color.appPrimaryText : Color.appSecondaryText)
            Spacer()
            Text(value)
                .font(bold ? .appMono.weight(.bold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }

    @ViewBuilder
    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.appSectionLabel)
            .foregroundStyle(Color.appSectionLabel)
    }

    // MARK: - Stammdaten

    private var stammdatenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Stammdaten")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            labeledField("Name *", $property.name, placeholder: "z.B. ETW Dresden Neustadt")
            labeledField("Adresse *", $property.address, placeholder: "Straße und Hausnummer")
            labeledField("Stadt *", $property.city, placeholder: "Stadt")
            labeledField("PLZ", $property.postalCode, placeholder: "Postleitzahl")
            labeledField("Bundesland", $property.state, placeholder: "Bundesland")

            VStack(alignment: .leading, spacing: 4) {
                Text("Typ").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Typ", selection: $property.propertyType) {
                    ForEach(PropertyType.allCases, id: \.self) { type in
                        Text(type.displayName).tag(type)
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Erwerb").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Erwerb", selection: $property.acquisitionType) {
                    ForEach(AcquisitionType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Baujahr").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 1985", text: intStringBinding($property.yearBuilt))
                    .numberKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Notizen").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextEditor(text: $property.notes)
                    .frame(minHeight: 80)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.appDimText, lineWidth: 1)
                    )
            }
        }
    }

    // MARK: - Objektdaten

    private var objektdatenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Objektdaten")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            VStack(alignment: .leading, spacing: 4) {
                Text("Wohnfläche (m²) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 68", text: doubleStringBinding($property.livingAreaSqm))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Nutzfläche (m²)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("optional", text: optDoubleStringBinding($property.usableAreaSqm))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Zimmer").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 3", text: optDoubleStringBinding($property.rooms))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            sectionLabel("Ausstattung")
            Toggle("Balkon", isOn: $property.hasBalcony)
            Toggle("Terrasse", isOn: $property.hasTerrace)
            Toggle("Garten", isOn: $property.hasGarden)
            Toggle("Keller", isOn: $property.hasBasement)
            Toggle("Einbauküche", isOn: $property.hasFittedKitchen)

            VStack(alignment: .leading, spacing: 4) {
                Text("Stellplatz").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Stellplatz", selection: $property.parkingType) {
                    ForEach(ParkingType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Heizung").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Heizung", selection: $property.heatingType) {
                    Text("Keine Angabe").tag(Optional<HeatingType>.none)
                    ForEach(HeatingType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(Optional(type))
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Energieklasse").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Energieklasse", selection: $property.energyEfficiencyClass) {
                    Text("Keine Angabe").tag(Optional<EnergyClass>.none)
                    ForEach(EnergyClass.allCases, id: \.self) { ec in
                        Text(ec.rawValue).tag(Optional(ec))
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Zustand").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("Zustand", selection: $property.condition) {
                    Text("Keine Angabe").tag(Optional<PropertyCondition>.none)
                    ForEach(PropertyCondition.allCases, id: \.self) { cond in
                        Text(cond.rawValue).tag(Optional(cond))
                    }
                }
                .pickerStyle(.menu)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Letzte Renovierung (Jahr)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("optional", text: intStringBinding($property.lastRenovationYear))
                    .numberKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            sectionLabel("Fotos")

            PhotoGrid(photosData: $photosData, coverIndex: $coverIndex)
                .onChange(of: photosData) { _, newData in
                    savePhotos(newData)
                }
                .onChange(of: coverIndex) { _, newIndex in
                    savePhotos(photosData, newCoverIndex: newIndex)
                }
        }
        .onAppear {
            if !photosLoaded {
                loadPhotos()
                photosLoaded = true
            }
        }
    }

    // MARK: - Kauf

    private var kaufSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Kauf & Nebenkosten")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            DatePicker("Kaufdatum", selection: $property.purchaseDate, displayedComponents: .date)
            DatePicker("Wirtschaftlicher Übergang *", selection: $property.economicTransferDate, displayedComponents: .date)

            sectionLabel("KAUFPREIS")

            if property.parkingType != .nichtVorhanden {
                CurrencyField(label: "Kaufpreis Wohnung *", value: $property.purchasePriceUnit, isRequired: true)
                CurrencyField(label: "Kaufpreis Stellplatz *", value: $property.purchasePriceParking, isRequired: true)
                readonlyRow("Gesamtkaufpreis", value: Formatters.formatCurrencyRounded(vm.totalPurchasePrice))
            } else {
                CurrencyField(label: "Kaufpreis *", value: $property.purchasePriceUnit, isRequired: true)
            }

            sectionLabel("KAUFNEBENKOSTEN")

            CurrencyField(label: "Grunderwerbsteuer", value: $property.landTransferTax)
            CurrencyField(label: "Notarkosten", value: $property.notaryCosts)
            CurrencyField(label: "Grundbuchkosten", value: $property.landRegistryCosts)
            CurrencyField(label: "Maklerprovision", value: $property.agentFee)
            CurrencyField(label: "Gutachterkosten", value: $property.appraisalCosts)
            CurrencyField(label: "Renovierung gesamt", value: $property.renovationModernizationCosts)
            CurrencyField(label: "davon aktivierungspflichtig", value: $property.renovationAfaEligible)

            sectionLabel("ZUSAMMENFASSUNG")

            readonlyRow("Kaufpreis", value: Formatters.formatCurrencyRounded(vm.totalPurchasePrice))
            readonlyRow("+ Kaufnebenkosten", value: Formatters.formatCurrencyRounded(vm.closingCostsTotal))
            readonlyRow("+ Renovierung", value: Formatters.formatCurrencyRounded(property.renovationModernizationCosts))
            Divider()
            readonlyRow("= Gesamtinvestment", value: Formatters.formatCurrencyRounded(vm.totalInvestment), bold: true)
        }
    }

    // MARK: - Einnahmen

    private var einnahmenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Einnahmen")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            CurrencyField(label: "Nettomiete/Monat *", value: $property.coldRentMonthly, isRequired: true)

            CurrencyField(
                label: "Bruttomiete/Monat (optional)",
                value: Binding(
                    get: { property.warmmieteMonthly ?? 0 },
                    set: { property.warmmieteMonthly = $0 == 0 ? nil : $0 }
                )
            )

            if property.parkingType != .nichtVorhanden {
                CurrencyField(label: "Parkingmiete/Monat", value: $property.parkingRentMonthly)
            }

            CurrencyField(label: "Sonstige Einnahmen/Monat", value: $property.otherIncomeMonthly)

            sectionLabel("ZUSAMMENFASSUNG")

            readonlyRow("Nettomiete / Jahr", value: Formatters.formatCurrencyRounded(property.coldRentMonthly * 12))

            if let warmmiete = property.warmmieteMonthly, warmmiete > 0 {
                readonlyRow("Bruttomiete / Jahr", value: Formatters.formatCurrencyRounded(warmmiete * 12))
            }

            if let rendite = vm.grossYield {
                HStack {
                    Text("Bruttorendite")
                        .font(.appRowLabel)
                        .foregroundStyle(Color.appSecondaryText)
                    Spacer()
                    Text(Formatters.formatPercentOneDecimal(rendite))
                        .font(.appMono.weight(.semibold))
                        .foregroundStyle(rendite >= 0.04 ? Color.appPositive : Color.appNegative)
                }
            }
        }
    }

    // MARK: - Annahmen

    private var annahmenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Annahmen")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            VStack(alignment: .leading, spacing: 4) {
                Text("Leerstandsquote (%)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 3", text: percentBinding($property.vacancyRateAssumption))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            CurrencyField(
                label: "Marktmiete/m² (optional)",
                value: Binding(
                    get: { property.marketRentPerSqm ?? 0 },
                    set: { property.marketRentPerSqm = $0 == 0 ? nil : $0 }
                )
            )

            if let marketRent = property.marketRentPerSqm, marketRent > 0, property.livingAreaSqm > 0 {
                let myRentPerSqm = property.coldRentMonthly / property.livingAreaSqm
                let diff = myRentPerSqm - marketRent
                let diffPct = diff / marketRent
                let aboveBelow = diff >= 0 ? "über" : "unter"
                Text("Deine Miete liegt \(Formatters.formatPercentOneDecimal(abs(diffPct))) \(aboveBelow) Markt")
                    .font(.appSubtext)
                    .foregroundStyle(diff >= 0 ? Color.appPositive : Color.appNegative)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Aktueller Marktwert").font(.appCaption).foregroundStyle(Color.appSecondaryText)

                Picker("Eingabe", selection: $marketValueMode) {
                    Text("/m²").tag(MarketValueMode.perSqm)
                    Text("Gesamt").tag(MarketValueMode.gesamt)
                }
                .pickerStyle(.segmented)

                if marketValueMode == .perSqm {
                    CurrencyField(
                        label: "Marktwert/m²",
                        value: Binding(
                            get: {
                                guard let mv = property.currentMarketValue, property.livingAreaSqm > 0
                                else { return 0 }
                                return mv / property.livingAreaSqm
                            },
                            set: { property.currentMarketValue = $0 == 0 ? nil : $0 * property.livingAreaSqm }
                        )
                    )
                } else {
                    CurrencyField(
                        label: "Gesamtmarktwert",
                        value: Binding(
                            get: { property.currentMarketValue ?? 0 },
                            set: { property.currentMarketValue = $0 == 0 ? nil : $0 }
                        )
                    )
                }

                if let mv = property.currentMarketValue, mv > 0 {
                    let appreciation = mv - vm.totalPurchasePrice
                    let appreciationPct = vm.totalPurchasePrice > 0 ? appreciation / vm.totalPurchasePrice : 0
                    let sign = appreciation >= 0 ? "+" : ""
                    Text("Wertsteigerung: \(sign)\(Formatters.formatCurrencyRounded(appreciation)) (\(sign)\(Formatters.formatPercentOneDecimal(appreciationPct))) seit Kauf")
                        .font(.appSubtext)
                        .foregroundStyle(appreciation >= 0 ? Color.appPositive : Color.appNegative)
                }
            }
        }
    }

    // MARK: - Kosten

    private var kostenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Kosten")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            HoaFeeSection(
                title: "HAUSGELD WOHNUNG",
                total: hoaStringBinding($property.hoaFeeTotalMonthly),
                isSplit: $property.isHoaUnitSplit,
                recoverable: hoaStringBinding($property.hoaFeeRecoverableMonthly),
                maintenanceReserve: hoaStringBinding($property.hoaFeeMaintenanceReserveMonthly)
            )

            CurrencyField(label: "Grundsteuer Wohnung/Jahr *", value: $property.propertyTaxAnnual, isRequired: true)
            CurrencyField(label: "Verwaltung/Jahr", value: $property.propertyManagementAnnual)
            CurrencyField(label: "Gebäudeversicherung/Jahr (sep.)", value: $property.propertyInsuranceAnnual)
            CurrencyField(label: "Sonstige Kosten/Monat", value: $property.otherCostsMonthly)

            if property.parkingType != .nichtVorhanden {
                Divider()

                HoaFeeSection(
                    title: "HAUSGELD STELLPLATZ",
                    total: hoaStringBinding($property.hoaFeeParkingTotalMonthly),
                    isSplit: $property.isHoaParkingSplit,
                    recoverable: hoaStringBinding($property.hoaFeeParkingRecoverableMonthly),
                    maintenanceReserve: hoaStringBinding($property.hoaFeeParkingMaintenanceReserveMonthly),
                    infoText: "Hausgeld aufteilen, wenn der Mietvertrag eine Nebenkostenvereinbarung für den Stellplatz enthält."
                )

                CurrencyField(label: "Grundsteuer Stellplatz/Jahr", value: $property.propertyTaxParkingAnnual)
            }

            Divider()

            readonlyRow(
                "Nicht umlagefähige Kosten Wohnung/Monat",
                value: Formatters.formatCurrencyRounded(vm.operatingCostsNonRecoverableMonthly),
                bold: true
            )
        }
    }

    // MARK: - Finanzierung

    private var finanzierungSection: some View {
        let loanAmount = property.loanAmount
        let ir = property.interestRate
        let ar = property.amortizationRate
        let computedMonthlyRate = loanAmount > 0 && (ir + ar) > 0
            ? loanAmount * (ir + ar) / 12.0
            : 0.0
        let interestPerMonth = loanAmount > 0 && ir > 0 ? loanAmount * ir / 12.0 : 0.0
        let effectiveMonthly = property.monthlyMortgage > 0 ? property.monthlyMortgage : computedMonthlyRate
        let amortizationPerMonth = max(0, effectiveMonthly - interestPerMonth)

        return VStack(alignment: .leading, spacing: 16) {
            Text("Finanzierung")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            CurrencyField(label: "Darlehensbetrag *", value: $property.loanAmount, isRequired: true)

            VStack(alignment: .leading, spacing: 4) {
                Text("Zinssatz (%) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 3.5", text: percentBinding($property.interestRate))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Tilgungssatz (%) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 2.0", text: percentBinding($property.amortizationRate))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Zinsbindung (Jahre)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Stepper("\(property.fixedInterestPeriodYears) Jahre", value: $property.fixedInterestPeriodYears, in: 1...30)
            }

            DatePicker("Darlehensbeginn", selection: $property.loanStartDate, displayedComponents: .date)

            CurrencyField(label: "Monatsrate (€)", value: $property.monthlyMortgage)

            sectionLabel("EIGENKAPITAL")

            CurrencyField(label: "Eigenkapital eingebracht *", value: $property.equityContributed, isRequired: true)

            VStack(alignment: .leading, spacing: 4) {
                CurrencyField(label: "Eigenprovisions-Vereinbarung", value: $property.brokerCommissionAgreement)
                Text("ⓘ Maklerkosten aus separater Vereinbarung — Anschaffungsnebenkosten, erhöht AfA-Basis")
                    .font(.appSubtext).foregroundStyle(Color.appSecondaryText)
            }

            sectionLabel("ZUSAMMENFASSUNG")

            readonlyRow("Berechnete Monatsrate", value: Formatters.formatCurrencyRounded(computedMonthlyRate))
            readonlyRow("Zinsen/Monat", value: Formatters.formatCurrencyRounded(interestPerMonth))
            readonlyRow("Tilgung/Monat", value: Formatters.formatCurrencyRounded(amortizationPerMonth))
            readonlyRow("Eigenkapital (genutzt)", value: Formatters.formatCurrencyRounded(vm.equityUsed))

            if let ltv = vm.ltvRatio {
                HStack {
                    Text("Anfangs-LTV")
                        .font(.appRowLabel).foregroundStyle(Color.appSecondaryText)
                    Spacer()
                    Text(Formatters.formatPercentOneDecimal(ltv))
                        .font(.appMono)
                        .foregroundStyle(ltv > 0.8 ? Color.appNegative : Color.appPositive)
                }
            }
        }
    }

    // MARK: - AfA & Steuer

    private var afaSteuerSection: some View {
        let showWarning = vm.totalPurchasePrice > 0
            && abs((property.buildingValue + property.landValue) - vm.totalPurchasePrice) > vm.totalPurchasePrice * 0.05

        return VStack(alignment: .leading, spacing: 16) {
            Text("AfA & Steuer")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            CurrencyField(label: "Gebäudewert * (aus Regierungs-Excel)", value: $property.buildingValue, isRequired: true)
            CurrencyField(label: "Grundstückswert * (aus Regierungs-Excel)", value: $property.landValue, isRequired: true)

            if showWarning {
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Color.appWarning)
                    Text("Werte aus dem Regierungs-Excel prüfen — Summe weicht >5% vom Kaufpreis ab.")
                        .font(.appSubtext)
                        .foregroundStyle(Color.appWarning)
                }
                .padding(10)
                .background(Color.appWarning.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("AfA-Satz (%) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 2", text: percentBinding($property.depreciationRate))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Grenzsteuersatz (%) *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z.B. 42", text: percentBinding($property.marginalTaxRate))
                    .decimalKeyboard()
                    .textFieldStyle(.roundedBorder)
            }

            sectionLabel("ZUSAMMENFASSUNG")

            readonlyRow("AfA-Bemessungsgrundlage", value: Formatters.formatCurrencyRounded(vm.afaBasis))
            Text("= Gebäudewert + (Nebenkosten × Gebäudewert / Kaufpreis) + aktiv. Renovierung")
                .font(.appSubtext)
                .foregroundStyle(Color.appSecondaryText)

            readonlyRow("AfA / Jahr", value: Formatters.formatCurrencyRounded(vm.depreciationYearly))
            readonlyRow("AfA / Monat", value: Formatters.formatCurrencyRounded(vm.depreciationMonthly))
        }
    }

    // MARK: - Gefahrenzone

    private var gefahrenzoneSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gefahrenzone")
                .font(.appTabTitle)
                .foregroundStyle(Color.appPrimaryText)

            Text("Aktionen in diesem Bereich können nicht rückgängig gemacht werden.")
                .font(.appSubtext)
                .foregroundStyle(Color.appSecondaryText)

            Button("Immobilie löschen") {
                showDeleteConfirmation = true
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
        .confirmationDialog("Immobilie löschen?", isPresented: $showDeleteConfirmation) {
            Button("Löschen", role: .destructive) {
                modelContext.delete(property)
                dismiss()
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Diese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.")
        }
    }

    // MARK: - Photo persistence helpers

    private func loadPhotos() {
        let sorted = property.photos.sorted { $0.sortOrder < $1.sortOrder }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        photosData = sorted.compactMap { photo in
            let url = docs.appendingPathComponent(photo.filePath)
            return try? Data(contentsOf: url)
        }
        coverIndex = sorted.firstIndex(where: { $0.isCoverPhoto }) ?? 0
    }

    private func savePhotos(_ data: [Data], newCoverIndex: Int? = nil) {
        let effectiveCoverIndex = newCoverIndex ?? coverIndex
        for photo in property.photos {
            modelContext.delete(photo)
        }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        for (i, imgData) in data.enumerated() {
            let filename = "\(UUID().uuidString).jpg"
            let url = docs.appendingPathComponent(filename)
            try? imgData.write(to: url)
            let photo = PropertyPhoto(
                filePath: filename,
                isCoverPhoto: i == effectiveCoverIndex,
                sortOrder: i
            )
            photo.property = property
            modelContext.insert(photo)
        }
    }
}
