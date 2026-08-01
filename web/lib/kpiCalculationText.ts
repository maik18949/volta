import type { Database } from '@/lib/supabase/types';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent, formatMultiplier, formatNumber } from '@/lib/formatters';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

/**
 * The KPI's formula with this property's real numbers plugged in, e.g.
 * "950,00 € + 48,00 € × 12 ÷ 278.600,00 € = 4,3 %". Returns null when the
 * KPI's own value is null (same "no data yet" cases as the KPI itself).
 */
export function kpiCalculationText(
  kpi: BenchmarkKpi,
  property: PropertyRow,
  summary: PropertySummary,
  overview: OverviewMetrics
): string | null {
  switch (kpi) {
    case 'grossYield': {
      if (overview.grossYield === null) return null;
      return `(${formatCurrency(property.cold_rent_monthly)} + ${formatCurrency(property.parking_rent_monthly)}) × 12 ÷ ${formatCurrency(
        summary.totalPurchasePrice
      )} = ${formatPercent(overview.grossYield)}`;
    }
    case 'netYield': {
      if (summary.netYield === null) return null;
      return `${formatCurrency(summary.netOperatingIncomeYearly)} ÷ ${formatCurrency(summary.totalInvestment)} = ${formatPercent(
        summary.netYield
      )}`;
    }
    case 'cashOnCash': {
      if (overview.cashOnCash === null) return null;
      return `${formatCurrency(overview.cashflowBeforeTaxYear)} ÷ ${formatCurrency(overview.equityUsed)} = ${formatPercent(
        overview.cashOnCash
      )}`;
    }
    case 'eigenkapitalrendite': {
      if (overview.eigenkapitalrendite === null) return null;
      return `${formatCurrency(overview.eigenkapitalrenditeNumerator)} ÷ ${formatCurrency(overview.equityUsed)} = ${formatPercent(
        overview.eigenkapitalrendite
      )}`;
    }
    case 'kaufpreisfaktor': {
      if (overview.kaufpreisfaktor === null) return null;
      const rentYearly = (property.cold_rent_monthly + property.parking_rent_monthly) * 12;
      return `${formatCurrency(summary.totalPurchasePrice)} ÷ ${formatCurrency(rentYearly)} = ${formatMultiplier(
        overview.kaufpreisfaktor
      )}`;
    }
    case 'dscr': {
      if (overview.dscr === null) return null;
      const debtServiceAnnual = property.monthly_mortgage * 12;
      return `${formatCurrency(summary.netOperatingIncomeYearly)} ÷ ${formatCurrency(debtServiceAnnual)} = ${formatNumber(
        overview.dscr,
        2
      )}`;
    }
    case 'ltv': {
      if (overview.ltv === null) return null;
      return `${formatCurrency(summary.remainingDebtNow)} ÷ ${formatCurrency(summary.totalInvestment)} = ${formatPercent(overview.ltv)}`;
    }
    case 'actualVacancyRate': {
      if (overview.actualVacancyRate === null) return null;
      return `${overview.leerstandDaysSinceTransfer} Tage ÷ ${overview.ownershipDaysSinceTransfer} Tage = ${formatPercent(
        overview.actualVacancyRate
      )}`;
    }
  }
}
