'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

export async function createExtraordinaryCost(
  propertyId: string,
  input: Omit<TablesInsert<'extraordinary_costs'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}

export async function updateExtraordinaryCost(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'extraordinary_costs'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}

export async function deleteExtraordinaryCost(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}
