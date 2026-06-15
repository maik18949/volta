import SwiftUI

struct KPICardWithContext: View {
    let label: String
    let value: String
    let benchmark: BenchmarkResult
    var width: CGFloat = 200

    private var ratingColor: Color {
        switch benchmark.rating {
        case .sehrGut: return .appPositive
        case .gut:     return Color(hex: "#65A30D")
        case .okay:    return Color(hex: "#D97706")
        case .schlecht, .kritisch: return .appNegative
        case .neutral: return .appSecondaryText
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)

            Text(value)
                .font(.appDisplay)
                .foregroundStyle(Color.appPrimaryText)
                .fontDesign(.monospaced)

            HStack(spacing: 4) {
                Text(benchmark.rating.rawValue)
                    .font(.appCaption)
                    .fontWeight(.medium)
                    .foregroundStyle(ratingColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ratingColor.opacity(0.12))
                    .clipShape(Capsule())
            }

            Text(benchmark.context)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
                .italic()
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(width: width, alignment: .leading)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}
