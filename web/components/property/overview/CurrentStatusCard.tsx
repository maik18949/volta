import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';

/** Sign-based text color; zero stays neutral so "0,00 €" doesn't read as a loss. */
function signColor(value: number): string {
  const rounded = Math.round(value * 100);
  if (rounded === 0) return 'text-text-primary';
  return rounded > 0 ? 'text-positive' : 'text-negative';
}

function MainRow({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  );
}

function SubRows({ rows }: { rows: Array<{ label: string; value: number }> }) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-1.5 mt-0.5 flex flex-col gap-0.5 border-l-2 border-black/[0.06] pl-3">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between py-[3px] text-[13px] text-text-secondary">
          <span>{row.label}</span>
          <span className="tabular-nums">{formatCurrency(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CurrentStatusCard({
  propertyId,
  summary,
  monthlyMortgage,
  hasParking,
  hasStatusHistory,
  latestStatusDate,
}: {
  propertyId: string;
  summary: PropertySummary;
  monthlyMortgage: number;
  hasParking: boolean;
  hasStatusHistory: boolean;
  latestStatusDate: Date | null;
}) {
  const runningCostsMonthly = summary.runningCostsBreakdown.reduce((sum, item) => sum + item.amountMonthly, 0);
  const incomeRows = hasParking
    ? [
        { label: 'Wohnung', value: summary.incomeWohnungMonthly },
        { label: 'Stellplatz', value: summary.incomeStellplatzMonthly },
      ]
    : [];

  return (
    <Card className="flex flex-col">
      <SectionLabel>Aktueller Stand</SectionLabel>

      <div className="mb-3.5 flex items-center gap-2.5">
        <StatusBadge status={summary.currentStatus} />
        {latestStatusDate && <span className="text-[13px] text-text-secondary">seit {formatDate(latestStatusDate)}</span>}
      </div>

      {!hasStatusHistory ? (
        <div className="space-y-2">
          <p className="text-[13px] text-text-secondary">Noch kein Status vorhanden.</p>
          <Link href={`/properties/${propertyId}/verlauf`} className="text-[13px] font-semibold text-accent hover:underline">
            + Ersten Status hinzufügen
          </Link>
        </div>
      ) : (
        <>
          <MainRow label="Einnahmen" value={formatCurrency(summary.incomeActualMonthly)} valueClassName={signColor(summary.incomeActualMonthly)} />
          <SubRows rows={incomeRows} />
          <MainRow label="Kreditrate" value={formatCurrency(-monthlyMortgage)} valueClassName={signColor(-monthlyMortgage)} />
          <MainRow label="Laufende Kosten" value={formatCurrency(-runningCostsMonthly)} valueClassName={signColor(-runningCostsMonthly)} />
          <SubRows rows={summary.runningCostsBreakdown.map((item) => ({ label: item.label, value: -item.amountMonthly }))} />

          <div className="mt-auto">
            <div className="my-1.5 h-px bg-black/[0.07]" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[13px] font-bold text-text-primary">Cashflow vor Steuern</span>
              <span className={`text-[15px] font-extrabold tabular-nums ${signColor(summary.cashflowBeforeTaxMonthly)}`}>
                {formatCurrency(summary.cashflowBeforeTaxMonthly)}
              </span>
            </div>
            <MainRow label="Steuereffekt (Ø monatl.)" value={formatCurrency(summary.taxEffectMonthly)} valueClassName="text-accent" />
            <div className="my-2.5 h-[1.5px] bg-gradient-to-r from-accent/30 to-transparent" />
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] font-bold text-text-primary">Cashflow nach Steuern</span>
              <span className={`text-[22px] font-extrabold tracking-[-0.5px] tabular-nums ${signColor(summary.cashflowAfterTaxMonthly)}`}>
                {formatCurrency(summary.cashflowAfterTaxMonthly)}
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
