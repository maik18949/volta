// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PropertyHeaderCard } from '@/components/property/overview/PropertyHeaderCard';
import type { Database } from '@/lib/supabase/types';

afterEach(cleanup);

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Johann-Meyer-Straße 7b',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01097',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: 1996,
    notes: '',
    living_area_sqm: 76.41,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 2,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'tiefgarage',
    parking_count: 1,
    heating_type: 'gas',
    energy_efficiency_class: 'd',
    condition: 'gepflegt',
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: 263_600,
    purchase_price_parking: 15_000,
    land_transfer_tax: 15_323,
    notary_costs: 3_631.96,
    land_registry_costs: 1_180,
    agent_fee: 0,
    appraisal_costs: 0,
    renovation_modernization_costs: 0,
    renovation_afa_eligible: 0,
    cold_rent_monthly: 950,
    warmmiete_monthly: null,
    parking_rent_monthly: 48,
    other_income_monthly: 0,
    vacancy_rate_assumption: 0.03,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: 417,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: 292,
    hoa_fee_maintenance_reserve_monthly: 34.76,
    property_tax_annual: 205,
    property_management_annual: 396,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: 230_000,
    interest_rate: 0.043,
    amortization_rate: 0.01,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: 1_242.85,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: 50_600,
    building_value: 228_000,
    depreciation_rate: 0.0384,
    marginal_tax_rate: 0.42,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PropertyHeaderCard', () => {
  it('renders the address and all object data fields', () => {
    render(<PropertyHeaderCard property={makeProperty()} purchasePricePerSqm={3_646.12} photos={[]} />);
    expect(screen.getByText('Johann-Meyer-Straße 7b, 01097 Dresden')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();
    expect(screen.getByText('1996')).toBeInTheDocument();
    expect(screen.getByText('Gepflegt')).toBeInTheDocument();
    expect(screen.getByText('Gas')).toBeInTheDocument();
    expect(screen.getByText('Tiefgarage')).toBeInTheDocument();
  });

  it('renders the photo placeholder (no <img>) when there are no photos', () => {
    const { container } = render(<PropertyHeaderCard property={makeProperty()} purchasePricePerSqm={3_646.12} photos={[]} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
