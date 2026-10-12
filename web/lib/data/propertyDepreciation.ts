import type { Database } from '@/lib/supabase/types';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import {
  depreciationEndYear,
  depreciationForYear,
  optimalSwitchYear,
  parseDepreciationMethod,
  switchState,
  type DepreciationMethod,
  type DepreciationPhase,
  type DepreciationPlanInput,
  type SwitchState,
} from '@/lib/calculations/depreciationSchedule';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function propertyAfaBasis(property: PropertyRow): number {
  const purchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = closingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  return afaBasis(property.building_value, closingCosts, purchasePrice, property.renovation_afa_eligible);
}

/** `switchYearOverride`: undefined = gespeicherter Plan des Objekts, null = ohne Wechsel, Zahl = hypothetisches Wechseljahr. */
export function depreciationPlanFor(property: PropertyRow, basis: number, switchYearOverride?: number | null): DepreciationPlanInput {
  return {
    basis,
    method: parseDepreciationMethod(property.depreciation_method),
    linearRate: property.depreciation_rate,
    economicTransferDate: new Date(property.economic_transfer_date + 'T00:00:00Z'),
    switchYear: switchYearOverride !== undefined ? switchYearOverride : property.degressive_switch_year,
  };
}

/**
 * AfA-Betrag für die Steuerberechnung. undefined bei linearen Objekten, damit der bisherige
 * Rechenweg (`afaBasis × depreciationRate`) unverändert bleibt.
 */
export function depreciationAmountOverride(property: PropertyRow, basis: number, year: number): number | undefined {
  if (parseDepreciationMethod(property.depreciation_method) === 'linear') return undefined;
  return depreciationForYear(depreciationPlanFor(property, basis), year)?.amount ?? 0;
}

export interface AfaCardModel {
  method: DepreciationMethod;
  year: number;
  acquisitionYear: number;
  basis: number;
  linearRate: number;
  amount: number;
  taxSaving: number;
  bookValueEnd: number;
  phase: DepreciationPhase | null;
  outlook: { amountIn5Years: number; amountIn10Years: number; endYear: number | null };
  /** null bei Linear oder wenn keine Empfehlung berechenbar ist. */
  switch: null | { state: SwitchState; optimalYear: number; switchYear: number | null; lostAmountThisYear: number };
}

export function buildAfaCardModel(property: PropertyRow, today: Date): AfaCardModel {
  const basis = propertyAfaBasis(property);
  const plan = depreciationPlanFor(property, basis);
  const year = today.getUTCFullYear();
  const current = depreciationForYear(plan, year);
  const amount = current?.amount ?? 0;

  const optimalYear = plan.method === 'degressiv_5a' ? optimalSwitchYear(plan) : null;
  let switchInfo: AfaCardModel['switch'] = null;
  if (optimalYear !== null) {
    const withoutSwitch = depreciationForYear({ ...plan, switchYear: null }, year)?.amount ?? 0;
    const switchedNow = depreciationForYear({ ...plan, switchYear: year }, year)?.amount ?? 0;
    switchInfo = {
      state: switchState({ currentYear: year, switchYear: plan.switchYear, optimalYear }),
      optimalYear,
      switchYear: plan.switchYear,
      lostAmountThisYear: Math.max(switchedNow - withoutSwitch, 0),
    };
  }

  return {
    method: plan.method,
    year,
    acquisitionYear: plan.economicTransferDate.getUTCFullYear(),
    basis,
    linearRate: plan.linearRate,
    amount,
    taxSaving: amount * property.marginal_tax_rate,
    bookValueEnd: current?.bookValueEnd ?? basis,
    phase: current?.phase ?? null,
    outlook: {
      amountIn5Years: depreciationForYear(plan, year + 5)?.amount ?? 0,
      amountIn10Years: depreciationForYear(plan, year + 10)?.amount ?? 0,
      endYear: depreciationEndYear(plan),
    },
    switch: switchInfo,
  };
}

export interface SwitchPreviewRow {
  year: number;
  withoutSwitch: number;
  withSwitch: number;
  /** (mit − ohne) × Grenzsteuersatz */
  taxEffect: number;
}

export interface SwitchPreview {
  rows: SwitchPreviewRow[];
  endYearWithout: number | null;
  endYearWith: number | null;
}

export function buildSwitchPreview(property: PropertyRow, proposedYear: number): SwitchPreview {
  const basis = propertyAfaBasis(property);
  const without = depreciationPlanFor(property, basis, null);
  const withSwitch = depreciationPlanFor(property, basis, proposedYear);
  const rows = [0, 5, 10].map((offset) => {
    const year = proposedYear + offset;
    const a = depreciationForYear(without, year)?.amount ?? 0;
    const b = depreciationForYear(withSwitch, year)?.amount ?? 0;
    return { year, withoutSwitch: a, withSwitch: b, taxEffect: (b - a) * property.marginal_tax_rate };
  });
  return { rows, endYearWithout: depreciationEndYear(without), endYearWith: depreciationEndYear(withSwitch) };
}
