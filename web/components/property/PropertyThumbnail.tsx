import { Building2, Home, Building, Store, LandPlot, HelpCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

const PLACEHOLDER_ICONS: Record<PropertyType, typeof Home> = {
  apartment: Building2,
  einfamilienhaus: Home,
  mehrfamilienhaus: Building,
  gewerbe: Store,
  grundstuck: LandPlot,
  sonstiges: HelpCircle,
};

export function PropertyThumbnail({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
    return <img src={coverPhotoUrl} alt="" className="h-[160px] w-full object-cover" />;
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-[160px] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
      <Icon size={36} className="text-slate-400" />
    </div>
  );
}
