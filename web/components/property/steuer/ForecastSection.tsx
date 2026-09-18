import type { TaxForecastYearResult } from '@/lib/data/propertyTax';
import { TaxResultFooter, TaxRow, TaxSectionDivider } from './TaxRows';

export function ForecastSection({ result, hasParking }: { result: TaxForecastYearResult; hasParking: boolean }) {
  const { lineItems } = result;

  return (
    <div className="flex flex-1 flex-col">
      <div>
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
      </div>

      <TaxResultFooter resultLabel="Steuerliches Ergebnis (Prog.)" taxableIncome={lineItems.taxableIncome} taxEffectMonthly={result.taxEffectMonthly} />
    </div>
  );
}
