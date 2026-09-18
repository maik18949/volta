'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { ReadOnlyField } from '@/components/ui/ReadOnlyField';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { FormCard, FormGrid, FormHint, FormSection, FormWarning } from '@/components/ui/FormLayout';
import { formatCurrency } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

function safeNum(value: number | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepKosten() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });
  const isHoaUnitSplit = useWatch({ control, name: 'isHoaUnitSplit' });
  const isHoaParkingSplit = useWatch({ control, name: 'isHoaParkingSplit' });
  const values = useWatch({ control });
  const [infoOpen, setInfoOpen] = useState(false);
  const hasParking = parkingType !== 'nicht_vorhanden';

  const hoaFeeTotalMonthly = safeNum(values.hoaFeeTotalMonthly);
  const hoaFeeRecoverableMonthly = isHoaUnitSplit ? safeNum(values.hoaFeeRecoverableMonthly) : 0;
  const hoaFeeMaintenanceReserveMonthly = isHoaUnitSplit ? safeNum(values.hoaFeeMaintenanceReserveMonthly) : 0;
  const hoaFeeNonRecoverableMonthly = hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - hoaFeeMaintenanceReserveMonthly;
  const propertyManagementMonthly = safeNum(values.propertyManagementAnnual) / 12;
  const propertyInsuranceMonthly = safeNum(values.propertyInsuranceAnnual) / 12;
  const otherCostsMonthly = safeNum(values.otherCostsMonthly);
  const nonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly + hoaFeeMaintenanceReserveMonthly + propertyManagementMonthly + propertyInsuranceMonthly + otherCostsMonthly;
  const hoaSplitExceedsTotal = hoaFeeRecoverableMonthly + hoaFeeMaintenanceReserveMonthly > hoaFeeTotalMonthly;

  const hoaParkingTotalMonthly = safeNum(values.hoaFeeParkingTotalMonthly);
  const hoaParkingNonRecoverableMonthly = isHoaParkingSplit
    ? hoaParkingTotalMonthly - safeNum(values.hoaFeeParkingRecoverableMonthly) - safeNum(values.hoaFeeParkingMaintenanceReserveMonthly)
    : hoaParkingTotalMonthly;

  return (
    <FormSection>
      <FormHint>Bei WEG-Wohnungen enthält das Hausgeld meist die Instandhaltungsrücklage — nur zusätzliche Kosten separat eintragen.</FormHint>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <FormCard title="Hausgeld Wohnung">
          <CurrencyField label="Hausgeld gesamt / Monat" name="hoaFeeTotalMonthly" register={register} required className="mb-3.5" />
          <Toggle label="Hausgeld aufteilen" name="isHoaUnitSplit" register={register} className="py-2" />
          {isHoaUnitSplit ? (
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <CurrencyField label="davon umlagefähig / Monat" name="hoaFeeRecoverableMonthly" register={register} required />
              <CurrencyField label="Instandhaltungsrücklage" name="hoaFeeMaintenanceReserveMonthly" register={register} />
              <ReadOnlyField
                label="davon nicht umlagefähig / Monat"
                hint="= gesamt − umlagef. − rücklage"
                value={formatCurrency(hoaFeeNonRecoverableMonthly)}
                className="sm:col-span-2"
              />
              {hoaSplitExceedsTotal && (
                <div className="sm:col-span-2">
                  <FormWarning>⚠ Umlagefähig + Rücklage darf das Hausgeld gesamt nicht übersteigen.</FormWarning>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <FormWarning>⚠ Für genaue Steuerberechnung bitte aufteilen</FormWarning>
            </div>
          )}
        </FormCard>

        {hasParking && (
          <FormCard title="Hausgeld Stellplatz">
            <CurrencyField label="Hausgeld gesamt / Monat" name="hoaFeeParkingTotalMonthly" register={register} className="mb-3.5" />
            <Toggle label="Hausgeld aufteilen" name="isHoaParkingSplit" register={register} className="py-2" />
            {isHoaParkingSplit ? (
              <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <CurrencyField label="davon umlagefähig / Monat" name="hoaFeeParkingRecoverableMonthly" register={register} />
                <CurrencyField label="Instandhaltungsrücklage" name="hoaFeeParkingMaintenanceReserveMonthly" register={register} />
                <ReadOnlyField
                  label="davon nicht umlagefähig / Monat"
                  hint="= gesamt − umlagef. − rücklage"
                  value={formatCurrency(hoaParkingNonRecoverableMonthly)}
                  className="sm:col-span-2"
                />
              </div>
            ) : (
              <div className="mt-3">
                <FormWarning>⚠ Aufteilen wenn der Mietvertrag eine Nebenkostenvereinbarung für den Stellplatz enthält</FormWarning>
              </div>
            )}
          </FormCard>
        )}

        <FormCard title="Weitere Kosten" className="lg:col-span-2">
          <FormGrid>
            <CurrencyField label="Grundsteuer Wohnung / Jahr" name="propertyTaxAnnual" register={register} required />
            {hasParking && <CurrencyField label="Grundsteuer Stellplatz / Jahr" name="propertyTaxParkingAnnual" register={register} />}
            <CurrencyField label="Verwaltung / Jahr" name="propertyManagementAnnual" register={register} />
            <CurrencyField label="Gebäudeversicherung / Jahr" name="propertyInsuranceAnnual" register={register} hint="separat" />
            <CurrencyField label="Sonstige Kosten / Monat" name="otherCostsMonthly" register={register} />
          </FormGrid>
        </FormCard>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[13px] font-bold text-text-primary">Nicht umlagefähige Kosten Wohnung / Monat: {formatCurrency(nonRecoverableMonthly)}</p>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          title="Wie wird das berechnet?"
          aria-label="Wie wird das berechnet? — Info"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-text-dim text-[11px] font-bold leading-none text-text-dim hover:border-accent hover:text-accent"
        >
          i
        </button>
      </div>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Nicht umlagefähige Kosten Wohnung/Monat">
        <p className="mb-3 text-[13px] leading-[1.55] text-text-primary">
          Diese Zahl ist die monatliche Cashflow-Belastung durch nicht auf Mieter umlegbare Betriebskosten — nicht nur der
          nicht umlagefähige Hausgeld-Anteil, sondern inklusive Rücklage, Verwaltung und Versicherung (die Rücklage ist
          zwar steuerlich nicht absetzbar, aber ein echter monatlicher Geldabfluss).
        </p>
        <div className="text-[13px]">
          <InfoRow label="Nicht umlagefähiges Hausgeld" value={hoaFeeNonRecoverableMonthly} />
          <InfoRow label="+ Instandhaltungsrücklage" value={hoaFeeMaintenanceReserveMonthly} />
          <InfoRow label="+ Verwaltung (Jahr ÷ 12)" value={propertyManagementMonthly} />
          <InfoRow label="+ Gebäudeversicherung (Jahr ÷ 12)" value={propertyInsuranceMonthly} />
          <InfoRow label="+ Sonstige Kosten/Monat" value={otherCostsMonthly} />
          <div className="flex justify-between border-t border-black/10 py-1.5 font-bold text-text-primary">
            <span>= Summe/Monat</span>
            <span className="tabular-nums">{formatCurrency(nonRecoverableMonthly)}</span>
          </div>
        </div>
      </Modal>
    </FormSection>
  );
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-t border-black/5 py-1.5">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums text-text-primary">{formatCurrency(value)}</span>
    </div>
  );
}
