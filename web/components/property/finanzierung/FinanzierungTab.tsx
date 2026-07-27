import { formatCurrency, formatPercent } from '@/lib/formatters';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { FinancingOverviewResult, AmortizationYearTableResult } from '@/lib/data/propertyFinancing';

function monthYearLabel(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export function FinanzierungTab({
  overview,
  yearTable,
}: {
  overview: FinancingOverviewResult;
  yearTable: AmortizationYearTableResult;
}) {
  if (!overview.hasFinancing) {
    return (
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-sm text-text-secondary">Keine Finanzierung erfasst.</p>
        <p className="text-sm text-text-secondary">Finanzierungsdaten können im Immobiliendaten-Tab ergänzt werden.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-text-secondary">Darlehensbetrag</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.loanAmount)}</span>

          <span className="text-text-secondary">Restschuld (heute)</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.remainingDebtNow)}</span>

          <span className="text-text-secondary">Monatliche Rate</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.monthlyMortgage)}</span>

          <span className="text-text-secondary">Zinssatz</span>
          <span className="text-right text-text-primary">{formatPercent(overview.interestRate)}</span>

          <span className="text-text-secondary">Tilgungssatz</span>
          <span className="text-right text-text-primary">{formatPercent(overview.amortizationRate)}</span>

          <span className="text-text-secondary">Zinsbindung bis</span>
          <span className="text-right text-text-primary">
            {monthYearLabel(overview.fixedRateEndDate)} (noch {overview.yearsRemainingUntilFixedRateEnd}{' '}
            {overview.yearsRemainingUntilFixedRateEnd === 1 ? 'Jahr' : 'Jahre'})
          </span>

          <span className="text-text-secondary">Restschuld Zinsbindungsende</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.remainingDebtAtFixedRateEnd)}</span>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionLabel>Tilgungsplan</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-text-secondary">
                <th className="py-1.5">Jahr</th>
                <th className="py-1.5 text-right">Restschuld Anfang</th>
                <th className="py-1.5 text-right">Zinsen</th>
                <th className="py-1.5 text-right">Tilgung</th>
                <th className="py-1.5 text-right">Rate</th>
                <th className="py-1.5 text-right">Restschuld Ende</th>
              </tr>
            </thead>
            <tbody>
              {yearTable.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-black/[0.04] ${row.isFixedRateEndYear ? 'bg-blue-50/60' : ''} ${
                    row.isCurrentYear ? 'font-semibold' : ''
                  }`}
                >
                  <td className="py-1.5 text-text-primary">
                    {row.year}
                    {row.isFixedRateEndYear && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        Zinsbindungsende
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.remainingDebtStart)}</td>
                  <td className="py-1.5 text-right font-mono text-negative">{formatCurrency(row.interest)}</td>
                  <td className="py-1.5 text-right font-mono text-negative">{formatCurrency(row.principal)}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.payment)}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.remainingDebtEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {yearTable.rows.some((row) => row.isPostFixedRatePeriod) && (
          <p className="mt-3 text-xs text-warning">
            ⚠ Ab {monthYearLabel(overview.fixedRateEndDate)}: Anschlussfinanzierung noch offen — Konditionen können sich ändern.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
