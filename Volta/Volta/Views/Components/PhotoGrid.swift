import SwiftUI
import PhotosUI

#if os(iOS)
struct PhotoGrid: View {
    @Binding var photosData: [Data]
    @Binding var coverIndex: Int
    var maxPhotos: Int = 15

    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var actionPhotoIndex: Int? = nil

    var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 3),
            spacing: 2
        ) {
            ForEach(Array(photosData.enumerated()), id: \.offset) { i, data in
                ZStack(alignment: .topTrailing) {
                    if let img = UIImage(data: data) {
                        Image(uiImage: img)
                            .resizable()
                            .scaledToFill()
                            .frame(minWidth: 0, maxWidth: .infinity)
                            .aspectRatio(1, contentMode: .fill)
                            .clipped()
                    }
                    if i == coverIndex {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                            .padding(4)
                            .shadow(radius: 2)
                    }
                }
                .confirmationDialog(
                    "Foto",
                    isPresented: Binding(
                        get: { actionPhotoIndex == i },
                        set: { if !$0 { actionPhotoIndex = nil } }
                    )
                ) {
                    Button("Titelbild setzen") {
                        coverIndex = i
                        actionPhotoIndex = nil
                    }
                    Button("Löschen", role: .destructive) {
                        photosData.remove(at: i)
                        if photosData.isEmpty || coverIndex >= photosData.count {
                            coverIndex = 0
                        }
                        actionPhotoIndex = nil
                    }
                }
                .onTapGesture { actionPhotoIndex = i }
            }

            if photosData.count < maxPhotos {
                PhotosPicker(
                    selection: $pickerItems,
                    maxSelectionCount: maxPhotos - photosData.count,
                    matching: .images
                ) {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.appDimText, style: StrokeStyle(lineWidth: 1.5, dash: [4]))
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(Image(systemName: "plus").foregroundStyle(Color.appDimText))
                }
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task { @MainActor in
                for item in items {
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        photosData.append(data)
                        if photosData.count == 1 { coverIndex = 0 }
                    }
                }
                pickerItems = []
            }
        }
    }
}
#else
struct PhotoGrid: View {
    @Binding var photosData: [Data]
    @Binding var coverIndex: Int
    var maxPhotos: Int = 15

    var body: some View {
        Text("Fotos sind nur auf iOS verfügbar.")
            .foregroundStyle(Color.appSecondaryText)
            .font(.appSubtext)
    }
}
#endif
