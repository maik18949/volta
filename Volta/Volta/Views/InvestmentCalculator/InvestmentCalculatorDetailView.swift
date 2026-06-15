import SwiftUI

struct InvestmentCalculatorDetailView: View {
    let calculation: InvestmentCalculation
    @State private var showingPromoteSheet = false

    private var vm: InvestmentCalculatorViewModel {
        InvestmentCalculatorViewModel(calculation: calculation)
    }

    var body: some View {
        VStack(spacing: 0) {
            InvestmentKPIPanel(vm: vm)

            Divider()

            if calculation.isPromoted {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.appPositive)
                    Text("Als Immobilie übernommen")
                        .font(.appCaption)
                        .foregroundStyle(Color.appPositive)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.appPositive.opacity(0.08))

                Divider()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    InvestmentInputSections(calculation: calculation)
                    InvestmentSensitivityView(vm: vm)
                }
                .padding(20)
            }
        }
        .navigationTitle(calculation.name.isEmpty ? "Kaufkandidat" : calculation.name)
        .toolbar {
            if !calculation.isPromoted {
                ToolbarItem(placement: .primaryAction) {
                    Button("Als Immobilie übernehmen") {
                        showingPromoteSheet = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.appAccent)
                    .disabled(!vm.hasBaseData)
                }
            }
        }
        .sheet(isPresented: $showingPromoteSheet) {
            InvestmentPromoteSheet(calculation: calculation)
        }
        .background(Color.appContentBackground)
    }
}
