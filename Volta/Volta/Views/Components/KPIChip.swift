import SwiftUI

enum KPIBenchmark {
    case good, ok, bad

    var color: Color {
        switch self {
        case .good: return Color(red: 0.086, green: 0.639, blue: 0.290)  // #16a34a
        case .ok:   return Color.orange                                    // #d97706
        case .bad:  return Color.red                                       // #dc2626
        }
    }
}

/// 8pt coloured dot indicating KPI benchmark quality
struct KPIChip: View {
    let benchmark: KPIBenchmark

    var body: some View {
        Circle()
            .fill(benchmark.color)
            .frame(width: 8, height: 8)
    }
}
