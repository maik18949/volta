import { describe, it, expect } from 'vitest';
import { toLoanDisbursements } from '@/lib/data/loanDisbursements';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

function makeRow(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
  return {
    id: 'disb-1',
    property_id: 'prop-1',
    date: '2026-01-20',
    amount: 278_665.55,
    is_deductible: true,
    label: 'Hauptauszahlung',
    created_at: '2026-01-20T00:00:00Z',
    ...overrides,
  };
}

describe('toLoanDisbursements', () => {
  it('maps date/amount/is_deductible to the calculation-layer shape', () => {
    const [result] = toLoanDisbursements([makeRow()]);
    expect(result.date.toISOString().slice(0, 10)).toBe('2026-01-20');
    expect(result.amount).toBe(278_665.55);
    expect(result.deductible).toBe(true);
  });

  it('maps is_deductible: false to deductible: false', () => {
    const [result] = toLoanDisbursements([makeRow({ is_deductible: false })]);
    expect(result.deductible).toBe(false);
  });

  it('empty input maps to empty output', () => {
    expect(toLoanDisbursements([])).toEqual([]);
  });
});
