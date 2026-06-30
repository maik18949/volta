import SwiftUI
import SwiftData

struct ExtraordinaryCostSheet: View {
    let property: Property
    var entry: ExtraordinaryCost? = nil

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var costMonth: Date
    @State private var category: ExtraordinaryCostCategory
    @State private var descriptionText: String
    @State private var amount: Double
    @State private var isDeductible: Bool

    private var isEditing: Bool { entry != nil }
    private var title: String { isEditing ? "Kosten bearbeiten" : "Kosten hinzufügen" }
    private var canSave: Bool { amount > 0 }

    init(property: Property, entry: ExtraordinaryCost? = nil) {
        self.property = property
        self.entry = entry
        _costMonth = State(initialValue: entry?.costMonth ?? Date())
        _category = State(initialValue: entry?.category ?? .sonstiges)
        _descriptionText = State(initialValue: entry?.descriptionText ?? "")
        _amount = State(initialValue: entry?.amount ?? 0.0)
        _isDeductible = State(initialValue: entry?.isDeductible ?? true)
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
                Text("Datum *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                DatePicker("", selection: $costMonth, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .frame(width: 160)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Kategorie *").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                Picker("", selection: $category) {
                    ForEach(ExtraordinaryCostCategory.allCases, id: \.self) { cat in
                        Text(cat.rawValue).tag(cat)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 260)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Beschreibung").font(.appCaption).foregroundStyle(Color.appSecondaryText)
                TextField("z. B. Vermietungsprovision, WEG Sonderumlage", text: $descriptionText)
                    .textFieldStyle(.roundedBorder)
            }

            CurrencyField(label: "Betrag *", value: $amount, isRequired: true)
                .padding(.vertical, 4)
                .background(Color.appCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            Toggle(isOn: $isDeductible) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Steuerlich absetzbar")
                        .font(.appBody)
                        .foregroundStyle(Color.appPrimaryText)
                    Text("§9 EStG Werbungskosten")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                }
            }
            .tint(.appAccent)
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
        let desc: String? = descriptionText.isEmpty ? nil : descriptionText
        if let entry {
            entry.costMonth = costMonth
            entry.category = category
            entry.descriptionText = desc
            entry.amount = amount
            entry.isDeductible = isDeductible
        } else {
            let newCost = ExtraordinaryCost(
                costMonth: costMonth,
                amount: amount,
                category: category,
                descriptionText: desc,
                isDeductible: isDeductible
            )
            modelContext.insert(newCost)
            property.extraordinaryCosts.append(newCost)
        }
        dismiss()
    }
}
