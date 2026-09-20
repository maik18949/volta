'use client';

import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';
import { PhotoLightbox } from './PhotoLightbox';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

const STEP_BUTTON =
  'absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70';

/**
 * 132px photo strip at the top of the property sidebar: prev/next stepping, position dots,
 * "Titelfoto" badge, click-to-enlarge lightbox. View-only — editing stays in FotosSection.
 */
export function SidebarPhoto({ photos, propertyType }: { photos: PropertyPhotoWithUrl[]; propertyType: PropertyType }) {
  const coverIndex = Math.max(
    0,
    photos.findIndex(({ photo }) => photo.is_cover_photo)
  );
  const [index, setIndex] = useState(coverIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const step = useCallback(
    (direction: -1 | 1) => {
      if (photos.length < 2) return;
      setIndex((i) => (i + direction + photos.length) % photos.length);
    },
    [photos.length]
  );
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  if (photos.length === 0) {
    const Icon = PLACEHOLDER_ICONS[propertyType];
    return (
      <div className="flex h-[132px] shrink-0 items-center justify-center bg-gradient-to-br from-slate-400 to-slate-500">
        <Icon size={44} strokeWidth={1.6} className="text-white/85" />
      </div>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];

  return (
    <div className="relative h-[132px] shrink-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        title="Foto vergrößern"
        aria-label="Foto vergrößern"
        className="block h-full w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL */}
        <img src={current.url} alt="" className="h-full w-full object-cover" />
      </button>
      {current.photo.is_cover_photo && (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 px-[7px] py-0.5 text-[11px] font-semibold text-white">
          Titelfoto
        </span>
      )}
      {photos.length > 1 && (
        <>
          <button type="button" onClick={() => step(-1)} title="Vorheriges Foto" aria-label="Vorheriges Foto" className={`left-1.5 ${STEP_BUTTON}`}>
            <ChevronLeft size={12} strokeWidth={3} />
          </button>
          <button type="button" onClick={() => step(1)} title="Nächstes Foto" aria-label="Nächstes Foto" className={`right-1.5 ${STEP_BUTTON}`}>
            <ChevronRight size={12} strokeWidth={3} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-[5px] rounded-full ${i === index ? 'w-3.5 bg-white' : 'w-[5px] bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
      {lightboxOpen && <PhotoLightbox photos={photos} index={index} onClose={closeLightbox} onStep={step} />}
    </div>
  );
}
