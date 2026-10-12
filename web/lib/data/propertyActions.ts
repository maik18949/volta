'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';
import { isValidSwitchYear } from '@/lib/calculations/depreciationSchedule';

export async function deleteProperty(propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
}

/**
 * Inserts a new property (and, if provided, its first status entry) for the signed-in user.
 * `user_id` is set here from the authenticated session — never accepted from the caller.
 */
export async function createProperty(
  propertyInsert: Omit<TablesInsert<'properties'>, 'user_id'>,
  statusEntryInserts: Array<Omit<TablesInsert<'status_entries'>, 'property_id'>>
): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({ ...propertyInsert, user_id: user.id })
    .select('id')
    .single();

  if (propertyError) throw propertyError;

  if (statusEntryInserts.length > 0) {
    const { error: statusError } = await supabase
      .from('status_entries')
      .insert(statusEntryInserts.map((entry) => ({ ...entry, property_id: property.id })));
    if (statusError) throw statusError;
  }

  revalidatePath('/');
  return property.id;
}

/** Applies a partial update to a property — used by the Immobiliendaten tab's auto-save. */
export async function updateProperty(propertyId: string, patch: TablesUpdate<'properties'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').update(patch).eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath(`/properties/${propertyId}`, 'layout');
}

/**
 * Merkt das Wechseljahr zu linear vor (oder nimmt es mit `null` zurück). Nur für degressive Objekte;
 * das Jahr muss nach dem Erwerbsjahr liegen. Der Wechsel wirkt automatisch ab diesem Jahr (siehe depreciationSchedule).
 */
export async function setDegressiveSwitchYear(propertyId: string, year: number | null): Promise<void> {
  const supabase = await createClient();
  const { data: property, error: readError } = await supabase
    .from('properties')
    .select('economic_transfer_date, depreciation_method')
    .eq('id', propertyId)
    .maybeSingle();
  if (readError) throw readError;
  if (!property) throw new Error('Objekt nicht gefunden.');
  if (property.depreciation_method !== 'degressiv_5a') throw new Error('Ein Wechsel ist nur bei degressiver AfA möglich.');
  if (year !== null && !isValidSwitchYear(year, new Date(property.economic_transfer_date + 'T00:00:00Z'))) {
    throw new Error('Ungültiges Wechseljahr.');
  }

  const { error } = await supabase.from('properties').update({ degressive_switch_year: year }).eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath(`/properties/${propertyId}`, 'layout');
}
