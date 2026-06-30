import SwiftUI

struct SetupStepFinanzierung: View {
    @Bindable var state: PropertySetupState

    private var loanAmount: Double { Double(state.loanAmount) ?? 0 }
    private var irPct: Double { Double(state.interestRate) ?? 0 }      // entered as % e.g. 3.5
    private var arPct: Double { Double(state.amortizationRate) ?? 0 }  // entered as % e.g. 2.0
    private var ir: Double { irPct / 100.0 }
    private var ar: Double { arPct / 100.0 }

    private var computedMonthlyRate: Double {
        guard loanAmount > 0, ir + ar > 0 else { return 0 }
        return loanAmount * (ir + ar) / 12.0
    }

    private var interestPerMonth: Double {
        guard loanAmount > 0, ir > 0 else { return 0 }
        return loanAmount * ir / 12.0
    }

    private var amortizationPerMonth: Double {
        let monthly = Double(state.monthlyMortgage) ?? computedMonthlyRate
        return monthly - interestPerMonth
    }

    private var purchaseUnit: Double { Double(state.purchasePriceUnit) ?? 0 }
    private var purchaseParking: Double { Double(state.purchasePriceParking) ?? 0 }
    private var closingCosts: Double {
        let a = Double(state.landTransferTax) ?? 0
        let b = Double(state.notaryCosts) ?? 0
        let c = Double(state.landRegistryCosts) ?? 0
        let d = Double(state.agentFee) ?? 0
        let e = Double(state.appraisalCosts) ?? 0
        return a + b + c + d + e
    }
    private var totalInvestment: Double {
        purchaseUnit + purchaseParking + closingCosts + (Double(state.renovationTotal) ?? 0)
    }
    private var equityUsed: Double { max(0, totalInvestment - loanAmount) }
    private var ltv: Double? {
        guard totalInvestment > 0 else { return nil }
        return loanAmount / totalInvestment
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Finanzierung")
                    .font(.appTabTitle)
                    .foregroundStyle(Color.appPrimaryText)

                currencyField("Darlehensbetrag *", text: $state.loanAmount)
                percentField("Zinssatz (%) *", text: $state.interestRate, placeholder: "z.B. 3.5")
                percentField("Tilgungssatz (%) *", text: $state.amortizationRate, placeholder: "z.B. 2.0")

                VStack(alignment: .leading, spacing: 4) {
                    Text("Zinsbindung (Jahre)")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    Stepper("\(state.fixedInterestPeriodYears) Jahre", value: $state.fixedInterestPeriodYears, in: 1...30)
                }

                DatePicker("Darlehensbeginn", selection: $state.loanStartDate, displayedComponents: .date)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Monatsrate (€)")
                        .font(.appCaption).foregroundStyle(Color.appSecondaryText)
                    TextField(Formatters.formatCurrencyRounded(computedMonthlyRate), text: $state.monthlyMortgage)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                    Text("Leer lassen für automatische Berechnung")
                        .font(.appSubtext).foregroundStyle(Color.appDimText)
                }

                // Eigenkapital
                Text("EIGENKAPITAL")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                currencyField("Eigenkapital eingebracht *", text: $state.equityContributed)

                VStack(alignment: .leading, spacing: 4) {
                    currencyField("Eigenprovisions-Vereinbarung", text: $state.brokerCommissionAgreement)
                    Text("ⓘ Maklerkosten aus separater Vereinbarung — Anschaffungsnebenkosten, erhöht AfA-Basis")
                        .font(.appSubtext).foregroundStyle(Color.appSecondaryText)
                }

                // Zusammenfassung
                Text("ZUSAMMENFASSUNG")
                    .font(.appSectionLabel).foregroundStyle(Color.appSectionLabel)

                let monthly = Double(state.monthlyMortgage) ?? computedMonthlyRate
                readonlyRow("Berechnete Monatsrate", value: Formatters.formatCurrencyRounded(computedMonthlyRate))
                readonlyRow("Zinsen/Monat", value: Formatters.formatCurrencyRounded(interestPerMonth))
                readonlyRow("Tilgung/Monat", value: Formatters.formatCurrencyRounded(max(0, monthly - interestPerMonth)))
                readonlyRow("Eigenkapital (genutzt)", value: Formatters.formatCurrencyRounded(equityUsed))
                if let ltv = ltv {
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
            .padding(20)
        }
    }

    @ViewBuilder
    private func currencyField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
        }
    }

    @ViewBuilder
    private func percentField(_ label: String, text: Binding<String>, placeholder: String = "0") -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            TextField(placeholder, text: text)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
        }
    }

    @ViewBuilder
    private func readonlyRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label).font(.appRowLabel).foregroundStyle(Color.appSecondaryText)
            Spacer()
            Text(value).font(.appMono).foregroundStyle(Color.appPrimaryText)
        }
    }
}
