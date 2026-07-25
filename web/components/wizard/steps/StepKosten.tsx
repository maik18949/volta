'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
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

  const hoaFeeTotalMonthly = safeNum(values.hoaFeeTotalMonthly);
  const hoaFeeRecoverableMonthly = isHoaUnitSplit ? safeNum(values.hoaFeeRecoverableMonthly) : 0;
  const hoaFeeMaintenanceReserveMonthly = isHoaUnitSplit ? safeNum(values.hoaFeeMaintenanceReserveMonthly) : 0;
  const hoaFeeNonRecoverableMonthly = hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - hoaFeeMaintenanceReserveMonthly;
  const nonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    hoaFeeMaintenanceReserveMonthly +
    safeNum(values.propertyManagementAnnual) / 12 +
    safeNum(values.propertyInsuranceAnnual) / 12 +
    safeNum(values.otherCostsMonthly);
  const hoaSplitExceedsTotal = hoaFeeRecoverableMonthly + hoaFeeMaintenanceReserveMonthly > hoaFeeTotalMonthly;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Bei WEG-Wohnungen enthält das Hausgeld meist Instandhaltungsrücklage — nur zusätzliche Kosten separat eintragen.
      </p>

      <div className="space-y-3 rounded-md border border-black/[0.06] p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Hausgeld Wohnung</p>
        <CurrencyField label="Hausgeld gesamt/Monat" name="hoaFeeTotalMonthly" register={register} required />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" {...register('isHoaUnitSplit')} /> Aufteilen
        </label>
        {isHoaUnitSplit ? (
          <>
            <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeRecoverableMonthly" register={register} required />
            <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeMaintenanceReserveMonthly" register={register} />
            <p className="text-sm text-text-secondary">davon nicht umlagefähig/Monat: {formatCurrency(hoaFeeNonRecoverableMonthly)}</p>
            {hoaSplitExceedsTotal && (
              <p className="text-sm text-warning">⚠ Umlagefähig + Rücklage darf das Hausgeld gesamt nicht übersteigen.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-text-dim">Hausgeld aufteilen für genaue steuerliche Berechnung.</p>
        )}
      </div>

      <CurrencyField label="Grundsteuer Wohnung/Jahr" name="propertyTaxAnnual" register={register} required />
      <CurrencyField label="Verwaltung/Jahr" name="propertyManagementAnnual" register={register} />
      <CurrencyField label="Gebäudeversicherung/Jahr (separat)" name="propertyInsuranceAnnual" register={register} />
      <CurrencyField label="Sonstige Kosten/Monat" name="otherCostsMonthly" register={register} />

      {parkingType !== 'nicht_vorhanden' && (
        <div className="space-y-3 rounded-md border border-black/[0.06] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Hausgeld Stellplatz</p>
          <CurrencyField label="Hausgeld Stellplatz gesamt/Monat" name="hoaFeeParkingTotalMonthly" register={register} />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" {...register('isHoaParkingSplit')} /> Aufteilen
          </label>
          {isHoaParkingSplit && (
            <>
              <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeParkingRecoverableMonthly" register={register} />
              <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeParkingMaintenanceReserveMonthly" register={register} />
            </>
          )}
          <CurrencyField label="Grundsteuer Stellplatz/Jahr" name="propertyTaxParkingAnnual" register={register} />
        </div>
      )}

      <p className="font-bold text-text-primary">Nicht umlagefähige Kosten Wohnung/Monat: {formatCurrency(nonRecoverableMonthly)}</p>
    </div>
  );
}
