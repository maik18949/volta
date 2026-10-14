'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { PercentField } from '@/components/ui/PercentField';
import { SelectField } from '@/components/ui/SelectField';
import { Card } from '@/components/ui/Card';
import { FormCard, FormGrid, FormHint, FormSection, FormWarning } from '@/components/ui/FormLayout';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { afaBasis, valuationDeviation } from '@/lib/calculations/depreciationCalculator';
import {
  degressiveEligibilityWarning,
  depreciationEndYear,
  depreciationForYear,
  parseDepreciationMethod,
  type DepreciationMethod,
  type DepreciationPlanInput,
} from '@/lib/calculations/depreciationSchedule';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency } from '@/lib/formatters';
import { BuildingShareFields } from '@/components/wizard/BuildingShareFields';
import { AfaFactRow, AfaFacts, AfaOutlookTable, type AfaOutlookRow } from '@/components/property/steuer/AfaParts';
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

function percentLabel(rate: number): string {
  return `${(rate * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;
}

interface AfaPreviewData {
  method: DepreciationMethod;
  linearRate: number;
  marginalTaxRate: number;
  basis: number;
  buildingValue: number;
  closingCostsShare: number;
  renovation: number;
  /** null, solange das Besitzübergangsdatum fehlt. */
  schedule: null | {
    startYear: number;
    months: number;
    firstFullYearAmount: number;
    rows: AfaOutlookRow[];
    endYear: number | null;
  };
}

function AfaPreview({ data }: { data: AfaPreviewData }) {
  const isDegressive = data.method === 'degressiv_5a';
  const schedule = data.schedule;
  return (
    <Card className="self-start">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionLabel className="mb-0">AfA-Vorschau</SectionLabel>
        <span className="rounded-[5px] bg-slate-100 px-2 py-[3px] text-[11px] font-bold text-slate-700">
          {isDegressive ? 'Degressiv 5 %' : `Linear ${percentLabel(data.linearRate)}`}
        </span>
      </div>

      {schedule && (
        <>
          <p className="text-[11px] text-text-secondary">AfA {schedule.startYear + 1}</p>
          <p className="mt-0.5 text-[26px] font-extrabold leading-tight tabular-nums text-text-primary">
            {formatCurrency(schedule.firstFullYearAmount)}
          </p>
          {data.marginalTaxRate > 0 && (
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-positive-strong">
              ≈ {formatCurrency(schedule.firstFullYearAmount * data.marginalTaxRate)} Steuerersparnis
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-text-dim">≈ {formatCurrency(schedule.firstFullYearAmount / 12)} pro Monat</p>

          <div className="mt-5 border-t border-black/[0.07] pt-5">
            <AfaOutlookTable rows={schedule.rows} endYear={schedule.endYear} />
          </div>
        </>
      )}

      <div className="mt-5 border-t border-black/[0.07] pt-5">
        <AfaFacts title="Bemessungsgrundlage">
          <AfaFactRow label="Gebäudewert" value={formatCurrency(data.buildingValue)} />
          <AfaFactRow label="Anteilige Kaufnebenkosten" value={formatCurrency(data.closingCostsShare)} />
          {data.renovation > 0 && <AfaFactRow label="Aktivierte Renovierung" value={formatCurrency(data.renovation)} />}
          <AfaFactRow label="Bemessungsgrundlage" value={formatCurrency(data.basis)} strong />
        </AfaFacts>
      </div>

      {isDegressive && (
        <p className="mt-4 text-[11px] leading-relaxed text-text-dim">Einen Wechsel zu linear kannst du später im Steuer-Tab vormerken.</p>
      )}
    </Card>
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
  const renovation = safeNum(values.renovationAfaEligible);

  const basis = afaBasis(buildingValue, closingCosts, purchasePrice, renovation);
  const closingCostsShare = purchasePrice > 0 ? (closingCosts * buildingValue) / purchasePrice : 0;
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

  let schedule: AfaPreviewData['schedule'] = null;
  if (plan && transferDate) {
    const startYear = transferDate.getUTCFullYear();
    const months = 13 - (transferDate.getUTCMonth() + 1);
    const first = depreciationForYear(plan, startYear);
    const second = depreciationForYear(plan, startYear + 1);
    const tenth = depreciationForYear(plan, startYear + 10);
    if (first && second && tenth) {
      schedule = {
        startYear,
        months,
        firstFullYearAmount: second.amount,
        rows: [
          { year: startYear, label: `${months} Monate`, amount: first.amount, bookValue: first.bookValueEnd },
          { year: startYear + 1, amount: second.amount, bookValue: second.bookValueEnd },
          { year: startYear + 10, label: 'in 10 Jahren', amount: tenth.amount, bookValue: tenth.bookValueEnd },
        ],
        endYear: depreciationEndYear(plan),
      };
    }
  }

  const eligibilityWarning =
    isDegressive && transferDate && purchaseDate
      ? degressiveEligibilityWarning({ yearBuilt, purchaseDate, economicTransferDate: transferDate })
      : null;

  return (
    <FormSection>
      <FormHint>
        Gebäude- und Grundstückswert kommen aus dem Sachwertverfahren (<BerechnungshilfeLink />) und sollten sich zum Kaufpreis
        addieren (Toleranz ±5 %).
      </FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <FormCard title="Kaufpreisaufteilung">
            <FormGrid>
              <BuildingShareFields
                purchasePrice={purchasePrice}
                buildingLabel={<>Gebäudewert (<BerechnungshilfeLink />)</>}
                landLabel={<>Grundstückswert (<BerechnungshilfeLink />)</>}
              />
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

          <FormCard title="AfA & Steuer">
            <FormGrid>
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
                  info="2 % ab 1925 · 2,5 % vor 1925 · 3 % Neubau ab 2023"
                />
              )}
              <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} required />
              {eligibilityWarning && (
                <div className="sm:col-span-2">
                  <FormWarning>⚠ {eligibilityWarning}</FormWarning>
                </div>
              )}
            </FormGrid>
          </FormCard>
        </div>

        <AfaPreview
          data={{
            method,
            linearRate: depreciationRate,
            marginalTaxRate: safeNum(values.marginalTaxRate),
            basis,
            buildingValue,
            closingCostsShare,
            renovation,
            schedule,
          }}
        />
      </div>
    </FormSection>
  );
}
