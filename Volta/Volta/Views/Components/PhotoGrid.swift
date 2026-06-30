import SwiftUI
import PhotosUI

#if os(iOS)
struct PhotoGrid: View {
    @Binding var selectedImages: [UIImage]
    @Binding var coverIndex: Int
    var maxPhotos: Int = 15

    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var actionPhotoIndex: Int? = nil

    var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 3),
            spacing: 2
        ) {
            ForEach(Array(selectedImages.enumerated()), id: \.offset) { i, img in
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(minWidth: 0, maxWidth: .infinity)
                        .aspectRatio(1, contentMode: .fill)
                        .clipped()
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
                        selectedImages.remove(at: i)
                        if selectedImages.isEmpty {
                            coverIndex = 0
                        } else if coverIndex >= selectedImages.count {
                            coverIndex = 0
                        }
                        actionPhotoIndex = nil
                    }
                }
                .onTapGesture { actionPhotoIndex = i }
            }

            if selectedImages.count < maxPhotos {
                PhotosPicker(
                    selection: $pickerItems,
                    maxSelectionCount: maxPhotos - selectedImages.count,
                    matching: .images
                ) {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(
                            Color.appDimText,
                            style: StrokeStyle(lineWidth: 1.5, dash: [4])
                        )
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(
                            Image(systemName: "plus")
                                .foregroundStyle(Color.appDimText)
                        )
                }
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task { @MainActor in
                for item in items {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let img = UIImage(data: data) {
                        selectedImages.append(img)
                        if selectedImages.count == 1 { coverIndex = 0 }
                    }
                }
                pickerItems = []
            }
        }
    }
}
#else
// Stub for macOS — photos are iOS-only in this app
struct PhotoGrid: View {
    @Binding var selectedImages: [Data]
    @Binding var coverIndex: Int
    var maxPhotos: Int = 15

    var body: some View {
        Text("Fotos sind nur auf iOS verfügbar.")
            .foregroundStyle(Color.appSecondaryText)
            .font(.appSubtext)
    }
}
#endif
