'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Info } from 'lucide-react';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { Modal } from '@/components/ui/Modal';
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

      <div className="flex items-center gap-1.5">
        <p className="font-bold text-text-primary">Nicht umlagefähige Kosten Wohnung/Monat: {formatCurrency(nonRecoverableMonthly)}</p>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label="Wie wird das berechnet? — Info"
          className="text-text-dim hover:text-accent"
        >
          <Info size={13} />
        </button>
      </div>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Nicht umlagefähige Kosten Wohnung/Monat">
        <div className="space-y-3 text-sm">
          <p className="text-text-primary">
            Diese Zahl ist die monatliche Cashflow-Belastung durch nicht auf Mieter umlegbare Betriebskosten — nicht nur der
            nicht umlagefähige Hausgeld-Anteil, sondern inklusive Rücklage, Verwaltung und Versicherung (die Rücklage ist
            zwar steuerlich nicht absetzbar, aber ein echter monatlicher Geldabfluss).
          </p>
          <table className="w-full text-left text-xs">
            <tbody>
              <tr className="border-t border-black/5">
                <td className="py-1 text-text-secondary">Nicht umlagefähiges Hausgeld</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(hoaFeeNonRecoverableMonthly)}</td>
              </tr>
              <tr className="border-t border-black/5">
                <td className="py-1 text-text-secondary">+ Instandhaltungsrücklage</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(hoaFeeMaintenanceReserveMonthly)}</td>
              </tr>
              <tr className="border-t border-black/5">
                <td className="py-1 text-text-secondary">+ Verwaltung (Jahr ÷ 12)</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(propertyManagementMonthly)}</td>
              </tr>
              <tr className="border-t border-black/5">
                <td className="py-1 text-text-secondary">+ Gebäudeversicherung (Jahr ÷ 12)</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(propertyInsuranceMonthly)}</td>
              </tr>
              <tr className="border-t border-black/5">
                <td className="py-1 text-text-secondary">+ Sonstige Kosten/Monat</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(otherCostsMonthly)}</td>
              </tr>
              <tr className="border-t border-black/10 font-bold">
                <td className="py-1 text-text-primary">= Summe/Monat</td>
                <td className="py-1 text-right text-text-primary">{formatCurrency(nonRecoverableMonthly)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
