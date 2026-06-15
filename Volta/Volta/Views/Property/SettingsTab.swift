import SwiftUI
import SwiftData

struct SettingsTab: View {
    @Bindable var property: Property
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    private var landPlusBuildingDeviation: Double? {
        let sum = property.landValue + property.buildingValue
        let price = property.purchasePriceUnit + property.purchasePriceParking
        guard price > 0 else { return nil }
        return abs(sum - price) / price
    }

    private var showLandBuildingWarning: Bool {
        (landPlusBuildingDeviation ?? 0) > 0.05
    }

    private var showHighLTVWarning: Bool {
        property.loanAmount > (property.purchasePriceUnit + property.purchasePriceParking)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                stammdatenSection
                kaufSection
                einnahmenSection
                kostenSection
                finanzierungSection
                afaSection
                warningsSection
                deleteSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
        .onChange(of: property.name) { _, _ in property.updatedAt = Date() }
    }

    private var stammdatenSection: some View {
        formSection(title: "Stammdaten") {
            labeledField("Name *") {
                TextField("ETW Dresden Neustadt", text: $property.name)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            labeledField("Adresse *") {
                TextField("Musterstraße 1", text: $property.address)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            labeledField("Stadt *") {
                TextField("Dresden", text: $property.city)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 200)
            }
            labeledField("PLZ *") {
                TextField("01097", text: $property.postalCode)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 80)
            }
            labeledField("Bundesland") {
                TextField("Sachsen", text: $property.state)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 200)
            }
            labeledField("Typ") {
                Picker("", selection: $property.propertyType) {
                    ForEach(PropertyType.allCases, id: \.self) { t in Text(t.displayName).tag(t) }
                }.frame(width: 200)
            }
        }
    }

    private var kaufSection: some View {
        formSection(title: "Kauf & Nebenkosten") {
            CurrencyField(label: "Kaufpreis Wohnung *", value: $property.purchasePriceUnit, isRequired: true)
            CurrencyField(label: "Kaufpreis Stellplatz", value: $property.purchasePriceParking)
            CurrencyField(label: "Grunderwerbsteuer", value: $property.landTransferTax)
            CurrencyField(label: "Notarkosten", value: $property.notaryCosts)
            CurrencyField(label: "Grundbuchkosten", value: $property.landRegistryCosts)
            CurrencyField(label: "Maklerprovision", value: $property.agentFee)
            CurrencyField(label: "Gutachterkosten", value: $property.appraisalCosts)
            CurrencyField(label: "Renovierung gesamt", value: $property.renovationModernizationCosts)
            CurrencyField(label: "davon aktivierungspflichtig", value: $property.renovationAfaEligible)
            labeledField("Wirtschaftlicher Übergang *") {
                DatePicker("", selection: $property.economicTransferDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }
        }
    }

    private var einnahmenSection: some View {
        formSection(title: "Einnahmen (Prognose)") {
            CurrencyField(label: "Kaltmiete/Monat *", value: $property.coldRentMonthly, isRequired: true)
            CurrencyField(label: "Parkingmiete/Monat", value: $property.parkingRentMonthly)
            CurrencyField(label: "Sonstige Einnahmen/Monat", value: $property.otherIncomeMonthly)
            PercentField(label: "Leerstandsquote (Annahme)", value: $property.vacancyRateAssumption)
        }
    }

    private var kostenSection: some View {
        formSection(title: "Laufende Kosten") {
            CurrencyField(label: "Hausgeld gesamt/Monat *", value: $property.hoaFeeTotalMonthly, isRequired: true)
            CurrencyField(label: "davon umlagefähig/Monat *", value: $property.hoaFeeRecoverableMonthly, isRequired: true)
            CurrencyField(label: "Grundsteuer/Jahr *", value: $property.propertyTaxAnnual, isRequired: true)
            CurrencyField(label: "Hausverwaltung/Jahr", value: $property.propertyManagementAnnual)
            CurrencyField(label: "Instandhaltungsrücklage/Monat", value: $property.maintenanceReserveMonthly)
            CurrencyField(label: "Gebäudeversicherung/Jahr", value: $property.propertyInsuranceAnnual)
            CurrencyField(label: "Sonstige Kosten/Monat", value: $property.otherCostsMonthly)
        }
    }

    private var finanzierungSection: some View {
        formSection(title: "Finanzierung") {
            CurrencyField(label: "Darlehensbetrag *", value: $property.loanAmount, isRequired: true)
            PercentField(label: "Zinssatz *", value: $property.interestRate, isRequired: true)
            PercentField(label: "Tilgungssatz *", value: $property.amortizationRate, isRequired: true)
            labeledField("Zinsbindung (Jahre) *") {
                Stepper("\(property.fixedInterestPeriodYears) Jahre",
                        value: $property.fixedInterestPeriodYears, in: 1...30)
                    .frame(width: 160)
            }
            labeledField("Darlehensbeginn *") {
                DatePicker("", selection: $property.loanStartDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }
            CurrencyField(label: "Tatsächliche Rate (optional)", value: Binding(
                get: { property.monthlyMortgageActual ?? 0 },
                set: { property.monthlyMortgageActual = $0 > 0 ? $0 : nil }
            ))
        }
    }

    private var afaSection: some View {
        formSection(title: "AfA & Steuer") {
            CurrencyField(label: "Gebäudewert (Excel) *", value: $property.buildingValue, isRequired: true)
            CurrencyField(label: "Grundstückswert (Excel) *", value: $property.landValue, isRequired: true)
            PercentField(label: "AfA-Satz *", value: $property.depreciationRate, isRequired: true)
            PercentField(label: "Grenzsteuersatz *", value: $property.marginalTaxRate, isRequired: true)
        }
    }

    @ViewBuilder
    private var warningsSection: some View {
        if showLandBuildingWarning || showHighLTVWarning {
            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Hinweise")
                if showLandBuildingWarning {
                    warningRow("Gebäudewert + Grundstückswert weicht um \(Formatters.formatPercentOneDecimal(landPlusBuildingDeviation ?? 0)) vom Kaufpreis ab (Toleranz: 5%). Werte aus dem Regierungs-Excel prüfen.")
                }
                if showHighLTVWarning {
                    warningRow("Darlehensbetrag übersteigt den Kaufpreis (Vollfinanzierung inkl. Nebenkosten). Bitte prüfen.")
                }
            }
        }
    }

    @ViewBuilder
    private func warningRow(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(Color(hex: "#D97706"))
            Text(message)
                .font(.appCaption)
                .foregroundStyle(Color(hex: "#D97706"))
        }
        .padding(10)
        .background(Color(hex: "#D97706").opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var deleteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Gefahr")
            Button(role: .destructive) {
                modelContext.delete(property)
                dismiss()
            } label: {
                Label("Immobilie löschen", systemImage: "trash")
                    .foregroundStyle(Color.appNegative)
            }
            .buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    private func formSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: title).padding(.bottom, 8)
            VStack(spacing: 0) {
                content()
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            content()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }
}
