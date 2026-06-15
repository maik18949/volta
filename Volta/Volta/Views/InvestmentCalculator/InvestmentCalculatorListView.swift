import SwiftUI
import SwiftData

struct InvestmentCalculatorListView: View {
    @Query(sort: \InvestmentCalculation.createdAt, order: .reverse) private var calculations: [InvestmentCalculation]
    @Environment(\.modelContext) private var modelContext
    @State private var selectedCalc: InvestmentCalculation?

    var body: some View {
        NavigationSplitView {
            List(calculations, selection: $selectedCalc) { calc in
                calcRow(calc)
                    .tag(calc)
            }
            .navigationTitle("Investment-Rechner")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: addCalculation) {
                        Label("Neu", systemImage: "plus")
                    }
                }
            }
        } detail: {
            if let calc = selectedCalc {
                InvestmentCalculatorDetailView(calculation: calc)
            } else {
                Text("Kaufkandidaten analysieren und bei Kauf direkt übernehmen.")
                    .foregroundStyle(Color.appSecondaryText)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.appContentBackground)
            }
        }
    }

    @ViewBuilder
    private func calcRow(_ calc: InvestmentCalculation) -> some View {
        let vm = InvestmentCalculatorViewModel(calculation: calc)
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(calc.name.isEmpty ? "Unbenannt" : calc.name)
                    .font(.appBody.weight(.medium))
                    .foregroundStyle(Color.appPrimaryText)
                Spacer()
                if calc.isPromoted {
                    Text("✓ übernommen")
                        .font(.appCaption)
                        .foregroundStyle(Color.appPositive)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.appPositive.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            if calc.purchasePriceUnit > 0 {
                Text("\(calc.purchasePriceUnit.asCurrencyRounded)")
                    .font(.appCaption)
                    .foregroundStyle(Color.appSecondaryText)
            }
            HStack(spacing: 12) {
                if let gy = vm.grossYield {
                    miniKPI("Brutto", value: gy.asPercentOneDecimal)
                }
                if let mm = vm.mietmultiplikator {
                    miniKPI("Faktor", value: mm.asMultiplier)
                }
                if vm.hasFinancingData {
                    miniKPI("CF/Mon", value: vm.cashflowAfterDebtMonthly.asCurrencyRounded,
                            valueColor: Color.valueColor(vm.cashflowAfterDebtMonthly))
                }
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func miniKPI(_ label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label).font(.appCaption).foregroundStyle(Color.appSecondaryText)
            Text(value).font(.appMonoSmall).foregroundStyle(valueColor)
        }
    }

    private func addCalculation() {
        let calc = InvestmentCalculation()
        calc.name = "Neuer Kaufkandidat"
        modelContext.insert(calc)
        selectedCalc = calc
    }
}
