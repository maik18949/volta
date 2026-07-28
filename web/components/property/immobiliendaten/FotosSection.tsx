'use client';

import { useRef, useState, useTransition } from 'react';
import { Star, Trash2, Plus } from 'lucide-react';
import { uploadPropertyPhoto, deletePropertyPhoto, setCoverPhoto } from '@/lib/data/propertyPhotoActions';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

const MAX_PHOTOS = 15;

export function FotosSection({ propertyId, photos }: { propertyId: string; photos: PropertyPhotoWithUrl[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      try {
        await uploadPropertyPhoto(propertyId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-text-secondary">Fotos</p>

      {photos.length === 0 && <p className="text-sm text-text-dim">Noch keine Fotos hinzugefügt.</p>}

      <div className="grid grid-cols-3 gap-3">
        {photos.map(({ photo, url }) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-black/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URLs, not a static asset */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {photo.is_cover_photo && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 p-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {!photo.is_cover_photo && (
                <button
                  type="button"
                  title="Titelbild setzen"
                  onClick={() => startTransition(() => setCoverPhoto(propertyId, photo.id))}
                  className="rounded-full bg-white/90 p-2"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                title="Löschen"
                onClick={() => {
                  if (confirm('Foto löschen?')) startTransition(() => deletePropertyPhoto(propertyId, photo.id, photo.file_path));
                }}
                className="rounded-full bg-white/90 p-2"
              >
                <Trash2 size={14} className="text-negative" />
              </button>
            </div>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/20 text-text-dim disabled:opacity-40"
          >
            <Plus size={20} />
            <span className="text-xs">Foto hinzufügen</span>
          </button>
        )}
      </div>

      <p className="text-xs text-text-dim">
        {photos.length}/{MAX_PHOTOS} Fotos
      </p>
      {error && <p className="text-xs text-negative">{error}</p>}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
