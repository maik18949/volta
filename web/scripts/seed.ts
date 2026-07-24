// web/scripts/seed.ts — dev-only. Never run against production.
// Requires SUPABASE_SERVICE_ROLE_KEY and SEED_USER_EMAIL in web/.env.local — local-only,
// never commit these, never run with NODE_ENV=production.
// Not idempotent — running this twice fails on insert rather than creating a duplicate
// property. That's fine for a one-off dev seed.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seedUserEmail = process.env.SEED_USER_EMAIL;

  if (!url || !serviceRoleKey || !seedUserEmail) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SEED_USER_EMAIL in web/.env.local'
    );
  }

  const admin = createClient<Database>(url, serviceRoleKey);

  const {
    data: { users },
    error: listError,
  } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.find((u) => u.email === seedUserEmail);
  if (!user) {
    throw new Error(`No auth user found with email ${seedUserEmail} — sign in via Magic Link first.`);
  }

  const { data: property, error: insertError } = await admin
    .from('properties')
    .insert({
      user_id: user.id,
      name: 'ETW Dresden Neustadt',
      address: 'Dresdner Str. 12',
      city: 'Dresden',
      state: 'Sachsen',
      postal_code: '01099',
      property_type: 'apartment',
      acquisition_type: 'kauf',
      living_area_sqm: 68,
      rooms: 3,
      purchase_date: '2025-10-01',
      economic_transfer_date: '2026-02-01',
      purchase_price_unit: 263_600,
      purchase_price_parking: 15_000,
      land_transfer_tax: 15_323,
      notary_costs: 3_631.96,
      land_registry_costs: 1_180,
      cold_rent_monthly: 950,
      parking_rent_monthly: 48,
      vacancy_rate_assumption: 0.03,
      hoa_fee_total_monthly: 417,
      is_hoa_unit_split: true,
      hoa_fee_recoverable_monthly: 292,
      hoa_fee_maintenance_reserve_monthly: 34.76,
      property_tax_annual: 205,
      property_management_annual: 396,
      loan_amount: 230_000,
      interest_rate: 0.043,
      amortization_rate: 0.01,
      loan_start_date: '2025-10-01',
      monthly_mortgage: 1_242.85,
      land_value: 50_600,
      building_value: 228_000,
      depreciation_rate: 0.0384,
      marginal_tax_rate: 0.42,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  const { error: statusError } = await admin.from('status_entries').insert({
    property_id: property.id,
    date: '2026-02-01',
    status: 'vermietet',
  });

  if (statusError) throw statusError;

  console.log(`Seeded property ${property.id} for ${seedUserEmail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
