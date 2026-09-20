import { formatDate } from '@/lib/formatters';
import type { TaxCurrentYearResult } from '@/lib/data/propertyTax';
import { TaxResultFooter, TaxRow, TaxSectionDivider } from './TaxRows';

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

  return (
    <div className="flex flex-1 flex-col">
      <div>
        {result.transferInFuture && (
          <p className="mb-2 text-[13px] text-text-secondary">Besitzübergang am {formatDate(economicTransferDate)} — Werte ab diesem Datum.</p>
        )}

        <TaxRow label="Einnahmen" value={lineItems.income} positive />
        <TaxRow label="Zinsen" value={-lineItems.interest} />
        <TaxRow label="AfA" value={-lineItems.depreciation} />

        <TaxSectionDivider label="Kosten Wohnung" />
        <TaxRow label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableWE} />
        {lineItems.insuranceWE > 0 && <TaxRow label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
        <TaxRow label="Hausverwaltung" value={-lineItems.managementWE} />
        {lineItems.otherCostsWE > 0 && <TaxRow label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
        {lineItems.hoaRecoverableWE > 0 && <TaxRow label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableWE} />}
        {lineItems.propertyTaxWE > 0 && <TaxRow label="Grundsteuer" value={-lineItems.propertyTaxWE} />}

        {hasParking && (
          <>
            <TaxSectionDivider label="Kosten Stellplatz" />
            <TaxRow label="Nicht umlagefähige Kosten" value={-lineItems.hoaNonRecoverableTE} />
            <TaxRow label="Umlagefähige Kosten" value={-lineItems.hoaRecoverableTE} />
            <TaxRow label="Grundsteuer" value={-lineItems.propertyTaxTE} />
          </>
        )}
        {lineItems.extraordinaryCostsDeductible > 0 && (
          <TaxRow label="Außergewöhnliche Kosten" value={-lineItems.extraordinaryCostsDeductible} />
        )}
      </div>

      <TaxResultFooter resultLabel="Steuerliches Ergebnis" taxableIncome={lineItems.taxableIncome} taxEffectMonthly={result.taxEffectMonthly}>
        {result.hoaUnitSplitWarning && (
          <p className="mt-2 text-[13px] font-medium text-warning">⚠ Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Immobiliendaten)</p>
        )}
        {result.hoaParkingSplitWarning && (
          <p className="text-[13px] font-medium text-warning">⚠ Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Immobiliendaten)</p>
        )}
      </TaxResultFooter>
    </div>
  );
}
