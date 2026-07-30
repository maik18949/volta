import type { Database } from '@/lib/supabase/types';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';

type PropertyType = Database['public']['Enums']['property_type'];

export function PropertyHeaderPhoto({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    return (
      <div className="h-[200px] overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL */}
        <img src={coverPhotoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300">
      <Icon size={48} className="text-slate-400" />
    </div>
  );
}
