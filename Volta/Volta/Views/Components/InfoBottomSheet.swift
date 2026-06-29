import SwiftUI

struct KPIInfo: Identifiable {
    let id = UUID()
    let title: String
    let formula: String
    let explanation: String
    let benchmarks: [(label: String, range: String, benchmark: KPIBenchmark)]
}

struct InfoBottomSheet: View {
    let info: KPIInfo

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(info.title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color.appPrimaryText)

                Text(info.formula)
                    .font(.system(size: 13).monospaced())
                    .foregroundStyle(Color.appSecondaryText)
                    .padding(8)
                    .background(Color.appGradientFrom.opacity(0.5))
                    .cornerRadius(6)

                Text(info.explanation)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.appPrimaryText)

                Text("BENCHMARK")
                    .font(.appSectionLabel)
                    .foregroundStyle(Color.appSectionLabel)
                    .padding(.top, 4)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(info.benchmarks, id: \.label) { item in
                        HStack(spacing: 8) {
                            KPIChip(benchmark: item.benchmark)
                            Text(item.label)
                                .font(.appRowLabel)
                                .foregroundStyle(Color.appPrimaryText)
                            Spacer()
                            Text(item.range)
                                .font(.appRowValue)
                                .foregroundStyle(Color.appSecondaryText)
                        }
                    }
                }
            }
            .padding(20)
        }
        .presentationDetents([.medium])
        .background(Color.white.opacity(0.98))
    }
}
