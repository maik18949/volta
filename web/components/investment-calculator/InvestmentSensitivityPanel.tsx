'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SENSITIVITY_RANGES, type SensitivityDeltas, type InvestmentKPIs } from '@/lib/data/investmentCalculation';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatted,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatted: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-text-primary">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="w-44 shrink-0 text-right font-mono text-xs text-text-secondary">{formatted}</span>
    </div>
  );
}

export function InvestmentSensitivityPanel({
  baseRent,
  basePrice,
  sensitivity,
  onChange,
  kpis,
}: {
  baseRent: number;
  basePrice: number;
  sensitivity: SensitivityDeltas;
  onChange: (next: SensitivityDeltas) => void;
  kpis: InvestmentKPIs;
}) {
  const [rentMin, rentMax] = SENSITIVITY_RANGES.rent(baseRent);
  const [priceMin, priceMax] = SENSITIVITY_RANGES.price(basePrice);
  const [rateMin, rateMax] = SENSITIVITY_RANGES.rate;
  const [vacancyMin, vacancyMax] = SENSITIVITY_RANGES.vacancy;
  const [maintenanceMin, maintenanceMax] = SENSITIVITY_RANGES.maintenance;

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-text-secondary">Sensitivitätsanalyse</p>
        <button
          type="button"
          onClick={() => onChange({ rentDelta: 0, rateDelta: 0, priceDelta: 0, vacancyDelta: 0, maintenanceDelta: 0 })}
          className="text-xs text-accent hover:underline"
        >
          Zurücksetzen
        </button>
      </div>

      <Slider
        label="Kaltmiete"
        value={sensitivity.rentDelta}
        min={rentMin}
        max={rentMax}
        step={10}
        onChange={(v) => onChange({ ...sensitivity, rentDelta: v })}
        formatted={`${sensitivity.rentDelta >= 0 ? '+' : ''}${sensitivity.rentDelta} € → ${formatCurrency(kpis.effectiveColdRentMonthly)}`}
      />
      <Slider
        label="Zinssatz"
        value={sensitivity.rateDelta}
        min={rateMin}
        max={rateMax}
        step={0.001}
        onChange={(v) => onChange({ ...sensitivity, rateDelta: v })}
        formatted={`${sensitivity.rateDelta >= 0 ? '+' : ''}${formatPercent(sensitivity.rateDelta)} → ${formatPercent(kpis.effectiveInterestRate)}`}
      />
      <Slider
        label="Kaufpreis"
        value={sensitivity.priceDelta}
        min={priceMin}
        max={priceMax}
        step={1000}
        onChange={(v) => onChange({ ...sensitivity, priceDelta: v })}
        formatted={`${sensitivity.priceDelta >= 0 ? '+' : ''}${Math.round(sensitivity.priceDelta / 1000)}k € → ${formatCurrency(kpis.effectivePurchasePriceUnit)}`}
      />
      <Slider
        label="Leerstand"
        value={sensitivity.vacancyDelta}
        min={vacancyMin}
        max={vacancyMax}
        step={0.01}
        onChange={(v) => onChange({ ...sensitivity, vacancyDelta: v })}
        formatted={`${sensitivity.vacancyDelta >= 0 ? '+' : ''}${formatPercent(sensitivity.vacancyDelta)} → ${formatPercent(kpis.effectiveVacancyRate)}`}
      />
      <Slider
        label="Instandhaltung"
        value={sensitivity.maintenanceDelta}
        min={maintenanceMin}
        max={maintenanceMax}
        step={5}
        onChange={(v) => onChange({ ...sensitivity, maintenanceDelta: v })}
        formatted={`${sensitivity.maintenanceDelta >= 0 ? '+' : ''}${sensitivity.maintenanceDelta} €/Mon`}
      />
    </GlassCard>
  );
}
