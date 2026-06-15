import SwiftUI

struct SollIstRow: View {
    let label: String
    let soll: String
    let ist: String
    var deviation: Double? = nil

    private var deviationColor: Color {
        guard let d = deviation else { return .clear }
        return d >= 0 ? .appPositive : .appNegative
    }

    var body: some View {
        HStack {
            Text(label)
                .font(.appBody)
                .foregroundStyle(Color.appPrimaryText)

            Spacer()

            Text(soll)
                .font(.appMono)
                .foregroundStyle(Color.appSecondaryText)
                .frame(width: 100, alignment: .trailing)

            Text(ist)
                .font(.appMono)
                .foregroundStyle(Color.appPrimaryText)
                .frame(width: 100, alignment: .trailing)

            if let d = deviation {
                Text(d >= 0 ? "+\(Formatters.formatCurrency(d))" : Formatters.formatCurrency(d))
                    .font(.appMonoSmall)
                    .foregroundStyle(deviationColor)
                    .frame(width: 80, alignment: .trailing)
            }
        }
        .padding(.vertical, 4)
    }
}
