import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type PropertyPhotoRow = Database['public']['Tables']['property_photos']['Row'];

export interface PropertyPhotoWithUrl {
  photo: PropertyPhotoRow;
  url: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;
const STORAGE_BUCKET = 'property-photos';

/** Per spec-overview-tab.md: cover photo, else first by sort_order, else null. Pure — no I/O. */
export function resolveCoverPhoto(photos: PropertyPhotoRow[]): PropertyPhotoRow | null {
  if (photos.length === 0) return null;
  const cover = photos.find((p) => p.is_cover_photo);
  if (cover) return cover;
  return [...photos].sort((a, b) => a.sort_order - b.sort_order)[0];
}

/** Fetches every photo row for a property plus a signed URL for each, sorted by sort_order. */
export async function getPropertyPhotosWithUrls(propertyId: string): Promise<PropertyPhotoWithUrl[]> {
  const supabase = await createClient();
  const { data: photos, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!photos || photos.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(
      photos.map((p) => p.file_path),
      SIGNED_URL_TTL_SECONDS
    );
  if (signError) throw signError;

  return photos.map((photo, i) => ({ photo, url: signed[i]?.signedUrl ?? '' }));
}

/** Cover photo URL only, for list/header contexts that don't need the full gallery. */
export async function getCoverPhotoUrl(propertyId: string): Promise<string | null> {
  const photos = await getPropertyPhotosWithUrls(propertyId);
  const cover = resolveCoverPhoto(photos.map((p) => p.photo));
  if (!cover) return null;
  return photos.find((p) => p.photo.id === cover.id)?.url ?? null;
}
