import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getPropertyPhotosWithUrls, type PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export interface PropertyDetailData {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  loanDisbursements: LoanDisbursementRow[];
  photos: PropertyPhotoWithUrl[];
}

/**
 * Fetches a single property (RLS-scoped) plus its full status/cost/loan
 * disbursement history. Returns null if not found (caller should render
 * notFound()). Wrapped in React's cache() so the layout and its active tab
 * page — both server components rendering the same request — share one
 * fetch instead of two.
 */
export const getPropertyDetail = cache(async (propertyId: string): Promise<PropertyDetailData | null> => {
  const supabase = await createClient();

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) throw propertyError;
  if (!property) return null;

  const [
    { data: statusEntries, error: statusError },
    { data: extraordinaryCosts, error: costsError },
    { data: loanDisbursements, error: disbursementsError },
    photos,
  ] = await Promise.all([
    supabase.from('status_entries').select('*').eq('property_id', propertyId).order('date', { ascending: true }),
    supabase.from('extraordinary_costs').select('*').eq('property_id', propertyId).order('cost_month', { ascending: true }),
    supabase.from('loan_disbursements').select('*').eq('property_id', propertyId).order('date', { ascending: true }),
    getPropertyPhotosWithUrls(propertyId),
  ]);

  if (statusError) throw statusError;
  if (costsError) throw costsError;
  if (disbursementsError) throw disbursementsError;

  return {
    property,
    statusEntries: statusEntries ?? [],
    extraordinaryCosts: extraordinaryCosts ?? [],
    loanDisbursements: loanDisbursements ?? [],
    photos,
  };
});
