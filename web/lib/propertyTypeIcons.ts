import { Building2, Home, Building, Store, LandPlot, HelpCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

export const PLACEHOLDER_ICONS: Record<PropertyType, typeof Home> = {
  apartment: Building2,
  einfamilienhaus: Home,
  mehrfamilienhaus: Building,
  gewerbe: Store,
  grundstuck: LandPlot,
  sonstiges: HelpCircle,
};
