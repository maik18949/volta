import { formatCurrency } from '@/lib/formatters';
import type { TaxForecastYearResult } from '@/lib/data/propertyTax';

export function ForecastSection({ result, hasParking }: { result: TaxForecastYearResult; hasParking: boolean }) {
  const { lineItems } = result;
  const effectColor = result.taxEffectMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <Row label="Einnahmen" value={lineItems.income} positive />
      <Row label="Zinsen" value={-lineItems.interest} />
      <Row label="AfA" value={-lineItems.depreciation} />
      <Row label="Nicht umlagef. Kosten Wohnung" value={-lineItems.hoaNonRecoverableWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Hausverwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagef. Kosten Wohnung" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer Wohnung" value={-lineItems.propertyTaxWE} />}
      {hasParking && (
        <>
          <Row label="Nicht umlagef. Kosten Stellplatz" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Umlagef. Kosten Stellplatz" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer Stellplatz" value={-lineItems.propertyTaxTE} />
        </>
      )}

      <div className="mt-2 border-t border-blue-200 pt-2" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>Steuerliches Ergebnis (Prog.)</span>
        <span className="font-mono">{formatCurrency(lineItems.taxableIncome)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${effectColor}`}>
        <span>Steuereffekt / Mon</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
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
