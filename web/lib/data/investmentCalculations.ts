import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type InvestmentCalculationRow = Database['public']['Tables']['investment_calculations']['Row'];

/** Fetches all investment calculations for the signed-in user (RLS-scoped), newest-updated first. */
export async function getInvestmentCalculations(): Promise<InvestmentCalculationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('investment_calculations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Fetches a single investment calculation by id (RLS-scoped), or null if not found. */
export const getInvestmentCalculation = cache(async (id: string): Promise<InvestmentCalculationRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('investment_calculations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
});
