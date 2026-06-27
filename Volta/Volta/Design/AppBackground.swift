import SwiftUI

struct AppBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Color.appGradientFrom, Color.appGradientTo],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}
