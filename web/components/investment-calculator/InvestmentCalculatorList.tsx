import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatMultiplier, formatPercent } from '@/lib/formatters';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';
import type { InvestmentCalculationRow } from '@/lib/data/investmentCalculations';

function rowToValues(row: InvestmentCalculationRow): InvestmentCalculatorValues {
  return {
    name: row.name,
    purchasePriceUnit: row.purchase_price_unit,
    purchasePriceParking: row.purchase_price_parking,
    landTransferTax: row.land_transfer_tax,
    notaryCosts: row.notary_costs,
    landRegistryCosts: row.land_registry_costs,
    agentFee: row.agent_fee,
    appraisalCosts: row.appraisal_costs,
    renovationModernizationCosts: row.renovation_modernization_costs,
    renovationAfaEligible: row.renovation_afa_eligible,
    coldRentMonthly: row.cold_rent_monthly,
    parkingRentMonthly: row.parking_rent_monthly,
    otherIncomeMonthly: row.other_income_monthly,
    vacancyRateAssumption: row.vacancy_rate_assumption,
    loanAmount: row.loan_amount,
    interestRate: row.interest_rate,
    amortizationRate: row.amortization_rate,
    monthlyMortgage: row.monthly_mortgage,
    loanStartDate: row.loan_start_date,
    hoaFeeTotalMonthly: row.hoa_fee_total_monthly,
    hoaFeeRecoverableMonthly: row.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: row.hoa_fee_maintenance_reserve_monthly,
    propertyManagementAnnual: row.property_management_annual,
    propertyInsuranceAnnual: row.property_insurance_annual,
    otherCostsMonthly: row.other_costs_monthly,
    buildingValue: row.building_value,
    depreciationRate: row.depreciation_rate,
    marginalTaxRate: row.marginal_tax_rate,
  };
}

export function InvestmentCalculatorList({ calculations }: { calculations: InvestmentCalculationRow[] }) {
  if (calculations.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
        <Calculator size={40} className="text-text-dim" />
        <p className="text-text-secondary">
          Kaufkandidaten analysieren und bei Kauf direkt übernehmen.
          <br />
          Noch kein Kaufkandidat angelegt.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {calculations.map((row) => {
        const kpis = computeInvestmentKPIs(rowToValues(row), ZERO_SENSITIVITY);
        return (
          <Link key={row.id} href={`/investment-calculator/${row.id}`}>
            <GlassCard className="space-y-2 hover:bg-black/[0.02]">
              <div className="flex items-center justify-between">
                <p className="font-bold text-text-primary">{row.name || 'Unbenannt'}</p>
                {row.is_promoted && <span className="text-xs font-semibold text-positive">✓ übernommen</span>}
              </div>
              {row.purchase_price_unit > 0 && <p className="text-sm text-text-secondary">{formatCurrency(row.purchase_price_unit)}</p>}
              <div className="flex gap-4 text-xs text-text-secondary">
                {kpis.grossYield !== null && <span>Brutto {formatPercent(kpis.grossYield)}</span>}
                {kpis.mietmultiplikator !== null && <span>Faktor {formatMultiplier(kpis.mietmultiplikator)}</span>}
                {kpis.hasFinancingData && <span>CF/Mon {formatCurrency(kpis.cashflowAfterDebtMonthly)}</span>}
              </div>
            </GlassCard>
          </Link>
        );
      })}
    </div>
  );
}
