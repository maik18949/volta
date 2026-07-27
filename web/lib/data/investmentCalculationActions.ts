'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/supabase/types';

export async function createInvestmentCalculation(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data, error } = await supabase
    .from('investment_calculations')
    .insert({ user_id: user.id, name: 'Neuer Kaufkandidat' })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/investment-calculator');
  return data.id;
}

export async function updateInvestmentCalculation(id: string, patch: TablesUpdate<'investment_calculations'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('investment_calculations').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath('/investment-calculator');
  revalidatePath(`/investment-calculator/${id}`);
}

export async function deleteInvestmentCalculation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('investment_calculations').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/investment-calculator');
}

/**
 * Copies a calculation's fields into a new `properties` row (real
 * Stammdaten/Objektdaten fields not covered by the calculation keep the
 * `properties` table's own column defaults) and marks the calculation as
 * promoted. Redirects straight to the new property's detail page.
 */
export async function promoteInvestmentCalculation(id: string): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: calc, error: calcError } = await supabase.from('investment_calculations').select('*').eq('id', id).single();
  if (calcError) throw calcError;

  const today = new Date().toISOString().slice(0, 10);

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      user_id: user.id,
      name: calc.name,
      purchase_date: today,
      economic_transfer_date: today,
      loan_start_date: today,
      purchase_price_unit: calc.purchase_price_unit,
      purchase_price_parking: calc.purchase_price_parking,
      land_transfer_tax: calc.land_transfer_tax,
      notary_costs: calc.notary_costs,
      land_registry_costs: calc.land_registry_costs,
      agent_fee: calc.agent_fee,
      appraisal_costs: calc.appraisal_costs,
      renovation_modernization_costs: calc.renovation_modernization_costs,
      renovation_afa_eligible: calc.renovation_afa_eligible,
      cold_rent_monthly: calc.cold_rent_monthly,
      parking_rent_monthly: calc.parking_rent_monthly,
      other_income_monthly: calc.other_income_monthly,
      vacancy_rate_assumption: calc.vacancy_rate_assumption,
      loan_amount: calc.loan_amount,
      interest_rate: calc.interest_rate,
      amortization_rate: calc.amortization_rate,
      monthly_mortgage: calc.monthly_mortgage,
      hoa_fee_total_monthly: calc.hoa_fee_total_monthly,
      hoa_fee_recoverable_monthly: calc.hoa_fee_recoverable_monthly,
      hoa_fee_maintenance_reserve_monthly: calc.hoa_fee_maintenance_reserve_monthly,
      property_management_annual: calc.property_management_annual,
      property_insurance_annual: calc.property_insurance_annual,
      other_costs_monthly: calc.other_costs_monthly,
      building_value: calc.building_value,
      depreciation_rate: calc.depreciation_rate,
      marginal_tax_rate: calc.marginal_tax_rate,
    })
    .select('id')
    .single();
  if (propertyError) throw propertyError;

  const { error: updateError } = await supabase
    .from('investment_calculations')
    .update({ is_promoted: true, promoted_property_id: property.id, promoted_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) throw updateError;

  revalidatePath('/');
  revalidatePath('/investment-calculator');
  redirect(`/properties/${property.id}`);
}
