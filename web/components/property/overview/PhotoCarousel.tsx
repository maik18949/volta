'use client';

import { useEffect, useRef, useState } from 'react';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

/**
 * Square, horizontally scrollable photo widget for the property header. Scroll-snap
 * (native, no JS slider) handles the actual swipe/scroll; this component only tracks
 * which photo is active for the dot indicator and counter badge. View-only — editing,
 * deleting, and setting the cover photo stays exclusive to FotosSection.
 */
export function PhotoCarousel({ photos, propertyType }: { photos: PropertyPhotoWithUrl[]; propertyType: PropertyType }) {
  const coverIndex = Math.max(
    0,
    photos.findIndex(({ photo }) => photo.is_cover_photo)
  );
  const [activeIndex, setActiveIndex] = useState(coverIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && coverIndex > 0) {
      el.scrollLeft = coverIndex * el.clientWidth;
    }
    // Only meant to run once on mount, to jump straight to the cover photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (photos.length === 0) {
    const Icon = PLACEHOLDER_ICONS[propertyType];
    return (
      <div className="flex h-[168px] w-[168px] flex-shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-200 to-slate-300">
        <Icon size={56} className="text-slate-400" />
      </div>
    );
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="relative h-[168px] w-[168px] flex-shrink-0 overflow-hidden rounded-[16px]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map(({ photo, url }) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
          <img key={photo.id} src={url} alt="" className="h-full w-full flex-shrink-0 snap-center object-cover" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
            {activeIndex + 1}/{photos.length}
          </span>
          <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            {photos.map((_, i) => (
              <span key={i} className={`h-1 w-1 rounded-full ${i === activeIndex ? 'bg-white' : 'bg-white/55'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
