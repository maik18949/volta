import SwiftUI

struct InvestmentInputSections: View {
    @Bindable var calculation: InvestmentCalculation

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            nameSection
            kaufSection
            einnahmenSection
            finanzierungSection
            kostenSection
            afaSection
        }
    }

    private var nameSection: some View {
        inputSection(title: "Objekt") {
            HStack {
                Text("Name").font(.appBody).foregroundStyle(Color.appPrimaryText)
                Spacer()
                TextField("ETW Dresden Neustadt", text: $calculation.name)
                    .font(.appMono)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 250)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var kaufSection: some View {
        inputSection(title: "Kauf — Stufe 1") {
            CurrencyField(label: "Kaufpreis Wohnung *", value: $calculation.purchasePriceUnit)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Kaufpreis Stellplatz", value: $calculation.purchasePriceParking)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Grunderwerbsteuer", value: $calculation.landTransferTax)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Notarkosten", value: $calculation.notaryCosts)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Grundbuchkosten", value: $calculation.landRegistryCosts)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Maklerprovision", value: $calculation.agentFee)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var einnahmenSection: some View {
        inputSection(title: "Einnahmen — Stufe 1") {
            CurrencyField(label: "Kaltmiete/Monat *", value: $calculation.coldRentMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Parkingmiete/Monat", value: $calculation.parkingRentMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Leerstandsquote", value: $calculation.vacancyRateAssumption)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var finanzierungSection: some View {
        inputSection(title: "Finanzierung — Stufe 2") {
            CurrencyField(label: "Darlehensbetrag", value: $calculation.loanAmount)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Zinssatz", value: $calculation.interestRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Tilgungssatz", value: $calculation.amortizationRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var kostenSection: some View {
        inputSection(title: "Kosten — Stufe 3") {
            CurrencyField(label: "Nicht umlagefähiges Hausgeld/Monat", value: $calculation.hoaFeeNonRecoverableMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Hausverwaltung/Jahr", value: $calculation.propertyManagementAnnual)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            CurrencyField(label: "Instandhaltungsrücklage/Monat", value: $calculation.maintenanceReserveMonthly)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    private var afaSection: some View {
        inputSection(title: "AfA & Steuer — Stufe 4") {
            CurrencyField(label: "Gebäudewert", value: $calculation.buildingValue)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "AfA-Satz", value: $calculation.depreciationRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
            Divider().padding(.leading, 12)
            PercentField(label: "Grenzsteuersatz", value: $calculation.marginalTaxRate)
                .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }

    @ViewBuilder
    private func inputSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .padding(.bottom, 4)
            VStack(spacing: 0) {
                content()
            }
            .background(Color.appCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
