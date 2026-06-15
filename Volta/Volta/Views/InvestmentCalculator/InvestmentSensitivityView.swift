import SwiftUI

struct InvestmentSensitivityView: View {
    @Bindable var vm: InvestmentCalculatorViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Sensitivitätsanalyse")
                Spacer()
                Button("Zurücksetzen") { vm.resetSensitivity() }
                    .font(.appCaption)
                    .foregroundStyle(Color.appAccent)
                    .buttonStyle(.plain)
            }

            sensitivitySlider(
                label: "Kaltmiete",
                delta: $vm.sensitivityRentDelta,
                range: vm.rentSliderRange,
                step: 10,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta)) € → \(Formatters.formatCurrencyRounded(vm.effectiveColdRentMonthly))"
                }
            )
            sensitivitySlider(
                label: "Zinssatz",
                delta: $vm.sensitivityRateDelta,
                range: vm.rateSliderRange,
                step: 0.001,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Formatters.formatPercentOneDecimal(delta)) → \(Formatters.formatPercentOneDecimal(vm.effectiveInterestRate))"
                }
            )
            sensitivitySlider(
                label: "Kaufpreis",
                delta: $vm.sensitivityPriceDelta,
                range: vm.priceSliderRange,
                step: 1_000,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta / 1000))k € → \(Formatters.formatCurrencyRounded(vm.effectivePurchasePriceUnit))"
                }
            )
            sensitivitySlider(
                label: "Leerstand",
                delta: $vm.sensitivityVacancyDelta,
                range: vm.vacancySliderRange,
                step: 0.01,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Formatters.formatPercentOneDecimal(delta)) → \(Formatters.formatPercentOneDecimal(vm.effectiveVacancyRate))"
                }
            )
            sensitivitySlider(
                label: "Instandhaltung",
                delta: $vm.sensitivityMaintenanceDelta,
                range: vm.maintenanceSliderRange,
                step: 5,
                format: { delta in
                    let sign = delta >= 0 ? "+" : ""
                    return "\(sign)\(Int(delta)) €/Mon → \(Formatters.formatCurrencyRounded(vm.effectiveNonRecoverableMonthly))/Mon"
                }
            )
        }
        .padding(12)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func sensitivitySlider(
        label: String,
        delta: Binding<Double>,
        range: ClosedRange<Double>,
        step: Double,
        format: (Double) -> String
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)
                    .frame(width: 120, alignment: .leading)
                Slider(value: delta, in: range, step: step)
                Text(format(delta.wrappedValue))
                    .font(.appMonoSmall)
                    .foregroundStyle(Color.appSecondaryText)
                    .frame(width: 180, alignment: .trailing)
            }
        }
    }
}
