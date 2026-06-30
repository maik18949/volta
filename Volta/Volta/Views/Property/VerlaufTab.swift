import SwiftUI
import SwiftData

// MARK: - Feed Item

enum FeedItem: Identifiable {
    case status(StatusEntry)
    case cost(ExtraordinaryCost)

    var id: String {
        switch self {
        case .status(let e): return "status-\(e.id)"
        case .cost(let c): return "cost-\(c.id)"
        }
    }

    var date: Date {
        switch self {
        case .status(let e): return e.date
        case .cost(let c): return c.costMonth
        }
    }

    var createdAt: Date {
        switch self {
        case .status(let e): return e.createdAt
        case .cost: return Date.distantPast
        }
    }
}

// MARK: - VerlaufTab

struct VerlaufTab: View {
    let property: Property

    @Environment(\.modelContext) private var modelContext

    @State private var showAddStatusSheet = false
    @State private var showAddCostSheet = false
    @State private var editingStatus: StatusEntry? = nil
    @State private var showEditStatusSheet = false
    @State private var editingCost: ExtraordinaryCost? = nil
    @State private var showEditCostSheet = false

    // MARK: - Computed

    var feedItems: [FeedItem] {
        let statusItems = property.statusHistory.map { FeedItem.status($0) }
        let costItems = property.extraordinaryCosts.map { FeedItem.cost($0) }
        return (statusItems + costItems).sorted {
            if $0.date != $1.date { return $0.date > $1.date }
            return $0.createdAt > $1.createdAt
        }
    }

    /// Sorted status entries by date ascending — used to compute end dates
    private var sortedStatusEntries: [StatusEntry] {
        property.statusHistory.sorted { $0.date < $1.date }
    }

    /// End date for a status entry = start date of the next entry (nil = currently active)
    private func endDate(for entry: StatusEntry) -> Date? {
        let sorted = sortedStatusEntries
        guard let idx = sorted.firstIndex(where: { $0.id == entry.id }) else { return nil }
        let nextIdx = sorted.index(after: idx)
        guard nextIdx < sorted.endIndex else { return nil }
        return sorted[nextIdx].date
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            feedHeader
            Divider()
            feedContent
        }
        .sheet(isPresented: $showAddStatusSheet) {
            StatusEntrySheet(property: property)
        }
        .sheet(isPresented: $showEditStatusSheet) {
            if let entry = editingStatus {
                StatusEntrySheet(property: property, entry: entry)
            }
        }
        .sheet(isPresented: $showAddCostSheet) {
            ExtraordinaryCostSheet(property: property)
        }
        .sheet(isPresented: $showEditCostSheet) {
            if let entry = editingCost {
                ExtraordinaryCostSheet(property: property, entry: entry)
            }
        }
    }

    // MARK: - Subviews

    private var feedHeader: some View {
        HStack {
            Text("Verlauf")
                .font(.appHeadline)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Button {
                showAddStatusSheet = true
            } label: {
                Label("Status", systemImage: "plus")
                    .font(.appCaption)
            }
            .buttonStyle(.bordered)
            Button {
                showAddCostSheet = true
            } label: {
                Label("Kosten", systemImage: "plus")
                    .font(.appCaption)
            }
            .buttonStyle(.borderedProminent)
            .tint(.appAccent)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    @ViewBuilder
    private var feedContent: some View {
        if feedItems.isEmpty {
            emptyState
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(feedItems) { item in
                        Group {
                            switch item {
                            case .status(let entry):
                                statusRow(entry)
                            case .cost(let cost):
                                costRow(cost)
                            }
                        }
                        Divider()
                            .padding(.leading, 20)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 48))
                .foregroundStyle(Color.appDimText)
            Text("Noch kein Verlauf.")
                .font(.appHeadline)
                .foregroundStyle(Color.appSecondaryText)
            Button("+ Ersten Status hinzufügen") {
                showAddStatusSheet = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.appAccent)
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(32)
    }

    // MARK: - Status Row

    private func statusRow(_ entry: StatusEntry) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                StatusBadge(status: entry.status)

                statusDateLine(entry)

                if entry.status == .mietgarantie, let income = entry.incomeActualMonthly {
                    Text("\(Formatters.formatCurrency(income)) / Monat")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }

                if !entry.notes.isEmpty {
                    Text(entry.notes)
                        .font(.appCaption)
                        .foregroundStyle(Color.appDimText)
                        .italic()
                }
            }
            Spacer()
            contextMenu(
                onEdit: {
                    editingStatus = entry
                    showEditStatusSheet = true
                },
                onDelete: { deleteStatus(entry) }
            )
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func statusDateLine(_ entry: StatusEntry) -> some View {
        let end = endDate(for: entry)
        let startFormatted = entry.date.formatted(date: .abbreviated, time: .omitted)

        if let end {
            let days = Calendar.current.dateComponents([.day], from: entry.date, to: end).day ?? 0
            let endFormatted = end.formatted(date: .abbreviated, time: .omitted)
            Text("seit \(startFormatted) – \(endFormatted) · \(days) Tage")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
        } else {
            Text("seit \(startFormatted) · aktuell")
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
        }
    }

    // MARK: - Cost Row

    private func costRow(_ cost: ExtraordinaryCost) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "eurosign.circle.fill")
                .font(.title3)
                .foregroundStyle(Color.appSecondaryText)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 4) {
                Text(cost.descriptionText ?? cost.category.rawValue)
                    .font(.appBody)
                    .foregroundStyle(Color.appPrimaryText)

                HStack(spacing: 8) {
                    Text(cost.costMonth.formatted(.dateTime.month().year()))
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)

                    Text("−\(Formatters.formatCurrency(cost.amount))")
                        .font(.appMono)
                        .foregroundStyle(Color.appNegative)

                    deductibleBadge(cost.isDeductible)
                }
            }

            Spacer()

            contextMenu(
                onEdit: {
                    editingCost = cost
                    showEditCostSheet = true
                },
                onDelete: { deleteCost(cost) }
            )
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    private func deductibleBadge(_ isDeductible: Bool) -> some View {
        let label = isDeductible ? "absetzbar" : "nicht absetzbar"
        let color: Color = isDeductible ? .appPositive : Color.orange
        return Text(label)
            .font(.appCaption)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    // MARK: - Context Menu

    private func contextMenu(onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) -> some View {
        Menu {
            Button {
                onEdit()
            } label: {
                Label("Bearbeiten", systemImage: "pencil")
            }
            Divider()
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Löschen", systemImage: "trash")
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .foregroundStyle(Color.appSecondaryText)
                .font(.title3)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Delete

    private func deleteStatus(_ entry: StatusEntry) {
        property.statusHistory.removeAll { $0.id == entry.id }
        modelContext.delete(entry)
    }

    private func deleteCost(_ entry: ExtraordinaryCost) {
        property.extraordinaryCosts.removeAll { $0.id == entry.id }
        modelContext.delete(entry)
    }
}
