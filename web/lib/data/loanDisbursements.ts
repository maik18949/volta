import type { Database } from '@/lib/supabase/types';
import type { LoanDisbursement } from '@/lib/calculations/amortizationCalculator';

export type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

/** Maps DB rows (string date, is_deductible) to the calculation layer's LoanDisbursement[] (Date, deductible). */
export function toLoanDisbursements(rows: LoanDisbursementRow[]): LoanDisbursement[] {
  return rows.map((row) => ({
    date: new Date(row.date + 'T00:00:00Z'),
    amount: row.amount,
    deductible: row.is_deductible,
  }));
}
