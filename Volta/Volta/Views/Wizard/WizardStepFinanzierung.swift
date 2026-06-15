import SwiftUI

struct WizardStepFinanzierung: View {
    @Bindable var state: WizardState

    var calculatedMortgage: Double {
        AmortizationCalculator.monthlyMortgageCalc(
            loanAmount: state.loanAmount,
            interestRate: state.interestRate,
            amortizationRate: state.amortizationRate
        )
    }
    var effectiveMortgage: Double {
        AmortizationCalculator.effectiveMonthlyMortgage(
            loanAmount: state.loanAmount,
            interestRate: state.interestRate,
            amortizationRate: state.amortizationRate,
            monthlyMortgageActual: state.monthlyMortgageActual > 0 ? state.monthlyMortgageActual : nil
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Die tatsächliche Rate der Bank weicht manchmal leicht von der berechneten ab (Effektivzins-Rundung). Falls bekannt, trage sie in 'Tatsächliche Rate' ein.")
                .font(.appBody)
                .foregroundStyle(Color.appSecondaryText)

            CurrencyField(label: "Darlehensbetrag *", value: $state.loanAmount, isRequired: true)
            PercentField(label: "Zinssatz *", value: $state.interestRate, isRequired: true)
            PercentField(label: "Tilgungssatz *", value: $state.amortizationRate, isRequired: true)
            labeledRow("Zinsbindung (Jahre)") {
                Stepper("\(state.fixedInterestPeriodYears) Jahre", value: $state.fixedInterestPeriodYears, in: 1...30)
                    .frame(width: 160)
            }
            labeledRow("Darlehensbeginn") {
                DatePicker("", selection: $state.loanStartDate, displayedComponents: .date)
                    .datePickerStyle(.compact).frame(width: 160)
            }
            CurrencyField(label: "Tatsächliche Rate (optional)", value: $state.monthlyMortgageActual)

            Divider()

            if state.loanAmount > 0 && state.interestRate > 0 {
                VStack(spacing: 4) {
                    summaryRow("Berechnete Rate (Zins + Tilgung)", value: calculatedMortgage)
                    summaryRow("Effektive Rate", value: effectiveMortgage, isBold: true)
                    summaryRow("Zinsen/Jahr", value: state.loanAmount * state.interestRate)
                }
                .padding(12)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, value: Double, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(Formatters.formatCurrencyRounded(value))
                .font(isBold ? .appMono.weight(.semibold) : .appMono)
                .foregroundStyle(Color.appPrimaryText)
        }
    }

    @ViewBuilder
    private func labeledRow<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            Text(label).font(.appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            content()
        }
    }
}
