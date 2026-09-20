'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection, FormWarning } from '@/components/ui/FormLayout';
import { afaBasis, depreciationYearly, depreciationMonthly, valuationDeviation } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

const BERECHNUNGSHILFE_URL =
  'https://www.bundesfinanzministerium.de/Datenportal/Daten/frei-nutzbare-produkte/Anwendungen/Kaufpreisaufteilung-Grundstuecke/Kaufpreisaufteilung-Grundstuecke.html';

function BerechnungshilfeLink() {
  return (
    <a
      href={BERECHNUNGSHILFE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      Berechnungshilfe
    </a>
  );
}

export function StepAfaSteuer() {
  const { register, control } = useFormContext<WizardFormValues>();
  const values = useWatch({ control });

  const parkingType = values.parkingType ?? 'nicht_vorhanden';
  const purchasePrice = safeNum(values.purchasePriceUnit) + (parkingType !== 'nicht_vorhanden' ? safeNum(values.purchasePriceParking) : 0);
  const closingCosts = closingCostsTotal(
    safeNum(values.landTransferTax),
    safeNum(values.notaryCosts),
    safeNum(values.landRegistryCosts),
    safeNum(values.agentFee),
    safeNum(values.appraisalCosts)
  );
  const buildingValue = safeNum(values.buildingValue);
  const landValue = safeNum(values.landValue);
  const depreciationRate = safeNum(values.depreciationRate);

  const basis = afaBasis(buildingValue, closingCosts, purchasePrice, safeNum(values.renovationAfaEligible));
  const yearly = depreciationYearly(basis, depreciationRate);
  const monthly = depreciationMonthly(basis, depreciationRate);

  const sumDeviation = valuationDeviation(buildingValue, landValue, purchasePrice);

  return (
    <FormSection>
      <FormHint>
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (<BerechnungshilfeLink />) und sollten sich zum Kaufpreis
        addieren (Toleranz ±5 %).
      </FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="AfA & Steuer">
          <FormGrid>
            <CurrencyField
              label={<>Gebäudewert (<BerechnungshilfeLink />)</>}
              name="buildingValue"
              register={register}
              required
            />
            <CurrencyField
              label={<>Grundstückswert (<BerechnungshilfeLink />)</>}
              name="landValue"
              register={register}
              required
            />
            <PercentField label="AfA-Satz" name="depreciationRate" control={control} required hint="2 % ab 1925 · 2,5 % vor 1925 · 3 % Neubau ab 2023" />
            <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />
            {sumDeviation > 0.05 && (
              <div className="sm:col-span-2">
                <FormWarning>
                  ⚠ Gebäude + Grundstück ({formatCurrency(buildingValue + landValue)}) weicht {(sumDeviation * 100).toFixed(1)} % vom
                  Kaufpreis ab — Werte aus der Berechnungshilfe prüfen.
                </FormWarning>
              </div>
            )}
          </FormGrid>
        </FormCard>

        <CalcSummary
          className="self-start"
          rows={[
            { label: 'AfA-Bemessungsgrundlage', value: formatCurrency(basis) },
            { label: 'AfA / Jahr', value: formatCurrency(yearly) },
          ]}
          total={{ label: 'AfA / Monat', value: formatCurrency(monthly) }}
        />
      </div>
    </FormSection>
  );
}
