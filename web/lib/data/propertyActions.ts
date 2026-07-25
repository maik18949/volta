'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/lib/supabase/types';

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
  statusEntryInsert: Omit<TablesInsert<'status_entries'>, 'property_id'> | null
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

  if (statusEntryInsert) {
    const { error: statusError } = await supabase
      .from('status_entries')
      .insert({ ...statusEntryInsert, property_id: property.id });
    if (statusError) throw statusError;
  }

  revalidatePath('/');
  return property.id;
}
