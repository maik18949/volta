'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STORAGE_BUCKET = 'property-photos';
const MAX_PHOTOS_PER_PROPERTY = 15;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export async function uploadPropertyPhoto(propertyId: string, formData: FormData): Promise<void> {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Keine Datei übergeben.');
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('Nur JPEG, PNG, WebP oder HEIC erlaubt.');

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('property_photos')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PHOTOS_PER_PROPERTY) throw new Error(`Maximal ${MAX_PHOTOS_PER_PROPERTY} Fotos pro Immobilie.`);

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const filePath = `${propertyId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('property_photos').insert({
    property_id: propertyId,
    file_path: filePath,
    is_cover_photo: (count ?? 0) === 0, // first photo uploaded becomes the cover automatically
    sort_order: count ?? 0,
  });
  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    throw insertError;
  }

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}

export async function deletePropertyPhoto(propertyId: string, photoId: string, filePath: string): Promise<void> {
  const supabase = await createClient();

  const { error: deleteRowError } = await supabase.from('property_photos').delete().eq('id', photoId);
  if (deleteRowError) throw deleteRowError;

  const { error: deleteObjectError } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (deleteObjectError) throw deleteObjectError;

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}

export async function setCoverPhoto(propertyId: string, photoId: string): Promise<void> {
  const supabase = await createClient();

  const { error: clearError } = await supabase
    .from('property_photos')
    .update({ is_cover_photo: false })
    .eq('property_id', propertyId);
  if (clearError) throw clearError;

  const { error: setError } = await supabase.from('property_photos').update({ is_cover_photo: true }).eq('id', photoId);
  if (setError) throw setError;

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}
