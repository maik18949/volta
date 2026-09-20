import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
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
    <Card className="py-[18px]">
      <SectionLabel>AfA-Basis</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3">
        <Stat label="Grundstückswert" value={formatCurrency(property.land_value)} />
        <Stat label="Gebäudewert" value={formatCurrency(property.building_value)} />
        <Stat label="AfA-Bemessungsgrundlage" value={formatCurrency(basis)} />
        <Stat label="AfA / Jahr" value={formatCurrency(yearly)} />
        <Stat label="Grenzsteuersatz" value={formatPercent(property.marginal_tax_rate)} />
      </div>
    </Card>
  );
}
