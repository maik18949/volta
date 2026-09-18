import { formatCurrency } from '@/lib/formatters';

/** Income green, non-zero costs red, zero neutral. */
function toneClass(value: number, positive: boolean): string {
  if (Math.round(value * 100) === 0) return 'text-text-primary';
  return positive ? 'text-positive' : 'text-negative';
}

export function TaxRow({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${toneClass(value, positive)}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export function TaxSectionDivider({ label }: { label: string }) {
  return <p className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.4px] text-text-secondary">{label}</p>;
}

/** Bottom block of both tax cards: "Steuerliches Ergebnis" + big "Steuereffekt / Mon". */
export function TaxResultFooter({
  resultLabel,
  taxableIncome,
  taxEffectMonthly,
  children,
}: {
  resultLabel: string;
  taxableIncome: number;
  taxEffectMonthly: number;
  children?: React.ReactNode;
}) {
  const effectColor = taxEffectMonthly >= 0 ? 'text-positive' : 'text-negative';
  return (
    <div className="mt-auto pt-3">
      <div className="mb-2 h-px bg-accent/25" />
      <div className="flex justify-between py-1">
        <span className="text-[13px] font-bold text-text-primary">{resultLabel}</span>
        <span className="text-[13px] font-extrabold tabular-nums text-text-primary">{formatCurrency(taxableIncome)}</span>
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="text-[13px] font-bold text-text-primary">Steuereffekt / Mon</span>
        <span className={`text-[22px] font-extrabold tracking-[-0.5px] tabular-nums ${effectColor}`}>{formatCurrency(taxEffectMonthly)}</span>
      </div>
      {children}
    </div>
  );
}
