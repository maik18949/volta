'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function assertNoDuplicateDate(
  supabase: SupabaseClient,
  propertyId: string,
  date: string,
  excludeId?: string
): Promise<void> {
  let query = supabase.from('status_entries').select('id').eq('property_id', propertyId).eq('date', date);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) throw new Error('Für dieses Datum existiert bereits ein Statuseintrag.');
}

async function assertNotBeforeTransfer(supabase: SupabaseClient, propertyId: string, date: string): Promise<void> {
  const { data: property, error } = await supabase
    .from('properties')
    .select('economic_transfer_date')
    .eq('id', propertyId)
    .single();
  if (error) throw error;
  if (date < property.economic_transfer_date) {
    throw new Error('Das Datum darf nicht vor dem wirtschaftlichen Übergang liegen.');
  }
}

export async function createStatusEntry(
  propertyId: string,
  input: Omit<TablesInsert<'status_entries'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  const date = input.date;
  if (!date) throw new Error('Datum ist erforderlich.');

  await assertNoDuplicateDate(supabase, propertyId, date);
  await assertNotBeforeTransfer(supabase, propertyId, date);

  const { error } = await supabase.from('status_entries').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}

export async function updateStatusEntry(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'status_entries'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();

  if (patch.date) {
    await assertNoDuplicateDate(supabase, propertyId, patch.date, id);
    await assertNotBeforeTransfer(supabase, propertyId, patch.date);
  }

  const { error } = await supabase.from('status_entries').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}

export async function deleteStatusEntry(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('status_entries').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}
