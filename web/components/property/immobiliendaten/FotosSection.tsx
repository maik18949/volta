'use client';

import { useRef, useState, useTransition } from 'react';
import { Star, Trash2, Plus } from 'lucide-react';
import { uploadPropertyPhoto, deletePropertyPhoto, setCoverPhoto } from '@/lib/data/propertyPhotoActions';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

const MAX_PHOTOS = 15;

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function FotosSection({ propertyId, photos }: { propertyId: string; photos: PropertyPhotoWithUrl[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});

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

  function handleSetCover(photo: PropertyPhotoWithUrl['photo']) {
    setPhotoErrors((prev) => withoutKey(prev, photo.id));
    setPendingIds((prev) => ({ ...prev, [photo.id]: true }));
    startTransition(async () => {
      try {
        await setCoverPhoto(propertyId, photo.id);
      } catch {
        setPhotoErrors((prev) => ({ ...prev, [photo.id]: 'Titelbild konnte nicht gesetzt werden.' }));
      } finally {
        setPendingIds((prev) => withoutKey(prev, photo.id));
      }
    });
  }

  function handleDeletePhoto(photo: PropertyPhotoWithUrl['photo']) {
    if (!window.confirm('Foto löschen?')) return;
    setPhotoErrors((prev) => withoutKey(prev, photo.id));
    setPendingIds((prev) => ({ ...prev, [photo.id]: true }));
    startTransition(async () => {
      try {
        await deletePropertyPhoto(propertyId, photo.id, photo.file_path);
      } catch {
        setPhotoErrors((prev) => ({ ...prev, [photo.id]: 'Löschen fehlgeschlagen — bitte erneut versuchen.' }));
      } finally {
        setPendingIds((prev) => withoutKey(prev, photo.id));
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
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {!photo.is_cover_photo && (
                <button
                  type="button"
                  title="Titelbild setzen"
                  aria-label="Titelbild setzen"
                  disabled={!!pendingIds[photo.id]}
                  onClick={() => handleSetCover(photo)}
                  className="rounded-full bg-white/90 p-2 disabled:opacity-50"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                title="Löschen"
                aria-label="Löschen"
                disabled={!!pendingIds[photo.id]}
                onClick={() => handleDeletePhoto(photo)}
                className="rounded-full bg-white/90 p-2 disabled:opacity-50"
              >
                <Trash2 size={14} className="text-negative" />
              </button>
            </div>
            {photoErrors[photo.id] && (
              <p
                role="alert"
                className="absolute inset-x-1 bottom-1 rounded bg-black/70 px-1.5 py-1 text-center text-[10px] leading-tight text-negative"
              >
                {photoErrors[photo.id]}
              </p>
            )}
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
