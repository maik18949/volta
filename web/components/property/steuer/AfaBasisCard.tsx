import { GlassCard } from '@/components/ui/GlassCard';
import { afaBasis, depreciationYearly } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function AfaBasisCard({ property }: { property: PropertyRow }) {
  const purchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = closingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const basis = afaBasis(property.building_value, closingCosts, purchasePrice, property.renovation_afa_eligible);
  const yearly = depreciationYearly(basis, property.depreciation_rate);

  return (
    <GlassCard>
      <h2 className="mb-3 text-sm font-bold uppercase text-text-secondary">AfA-Basis</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Grundstückswert" value={formatCurrency(property.land_value)} />
        <Stat label="Gebäudewert" value={formatCurrency(property.building_value)} />
        <Stat label="AfA-Bemessungsgrundlage" value={formatCurrency(basis)} />
        <Stat label="AfA / Jahr" value={formatCurrency(yearly)} />
        <Stat label="Grenzsteuersatz" value={formatPercent(property.marginal_tax_rate)} />
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
