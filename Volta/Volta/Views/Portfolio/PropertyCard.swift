import SwiftUI

struct PropertyCard: View {
    let property: Property
    private var vm: PropertyViewModel { PropertyViewModel(property: property) }

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 0) {
                // Cover image
                coverImageView
                    .frame(height: 160)
                    .clipped()

                VStack(alignment: .leading, spacing: 10) {
                    // Name + Status
                    HStack(alignment: .center) {
                        Text(property.name)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Color.appPrimaryText)
                            .lineLimit(1)
                        Spacer()
                        if let status = vm.currentStatus {
                            StatusBadge(status: status.status)
                        }
                    }

                    // Address
                    Text("\(property.address), \(property.city)")
                        .font(.appCaption)
                        .foregroundStyle(Color.appSecondaryText)
                        .lineLimit(1)

                    Divider()

                    // KPI grid
                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        alignment: .leading,
                        spacing: 10
                    ) {
                        cardKPI(
                            label: "Cashflow/Mon",
                            value: Formatters.formatCurrencyRounded(vm.cashflowAfterDebtMonthly),
                            valueColor: Color.valueColor(vm.cashflowAfterDebtMonthly)
                        )
                        cardKPI(
                            label: "Nettorendite",
                            value: vm.netYield.map { Formatters.formatPercentOneDecimal($0) } ?? "–"
                        )
                        cardKPI(
                            label: "Kaufpreis/m²",
                            value: vm.purchasePricePerSqm > 0
                                ? "\(Formatters.formatCurrencyRounded(vm.purchasePricePerSqm))/m²"
                                : "–"
                        )
                        cardKPI(
                            label: "Restschuld",
                            value: vm.remainingDebtNow > 0
                                ? Formatters.formatCurrencyRounded(vm.remainingDebtNow)
                                : "–"
                        )
                    }

                    Divider()

                    // Footer
                    HStack(spacing: 6) {
                        if property.livingAreaSqm > 0 {
                            Text("\(Formatters.formatAreaSqm(property.livingAreaSqm)) m²")
                                .font(.appCaption)
                                .foregroundStyle(Color.appSecondaryText)
                        }
                        if let rooms = property.rooms, rooms > 0 {
                            Text("·")
                                .foregroundStyle(Color.appDimText)
                            Text("\(Formatters.formatRooms(rooms)) Zi")
                                .font(.appCaption)
                                .foregroundStyle(Color.appSecondaryText)
                        }
                        Text("·")
                            .foregroundStyle(Color.appDimText)
                        Text("seit \(Formatters.formatMonthYear(property.economicTransferDate))")
                            .font(.appCaption)
                            .foregroundStyle(Color.appSecondaryText)
                    }
                }
                .padding(14)
            }
        }
    }

    @ViewBuilder
    private var coverImageView: some View {
        #if canImport(UIKit)
        let coverPhoto = property.photos.first(where: { $0.isCoverPhoto })
            ?? property.photos.sorted(by: { $0.sortOrder < $1.sortOrder }).first

        if let photoPath = coverPhoto?.filePath,
           let uiImage = UIImage(contentsOfFile: photoPath) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
        } else {
            placeholderGradient
        }
        #else
        placeholderGradient
        #endif
    }

    private var placeholderGradient: some View {
        LinearGradient(
            colors: [Color.appGradientFrom, Color.appGradientTo],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: propertyTypeIcon)
                .font(.system(size: 40))
                .foregroundStyle(Color.appAccent.opacity(0.6))
        )
    }

    private var propertyTypeIcon: String {
        switch property.propertyType {
        case .apartment:        return "building"
        case .einfamilienhaus:  return "house"
        case .mehrfamilienhaus: return "building.2"
        case .gewerbe:          return "storefront"
        case .grundstuck:       return "map"
        case .sonstiges:        return "questionmark.square"
        }
    }

    @ViewBuilder
    private func cardKPI(label: String, value: String, valueColor: Color = .appPrimaryText) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.appCaption)
                .foregroundStyle(Color.appSecondaryText)
            Text(value)
                .font(.appMono)
                .foregroundStyle(valueColor)
        }
    }
}
