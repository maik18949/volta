import type { Database } from '@/lib/supabase/types';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';

type PropertyType = Database['public']['Enums']['property_type'];

/** 160px cover image (or a gradient placeholder with the type icon) for the portfolio card. */
export function PropertyThumbnail({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
      <img src={coverPhotoUrl} alt="" className="h-40 w-full object-cover" />
    );
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-accent to-indigo-500">
      <Icon size={48} strokeWidth={1.5} className="text-white/90" />
    </div>
  );
}
