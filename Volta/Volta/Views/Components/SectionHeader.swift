import SwiftUI

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.appHeadline)
            .foregroundStyle(Color.appPrimaryText)
            .padding(.top, 8)
            .padding(.bottom, 2)
    }
}
