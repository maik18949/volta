import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TaxCurrentYearResult } from '@/lib/data/propertyTax';

export function CurrentYearSection({
  result,
  hasParking,
  economicTransferDate,
}: {
  result: TaxCurrentYearResult;
  hasParking: boolean;
  economicTransferDate: Date;
}) {
  const { lineItems } = result;
  const effectColor = result.taxEffectMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-text-secondary">Laufendes Jahr {result.year}</h2>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Ist</span>
      </div>

      {result.transferInFuture && (
        <p className="mb-2 text-xs text-text-dim">Besitzübergang am {formatDate(economicTransferDate)} — Werte ab diesem Datum.</p>
      )}

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
      {lineItems.extraordinaryCostsDeductible > 0 && (
        <Row label="Außergewöhnliche Kosten" value={-lineItems.extraordinaryCostsDeductible} />
      )}

      <div className="mt-2 border-t border-blue-200 pt-2" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>Steuerliches Ergebnis</span>
        <span className="font-mono">{formatCurrency(lineItems.taxableIncome)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${effectColor}`}>
        <span>Steuereffekt / Mon</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>

      {result.hoaUnitSplitWarning && (
        <p className="mt-2 text-xs text-warning">⚠ Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Einstellungen)</p>
      )}
      {result.hoaParkingSplitWarning && (
        <p className="text-xs text-warning">⚠ Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Einstellungen)</p>
      )}
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
