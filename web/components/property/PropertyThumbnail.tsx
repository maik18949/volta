import type { Database } from '@/lib/supabase/types';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';

type PropertyType = Database['public']['Enums']['property_type'];

export function PropertyThumbnail({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
      <img src={coverPhotoUrl} alt="" className="h-[160px] w-full object-cover" />
    );
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-[160px] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
      <Icon size={36} className="text-slate-400" />
    </div>
  );
}
