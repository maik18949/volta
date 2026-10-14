'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { PercentField } from '@/components/ui/PercentField';
import { SelectField } from '@/components/ui/SelectField';
import { CalcSummary, FormCard, FormGrid, FormHint, FormSection, FormWarning } from '@/components/ui/FormLayout';
import { afaBasis, valuationDeviation } from '@/lib/calculations/depreciationCalculator';
import {
  degressiveEligibilityWarning,
  depreciationForYear,
  parseDepreciationMethod,
  type DepreciationPlanInput,
} from '@/lib/calculations/depreciationSchedule';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import { BuildingShareFields } from '@/components/wizard/BuildingShareFields';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

const DEFAULT_LINEAR_RATE_NEUBAU = 0.03;

const METHOD_OPTIONS = [
  ['linear', 'Linear'],
  ['degressiv_5a', 'Degressiv 5 %'],
] as const;

function toUtcDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? null : date;
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
  const { control, register, setValue } = useFormContext<WizardFormValues>();
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
  const sumDeviation = valuationDeviation(buildingValue, landValue, purchasePrice);

  const method = parseDepreciationMethod(values.depreciationMethod ?? 'linear');
  const isDegressive = method === 'degressiv_5a';
  const transferDate = toUtcDate(values.economicTransferDate);
  const purchaseDate = toUtcDate(values.purchaseDate);
  const switchYear =
    typeof values.degressiveSwitchYear === 'number' && !Number.isNaN(values.degressiveSwitchYear) ? values.degressiveSwitchYear : null;
  const yearBuilt = typeof values.yearBuilt === 'number' && !Number.isNaN(values.yearBuilt) ? values.yearBuilt : null;

  const plan: DepreciationPlanInput | null = transferDate
    ? { basis, method, linearRate: depreciationRate, economicTransferDate: transferDate, switchYear }
    : null;
  const startYear = transferDate ? transferDate.getUTCFullYear() : null;
  const firstYear = plan && startYear !== null ? depreciationForYear(plan, startYear) : null;
  const secondYear = plan && startYear !== null ? depreciationForYear(plan, startYear + 1) : null;

  const eligibilityWarning =
    isDegressive && transferDate && purchaseDate
      ? degressiveEligibilityWarning({ yearBuilt, purchaseDate, economicTransferDate: transferDate })
      : null;

  const months = transferDate ? 13 - (transferDate.getUTCMonth() + 1) : 0;
  const summaryRows =
    startYear !== null && firstYear && secondYear
      ? [
          { label: 'AfA-Bemessungsgrundlage', value: formatCurrency(basis) },
          { label: `AfA ${startYear} (${months} Monate)`, value: formatCurrency(firstYear.amount) },
          { label: `AfA ${startYear + 1}`, value: formatCurrency(secondYear.amount) },
          { label: `Restwert Ende ${startYear + 1}`, value: formatCurrency(secondYear.bookValueEnd) },
        ]
      : [{ label: 'AfA-Bemessungsgrundlage', value: formatCurrency(basis) }];

  return (
    <FormSection>
      <FormHint>
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (<BerechnungshilfeLink />) und sollten sich zum Kaufpreis
        addieren (Toleranz ±5 %).
      </FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="AfA & Steuer">
          <FormGrid>
            <BuildingShareFields
              purchasePrice={purchasePrice}
              buildingLabel={<>Gebäudewert (<BerechnungshilfeLink />)</>}
              landLabel={<>Grundstückswert (<BerechnungshilfeLink />)</>}
            />
            <SelectField
              label="AfA-Methode"
              name="depreciationMethod"
              register={register}
              options={METHOD_OPTIONS}
              registerOptions={{
                onChange: (event) => {
                  if (event.target.value === 'degressiv_5a') setValue('depreciationRate', DEFAULT_LINEAR_RATE_NEUBAU);
                },
              }}
            />
            {!isDegressive && (
              <PercentField
                label="AfA-Satz"
                name="depreciationRate"
                control={control}
                required
                hint="2 % ab 1925 · 2,5 % vor 1925 · 3 % Neubau ab 2023"
              />
            )}
            <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />
            {isDegressive && eligibilityWarning && (
              <div className="sm:col-span-2">
                <FormWarning>⚠ {eligibilityWarning}</FormWarning>
              </div>
            )}
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
          rows={summaryRows}
          total={
            secondYear && startYear !== null
              ? { label: `AfA / Monat (${startYear + 1})`, value: formatCurrency(secondYear.amount / 12) }
              : undefined
          }
        />
      </div>
    </FormSection>
  );
}
