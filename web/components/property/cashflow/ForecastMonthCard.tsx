import Link from 'next/link';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { CashflowForecastMonthResult } from '@/lib/data/propertyCashflow';

/** Sign-based text color; zero stays neutral so "0,00 €" doesn't read as a loss. */
function signColor(value: number): string {
  const rounded = Math.round(value * 100);
  if (rounded === 0) return 'text-text-primary';
  return rounded > 0 ? 'text-positive' : 'text-negative';
}

export function ForecastMonthCard({
  result,
  hasParking,
  quote,
  steuerHref,
}: {
  result: CashflowForecastMonthResult;
  hasParking: boolean;
  quote: number;
  steuerHref: string;
}) {
  const { lineItems } = result;

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-accent/[0.06] px-3.5 py-2.5">
        <p className="text-[13px] text-text-secondary">
          Leerstandsquote <span className="ml-1.5 font-mono text-[15px] font-bold text-accent">{formatPercent(quote / 100)}</span>
        </p>
        <Link href={steuerHref} className="text-[13px] font-semibold text-accent underline underline-offset-2">
          im Steuer-Tab anpassen →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>
          <Row label="Einnahmen" value={lineItems.incomeWE + lineItems.incomeTE} />
          <Row label="Kreditrate" value={-lineItems.mortgage} />

          <SectionDivider label="Kosten Wohnung" />
          <Row label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableWE} />
          <Row label="Instandhaltungsrücklage" value={-lineItems.maintenanceReserveWE} />
          {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
          <Row label="Verwaltung" value={-lineItems.managementWE} />
          {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
          {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableWE} />}
          {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer" value={-lineItems.propertyTaxWE} />}

          {hasParking && (
            <>
              <SectionDivider label="Kosten Stellplatz" />
              <Row label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableTE} />
              <Row label="Instandhaltungsrücklage" value={-lineItems.maintenanceReserveTE} />
              <Row label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableTE} />
              <Row label="Grundsteuer" value={-lineItems.propertyTaxTE} />
            </>
          )}
        </div>

        <div className="flex flex-col justify-end">
          <SectionDivider label="Zusammenfassung" />
          <div className="flex items-center justify-between border-t border-black/[0.07] py-2">
            <span className="text-[13px] font-bold text-text-primary">CF vor Steuern</span>
            <span className={`text-[15px] font-extrabold tabular-nums ${signColor(lineItems.cashflowBeforeTax)}`}>
              {formatCurrency(lineItems.cashflowBeforeTax)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] text-text-secondary">Steuereffekt</span>
            <span className="text-[13px] font-semibold tabular-nums text-accent">{formatCurrency(result.taxEffectMonthly)}</span>
          </div>
          <div className="my-1.5 h-[1.5px] bg-gradient-to-r from-accent/30 to-transparent" />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] font-bold text-text-primary">CF nach Steuern</span>
            <span className={`text-[22px] font-extrabold tracking-[-0.5px] tabular-nums ${signColor(result.cashflowAfterTax)}`}>
              {formatCurrency(result.cashflowAfterTax)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-[5px]">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${signColor(value)}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <p className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.4px] text-text-secondary">{label}</p>;
}
