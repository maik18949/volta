import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { addMonths, monthsBetween } from '@/lib/calculations/dateHelpers';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function FinancingCard({
  property,
  remainingDebtNow,
  today,
}: {
  property: PropertyRow;
  remainingDebtNow: number;
  today: Date;
}) {
  if (property.loan_amount <= 0) {
    return (
      <Card className="py-[18px]">
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-[13px] text-text-secondary">Keine Finanzierung erfasst.</p>
      </Card>
    );
  }

  const loanStart = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedUntil = addMonths(loanStart, property.fixed_interest_period_years * 12);
  // monthsBetween counts calendar months inclusively (e.g. Dec->Jan = 2), so
  // subtract 1 to get the actual elapsed-month duration between today and fixedUntil.
  const monthsRemaining = monthsBetween(today, fixedUntil) - 1;
  const yearsRemaining = Math.max(0, Math.floor(monthsRemaining / 12));
  const fixedUntilLabel = `${String(fixedUntil.getUTCMonth() + 1).padStart(2, '0')}/${fixedUntil.getUTCFullYear()}`;

  return (
    <Card className="py-[18px]">
      <SectionLabel>Finanzierung</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-5 gap-y-3">
        <Stat label="Darlehensbetrag" value={formatCurrency(property.loan_amount)} />
        <Stat label="Restschuld (heute)" value={formatCurrency(remainingDebtNow)} />
        <Stat label="Monatliche Rate" value={formatCurrency(property.monthly_mortgage)} />
        <Stat label="Zinssatz" value={formatPercent(property.interest_rate)} />
        <Stat label="Tilgungssatz" value={formatPercent(property.amortization_rate)} />
        <Stat
          label="Zinsbindung bis"
          value={
            <>
              {fixedUntilLabel}{' '}
              <span className="text-[11px] font-normal text-text-secondary">
                (noch {yearsRemaining} {yearsRemaining === 1 ? 'Jahr' : 'Jahre'})
              </span>
            </>
          }
        />
      </div>
    </Card>
  );
}
