import { formatCurrency } from '@/lib/formatters';
import type { CashflowForecastMonthResult } from '@/lib/data/propertyCashflow';

export function ForecastMonthCard({ result, hasParking }: { result: CashflowForecastMonthResult; hasParking: boolean }) {
  const { lineItems } = result;
  const cfColor = result.cashflowAfterTax >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <Row label="Einnahmen" value={lineItems.income} />
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

      <SectionDivider label="Zusammenfassung" />
      <div className="flex justify-between border-t border-black/[0.06] pt-1.5 font-bold text-text-primary">
        <span>CF vor Steuern</span>
        <span className="font-mono">{formatCurrency(lineItems.cashflowBeforeTax)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text-secondary">Steuereffekt</span>
        <span className="font-mono text-accent">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>
      <div className={`flex justify-between border-t border-black/[0.06] pt-1.5 text-[18px] font-extrabold ${cfColor}`}>
        <span>CF nach Steuern</span>
        <span className="font-mono">{formatCurrency(result.cashflowAfterTax)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary">{formatCurrency(value)}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">{label}</p>;
}
