import SwiftUI
import SwiftData
import OSLog

private let logger = Logger(subsystem: "com.volta.ImmobilienPortfolio", category: "persistence")

@main
struct VoltaApp: App {
    var sharedModelContainer: ModelContainer

    init() {
        let schema = Schema([
            Property.self,
            StatusEntry.self,
            ExtraordinaryCost.self,
            RentGuarantee.self,
            InvestmentCalculation.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            sharedModelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            logger.error("ModelContainer init failed: \(error.localizedDescription)")
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            // ContentView is added in Plan 2.
            // Temporary placeholder:
            Text("Immobilien Portfolio Manager")
                .frame(minWidth: 900, minHeight: 600)
        }
        .modelContainer(sharedModelContainer)
    }
}
