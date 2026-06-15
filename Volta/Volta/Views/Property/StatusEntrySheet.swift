import SwiftUI
import SwiftData

struct StatusEntrySheet: View {
    let property: Property
    var entry: StatusEntry?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var statusFrom: Date
    @State private var status: PropertyStatus
    @State private var incomeActualMonthly: Double
    @State private var notes: String

    private var isEditing: Bool { entry != nil }
    private var title: String { isEditing ? "Status bearbeiten" : "Status hinzufügen" }
    private var canSave: Bool { !status.hasIncome || incomeActualMonthly > 0 }

    init(property: Property, entry: StatusEntry? = nil) {
        self.property = property
        self.entry = entry
        _statusFrom = State(initialValue: entry?.statusFrom ?? Date())
        _status = State(initialValue: entry?.status ?? .vermietet)
        _incomeActualMonthly = State(initialValue: entry?.incomeActualMonthly ?? 0.0)
        _notes = State(initialValue: entry?.notes ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider()
            form
            Divider()
            footer
        }
        .frame(minWidth: 420, idealWidth: 480)
        .background(Color.appContentBackground)
    }

    private var header: some View {
        HStack {
            Text(title)
                .font(.appHeadline)
                .foregroundStyle(Color.appPrimaryText)
            Spacer()
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Color.appSecondaryText)
                    .font(.title3)
            }
            .buttonStyle(.plain)
        }
        .padding(20)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Gültig ab *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                DatePicker("", selection: $statusFrom, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Status *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("", selection: $status) {
                    ForEach(PropertyStatus.allCases, id: \.self) { s in Text(s.rawValue).tag(s) }
                }
                .pickerStyle(.menu)
                .frame(width: 260)
            }

            if status.hasIncome {
                CurrencyField(label: "Einnahmen/Monat *", value: $incomeActualMonthly, isRequired: true)
                    .padding(.vertical, 4)
                    .background(Color.appCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Notiz (optional)").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z. B. Mietgarantie Cosona", text: $notes)
                    .textFieldStyle(.roundedBorder)
            }
        }
        .padding(20)
    }

    private var footer: some View {
        HStack {
            Spacer()
            Button("Abbrechen") { dismiss() }
                .buttonStyle(.bordered)
            Button(isEditing ? "Speichern" : "Hinzufügen") { save() }
                .buttonStyle(.borderedProminent)
                .tint(.appAccent)
                .disabled(!canSave)
        }
        .padding(20)
    }

    private func save() {
        let income = status.hasIncome ? incomeActualMonthly : 0.0
        if let entry {
            entry.statusFrom = statusFrom
            entry.status = status
            entry.incomeActualMonthly = income
            entry.notes = notes.isEmpty ? nil : notes
        } else {
            let newEntry = StatusEntry(
                statusFrom: statusFrom,
                status: status,
                incomeActualMonthly: income,
                notes: notes.isEmpty ? nil : notes
            )
            modelContext.insert(newEntry)
            property.statusHistory.append(newEntry)
        }
        dismiss()
    }
}
