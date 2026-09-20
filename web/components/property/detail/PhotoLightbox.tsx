'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

const ROUND_BUTTON = 'flex items-center justify-center rounded-full bg-white/[0.12] text-white hover:bg-white/25';

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onStep,
}: {
  photos: PropertyPhotoWithUrl[];
  index: number;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onStep(-1);
      else if (e.key === 'ArrowRight') onStep(1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onStep]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const current = photos[index];
  if (!current) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      onClick={onClose}
      className="fixed inset-0 z-[210] flex cursor-zoom-out items-center justify-center bg-[rgba(15,23,42,0.88)] p-8"
    >
      <button type="button" onClick={onClose} title="Schließen" aria-label="Schließen" className={`absolute right-4 top-4 h-9 w-9 ${ROUND_BUTTON}`}>
        <X size={16} strokeWidth={2.5} />
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            title="Vorheriges Foto"
            aria-label="Vorheriges Foto"
            className={`absolute left-5 top-1/2 h-11 w-11 -translate-y-1/2 ${ROUND_BUTTON}`}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            title="Nächstes Foto"
            aria-label="Nächstes Foto"
            className={`absolute right-5 top-1/2 h-11 w-11 -translate-y-1/2 ${ROUND_BUTTON}`}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL */}
      <img
        src={current.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-auto max-w-[min(100%,960px)] cursor-default rounded-[14px] object-contain shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      />
      <p className="absolute inset-x-0 bottom-5 text-center text-[13px] font-medium text-white/70">
        {index + 1} / {photos.length}
      </p>
    </div>,
    document.body
  );
}
