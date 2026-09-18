'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection, type CalcSummaryRow } from '@/components/ui/FormLayout';
import { grossYield } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepEinnahmen() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const values = useWatch({ control });

  const coldRentMonthly = safeNum(values.coldRentMonthly);
  const parkingRentMonthly = parkingType !== 'nicht_vorhanden' ? safeNum(values.parkingRentMonthly) : 0;
  const purchasePrice =
    safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const coldRentYearly = coldRentMonthly * 12;
  const warmmieteYearly =
    typeof values.warmmieteMonthly === 'number' && !Number.isNaN(values.warmmieteMonthly)
      ? values.warmmieteMonthly * 12
      : null;
  const coldRentYearlyInclParking = (coldRentMonthly + parkingRentMonthly) * 12;
  const warmmieteYearlyInclParking = warmmieteYearly !== null ? warmmieteYearly + parkingRentMonthly * 12 : null;
  const yieldValue = grossYield(coldRentYearly, parkingRentMonthly * 12, purchasePrice);

  const rows: CalcSummaryRow[] = [{ label: 'Nettomiete / Jahr', value: formatCurrency(coldRentYearly) }];
  if (warmmieteYearly !== null) rows.push({ label: 'Bruttomiete / Jahr', value: formatCurrency(warmmieteYearly) });
  if (parkingRentMonthly > 0) {
    rows.push({ label: 'Nettomiete inkl. Stellplatz / Jahr', value: formatCurrency(coldRentYearlyInclParking) });
    if (warmmieteYearlyInclParking !== null) {
      rows.push({ label: 'Bruttomiete inkl. Stellplatz / Jahr', value: formatCurrency(warmmieteYearlyInclParking) });
    }
  }

  return (
    <FormSection>
      <FormHint>Prognose-Einnahmen bei Vollvermietung. Die Nettokaltmiete ist Pflicht — sie ist Basis aller Rendite-KPIs.</FormHint>

      <FormCard title="Einnahmen">
        <FormGrid>
          <CurrencyField label="Nettomiete / Monat" name="coldRentMonthly" register={register} required />
          {parkingType !== 'nicht_vorhanden' && <CurrencyField label="Stellplatzmiete / Monat" name="parkingRentMonthly" register={register} />}
          <CurrencyField label="Bruttomiete / Monat" name="warmmieteMonthly" register={register} hint="optional (Warmmiete inkl. NK)" />
          <CurrencyField label="Sonstige Einnahmen / Monat" name="otherIncomeMonthly" register={register} />
        </FormGrid>
      </FormCard>

      <CalcSummary rows={rows} total={yieldValue !== null ? { label: 'Bruttorendite', value: formatPercent(yieldValue) } : undefined} />
    </FormSection>
  );
}
