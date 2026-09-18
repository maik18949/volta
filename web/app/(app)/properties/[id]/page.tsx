import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { OverviewKpiBar } from '@/components/property/overview/OverviewKpiBar';
import { ObjectCard } from '@/components/property/overview/ObjectCard';
import { CurrentStatusCard } from '@/components/property/overview/CurrentStatusCard';
import { ReturnsCard } from '@/components/property/overview/ReturnsCard';
import { FinancingCard } from '@/components/property/overview/FinancingCard';

export default async function PropertyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  const wohnungHistory = [...detail.statusEntries]
    .filter((e) => e.unit === 'wohnung')
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = wohnungHistory.length > 0 ? wohnungHistory[wohnungHistory.length - 1] : null;

  return (
    <div className="flex flex-col gap-4">
      <OverviewKpiBar summary={summary} overview={overview} />

      <ObjectCard property={detail.property} purchasePricePerSqm={summary.purchasePricePerSqm} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrentStatusCard
          propertyId={id}
          summary={summary}
          monthlyMortgage={detail.property.monthly_mortgage}
          hasParking={detail.property.parking_type !== 'nicht_vorhanden'}
          hasStatusHistory={detail.statusEntries.length > 0}
          latestStatusDate={latestEntry ? new Date(latestEntry.date + 'T00:00:00Z') : null}
        />
        <ReturnsCard property={detail.property} summary={summary} overview={overview} />
      </div>

      <FinancingCard property={detail.property} remainingDebtNow={summary.remainingDebtNow} today={today} />
    </div>
  );
}
