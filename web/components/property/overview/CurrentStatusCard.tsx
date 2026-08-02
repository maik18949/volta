import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';

export function CurrentStatusCard({
  propertyId,
  summary,
  monthlyMortgage,
  hasStatusHistory,
  latestStatusDate,
}: {
  propertyId: string;
  summary: PropertySummary;
  monthlyMortgage: number;
  hasStatusHistory: boolean;
  latestStatusDate: Date | null;
}) {
  const runningCostsMonthly = summary.runningCostsBreakdown.reduce((sum, item) => sum + item.amountMonthly, 0);
  const cashflowAfterColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <GlassCard>
      <SectionLabel>Aktueller Stand</SectionLabel>

      <div className="flex items-center gap-2">
        <StatusBadge status={summary.currentStatus} />
        {latestStatusDate && <span className="text-xs text-text-secondary">seit {formatDate(latestStatusDate)}</span>}
      </div>

      {!hasStatusHistory ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-text-secondary">Noch kein Status vorhanden.</p>
          <Link href={`/properties/${propertyId}/verlauf`} className="text-sm font-semibold text-accent hover:underline">
            + Ersten Status hinzufügen
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Einnahmen</span>
            <span className="text-text-primary">{formatCurrency(summary.incomeActualMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Kreditrate</span>
            <span className="text-text-primary">{formatCurrency(-monthlyMortgage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Laufende Kosten</span>
            <span className="text-text-primary">{formatCurrency(-runningCostsMonthly)}</span>
          </div>
          {summary.runningCostsBreakdown.map((item) => (
            <div key={item.label} className="flex justify-between border-l-2 border-black/[0.06] py-0.5 pl-2.5 text-xs text-text-secondary">
              <span>{item.label}</span>
              <span>{formatCurrency(-item.amountMonthly)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-black/[0.06] pt-1.5 font-bold">
            <span className="text-text-primary">Cashflow vor Steuern</span>
            <span className="text-text-primary">{formatCurrency(summary.cashflowBeforeTaxMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Steuereffekt (Ø monatl.)</span>
            <span className="text-accent">{formatCurrency(summary.taxEffectMonthly)}</span>
          </div>
          <div
            className={`flex justify-between border-t border-black/[0.06] pt-1.5 text-[18px] font-extrabold ${cashflowAfterColor}`}
          >
            <span>Cashflow nach Steuern</span>
            <span>{formatCurrency(summary.cashflowAfterTaxMonthly)}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
