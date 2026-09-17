'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

export async function createLoanDisbursement(
  propertyId: string,
  input: Omit<TablesInsert<'loan_disbursements'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  if (!input.date) throw new Error('Datum ist erforderlich.');
  if (input.amount === undefined || input.amount <= 0) throw new Error('Betrag muss größer als 0 sein.');

  const { error } = await supabase.from('loan_disbursements').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}

export async function updateLoanDisbursement(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'loan_disbursements'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();
  if (patch.amount !== undefined && patch.amount <= 0) throw new Error('Betrag muss größer als 0 sein.');

  const { error } = await supabase.from('loan_disbursements').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}

export async function deleteLoanDisbursement(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('loan_disbursements').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}
