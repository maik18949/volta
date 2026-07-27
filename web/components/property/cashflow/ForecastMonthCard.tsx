import { formatCurrency } from '@/lib/formatters';
import type { CashflowForecastMonthResult } from '@/lib/data/propertyCashflow';

export function ForecastMonthCard({ result, hasParking }: { result: CashflowForecastMonthResult; hasParking: boolean }) {
  const { lineItems } = result;
  const cfColor = result.cashflowAfterTax >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <Row label="Einnahmen" value={lineItems.income} positive />
      <Row label="Kreditrate" value={-lineItems.mortgage} />
      <SectionDivider label="Kosten Wohnung" />
      <Row label="Nicht umlagef. HG" value={-lineItems.hoaNonRecoverableWE} />
      <Row label="Instandhaltungsrücklage WE" value={-lineItems.maintenanceReserveWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Verwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagef. Kosten WE" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer WE" value={-lineItems.propertyTaxWE} />}
      {hasParking && (
        <>
          <SectionDivider label="Kosten Stellplatz" />
          <Row label="Nicht umlagef. HG TE" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Instandhaltungsrücklage TE" value={-lineItems.maintenanceReserveTE} />
          <Row label="Umlagef. Kosten TE" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer TE" value={-lineItems.propertyTaxTE} />
        </>
      )}
      <SectionDivider label="Zusammenfassung" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>CF vor Steuern</span>
        <span className="font-mono">{formatCurrency(lineItems.cashflowBeforeTax)}</span>
      </div>
      <div className="flex justify-between text-accent">
        <span>Steuereffekt</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${cfColor}`}>
        <span>CF nach Steuern</span>
        <span className="font-mono">{formatCurrency(result.cashflowAfterTax)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${positive ? 'text-positive' : 'text-negative'}`}>
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">{label}</p>;
}
