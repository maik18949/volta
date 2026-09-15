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

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * A "Fixbetrag"-Mietgarantie-Eintrag covers exactly [date, income_period_end_date] —
 * that range must line up with whatever status entry follows it, in both directions:
 * saving a Fixbetrag entry validates against an existing later entry, and saving any
 * entry validates against a preceding Fixbetrag entry. No next entry yet is allowed
 * (open period, resolved once one is added) — see docs/superpowers/specs/2026-09-14-mietgarantie-fixbetrag-design.md.
 */
async function assertFixedAmountPeriodConsistency(
  supabase: SupabaseClient,
  propertyId: string,
  date: string,
  isFixedAmount: boolean,
  periodEndDate: string | null,
  excludeId?: string
): Promise<void> {
  if (isFixedAmount && (!periodEndDate || periodEndDate < date)) {
    throw new Error('Das Enddatum des Fixbetrag-Zeitraums muss gesetzt sein und darf nicht vor dem Startdatum liegen.');
  }

  let query = supabase
    .from('status_entries')
    .select('id, date, income_is_fixed_amount, income_period_end_date')
    .eq('property_id', propertyId);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  if (isFixedAmount && periodEndDate) {
    const next = rows.filter((r) => r.date > date).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next && periodEndDate !== addDaysIso(next.date, -1)) {
      throw new Error(
        `Das Enddatum muss der Tag vor dem nächsten Statuswechsel (${next.date}) sein.`
      );
    }
  }

  const previous = rows.filter((r) => r.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (previous?.income_is_fixed_amount && previous.income_period_end_date !== addDaysIso(date, -1)) {
    throw new Error(
      `Der vorherige Fixbetrag-Eintrag endet am ${previous.income_period_end_date}, dieser Eintrag beginnt aber erst am ${date}. Bitte Datum oder Enddatum des Fixbetrag-Eintrags anpassen.`
    );
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
  await assertFixedAmountPeriodConsistency(
    supabase,
    propertyId,
    date,
    input.income_is_fixed_amount ?? false,
    input.income_period_end_date ?? null
  );

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
    await assertFixedAmountPeriodConsistency(
      supabase,
      propertyId,
      patch.date,
      patch.income_is_fixed_amount ?? false,
      patch.income_period_end_date ?? null,
      id
    );
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
