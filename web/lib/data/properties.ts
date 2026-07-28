import { createClient } from '@/lib/supabase/server';
import { computePropertySummary, type PropertySummary } from '@/lib/data/propertySummary';
import { resolveCoverPhoto } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export interface PropertyWithSummary {
  property: PropertyRow;
  summary: PropertySummary;
  coverPhotoUrl: string | null;
}

/** Fetches all properties for the signed-in user (RLS-scoped) plus each one's computed summary. */
export async function getPropertiesWithSummaries(): Promise<PropertyWithSummary[]> {
  const supabase = await createClient();

  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .order('sort_order', { ascending: true });

  if (propertiesError) throw propertiesError;
  if (!properties || properties.length === 0) return [];

  const { data: statusEntries, error: statusError } = await supabase
    .from('status_entries')
    .select('*')
    .in(
      'property_id',
      properties.map((p) => p.id)
    );

  if (statusError) throw statusError;

  const { data: photoRows, error: photosError } = await supabase
    .from('property_photos')
    .select('*')
    .in(
      'property_id',
      properties.map((p) => p.id)
    );
  if (photosError) throw photosError;

  // Batch-sign every property's cover photo in a single Storage call, rather than one
  // createSignedUrls round-trip per property — this page renders a card per property.
  const coverPhotoByProperty = new Map<string, string>(); // property_id -> file_path
  for (const property of properties) {
    const ownPhotos = (photoRows ?? []).filter((p) => p.property_id === property.id);
    const cover = resolveCoverPhoto(ownPhotos);
    if (cover) coverPhotoByProperty.set(property.id, cover.file_path);
  }

  const filePaths = [...coverPhotoByProperty.values()];
  const signedUrlByPath = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage.from('property-photos').createSignedUrls(filePaths, 3600);
    if (signError) throw signError;
    filePaths.forEach((path, i) => {
      if (signed[i]?.signedUrl) signedUrlByPath.set(path, signed[i].signedUrl);
    });
  }

  const today = new Date();
  return properties.map((property) => {
    const ownStatusEntries = (statusEntries ?? []).filter((s) => s.property_id === property.id);
    const coverFilePath = coverPhotoByProperty.get(property.id);
    const coverPhotoUrl = coverFilePath ? (signedUrlByPath.get(coverFilePath) ?? null) : null;
    return { property, summary: computePropertySummary(property, ownStatusEntries, today), coverPhotoUrl };
  });
}

export interface PortfolioTotals {
  count: number;
  cashflowMonthly: number;
  totalInvestment: number;
  averageNetYield: number | null;
  remainingDebt: number;
}

export function computePortfolioTotals(items: PropertyWithSummary[]): PortfolioTotals {
  const count = items.length;
  const cashflowMonthly = items.reduce((sum, i) => sum + i.summary.cashflowAfterTaxMonthly, 0);
  const totalInvestment = items.reduce((sum, i) => sum + i.summary.totalInvestment, 0);
  const remainingDebt = items.reduce((sum, i) => sum + i.summary.remainingDebtNow, 0);
  // Per spec-hauptscreen.md: "Ø Nettorendite = Σ NOI / Σ totalInvestment" — a true weighted
  // average, using the now-exposed netOperatingIncomeYearly field directly (not reconstructed
  // from netYield * totalInvestment, which would need awkward null-handling).
  const totalNOI = items.reduce((sum, i) => sum + i.summary.netOperatingIncomeYearly, 0);
  const averageNetYield = totalInvestment > 0 ? totalNOI / totalInvestment : null;

  return { count, cashflowMonthly, totalInvestment, averageNetYield, remainingDebt };
}
