import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { DisbursementList } from './DisbursementList';
import type { FinancingOverviewResult, AmortizationYearTableResult } from '@/lib/data/propertyFinancing';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

const TH = 'border-b-2 border-black/[0.07] px-2 py-2 text-[11px] font-bold uppercase tracking-[0.4px] text-text-dim';
const TD = 'border-t border-black/[0.05] px-2 py-2 font-mono';

function monthYearLabel(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export function FinanzierungTab({
  overview,
  yearTable,
  propertyId,
  disbursements,
}: {
  overview: FinancingOverviewResult;
  yearTable: AmortizationYearTableResult;
  propertyId: string;
  disbursements: LoanDisbursementRow[];
}) {
  if (!overview.hasFinancing) {
    return (
      <Card className="py-[18px]">
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-[13px] text-text-secondary">Keine Finanzierung erfasst.</p>
        <p className="text-[13px] text-text-secondary">Finanzierungsdaten können im Immobiliendaten-Tab ergänzt werden.</p>
      </Card>
    );
  }

  const years = overview.yearsRemainingUntilFixedRateEnd;

  return (
    <div className="flex flex-col gap-4">
      <Card className="py-[18px]">
        <SectionLabel>Finanzierung</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3">
          <Stat label="Darlehensbetrag" value={formatCurrency(overview.loanAmount)} />
          <Stat label="Restschuld (heute)" value={formatCurrency(overview.remainingDebtNow)} />
          <Stat label="Monatliche Rate" value={formatCurrency(overview.monthlyMortgage)} />
          <Stat label="Zinssatz" value={formatPercent(overview.interestRate)} />
          <Stat label="Tilgungssatz" value={formatPercent(overview.amortizationRate)} />
          <Stat
            label="Zinsbindung bis"
            value={
              <>
                {monthYearLabel(overview.fixedRateEndDate)}{' '}
                <span className="text-[11px] font-normal text-text-secondary">
                  (noch {years} {years === 1 ? 'Jahr' : 'Jahre'})
                </span>
              </>
            }
          />
          <Stat label="Restschuld Zinsbindungsende" value={formatCurrency(overview.remainingDebtAtFixedRateEnd)} />
        </div>
      </Card>

      <Card className="py-[18px]">
        <DisbursementList propertyId={propertyId} disbursements={disbursements} />
      </Card>

      <Card className="py-[18px]">
        <SectionLabel>Tilgungsplan</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px] tabular-nums">
            <thead>
              <tr>
                <th className={`${TH} text-left`}>Jahr</th>
                <th className={`${TH} text-right`}>Restschuld Anfang</th>
                <th className={`${TH} text-right`}>Zinsen</th>
                <th className={`${TH} text-right`}>Tilgung</th>
                <th className={`${TH} text-right`}>Rate</th>
                <th className={`${TH} text-right`}>Restschuld Ende</th>
              </tr>
            </thead>
            <tbody>
              {yearTable.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`${row.isFixedRateEndYear ? '[&>td]:bg-accent/[0.07]' : ''} ${row.isCurrentYear ? 'font-bold' : ''}`}
                >
                  <td className="border-t border-black/[0.05] px-2 py-2 text-text-primary">
                    <span className="inline-flex items-center gap-2">
                      {row.year}
                      {row.isFixedRateEndYear && (
                        <span className="rounded bg-accent/[0.12] px-1.5 py-0.5 text-[11px] font-bold text-section-label">Zinsbindungsende</span>
                      )}
                    </span>
                  </td>
                  <td className={`${TD} text-right`}>{formatCurrency(row.remainingDebtStart)}</td>
                  <td className={`${TD} text-right text-negative`}>{formatCurrency(row.interest)}</td>
                  <td className={`${TD} text-right text-negative`}>{formatCurrency(row.principal)}</td>
                  <td className={`${TD} text-right`}>{formatCurrency(row.payment)}</td>
                  <td className={`${TD} text-right`}>{formatCurrency(row.remainingDebtEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {yearTable.rows.some((row) => row.isPostFixedRatePeriod) && (
          <p className="mt-3 text-[13px] font-medium text-warning">
            ⚠ Ab {monthYearLabel(overview.fixedRateEndDate)}: Anschlussfinanzierung noch offen — Konditionen können sich ändern.
          </p>
        )}
      </Card>
    </div>
  );
}
