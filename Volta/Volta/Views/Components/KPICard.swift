import SwiftUI

struct KPICard: View {
    let label: String
    let value: String
    var valueColor: Color = .appPrimaryText
    var width: CGFloat = 160

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appDisplay)
                .foregroundStyle(valueColor)
                .fontDesign(.monospaced)
        }
        .padding(12)
        .frame(width: width, alignment: .leading)
        .background(Color.appCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}
