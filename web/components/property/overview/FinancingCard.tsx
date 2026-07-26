import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
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
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-sm text-text-secondary">Keine Finanzierung erfasst.</p>
      </GlassCard>
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
    <GlassCard>
      <SectionLabel>Finanzierung</SectionLabel>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Darlehensbetrag</span>
        <span className="text-right text-text-primary">{formatCurrency(property.loan_amount)}</span>

        <span className="text-text-secondary">Restschuld (heute)</span>
        <span className="text-right text-text-primary">{formatCurrency(remainingDebtNow)}</span>

        <span className="text-text-secondary">Monatliche Rate</span>
        <span className="text-right text-text-primary">{formatCurrency(property.monthly_mortgage)}</span>

        <span className="text-text-secondary">Zinssatz</span>
        <span className="text-right text-text-primary">{formatPercent(property.interest_rate)}</span>

        <span className="text-text-secondary">Tilgungssatz</span>
        <span className="text-right text-text-primary">{formatPercent(property.amortization_rate)}</span>

        <span className="text-text-secondary">Zinsbindung bis</span>
        <span className="text-right text-text-primary">
          {fixedUntilLabel} (noch {yearsRemaining} {yearsRemaining === 1 ? 'Jahr' : 'Jahre'})
        </span>
      </div>
    </GlassCard>
  );
}
