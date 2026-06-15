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
            AppShellView()
                .frame(minWidth: 900, minHeight: 600)
                .onAppear {
                    #if DEBUG
                    seedIfEmpty()
                    #endif
                }
        }
        .modelContainer(sharedModelContainer)
    }

    #if DEBUG
    private func seedIfEmpty() {
        let context = sharedModelContainer.mainContext
        var descriptor = FetchDescriptor<Property>()
        descriptor.predicate = #Predicate { $0.name == "ETW Dresden Neustadt" }
        let count = (try? context.fetchCount(descriptor)) ?? 0
        if count == 0 {
            SeedData.insertDresdnerETW(into: context)
        }
    }
    #endif
}
