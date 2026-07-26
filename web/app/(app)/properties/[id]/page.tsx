import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { OverviewKpiBar } from '@/components/property/overview/OverviewKpiBar';
import { CurrentStatusCard } from '@/components/property/overview/CurrentStatusCard';
import { ReturnsCard } from '@/components/property/overview/ReturnsCard';
import { FinancingCard } from '@/components/property/overview/FinancingCard';
import { ObjectCard } from '@/components/property/overview/ObjectCard';

export default async function PropertyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  const sortedHistory = [...detail.statusEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  return (
    <div className="space-y-4">
      <OverviewKpiBar summary={summary} overview={overview} />

      <div className="h-[200px] rounded-xl bg-gradient-to-br from-slate-200 to-slate-300" />

      <CurrentStatusCard
        propertyId={id}
        summary={summary}
        monthlyMortgage={detail.property.monthly_mortgage}
        hasStatusHistory={detail.statusEntries.length > 0}
        latestStatusDate={latestEntry ? new Date(latestEntry.date + 'T00:00:00Z') : null}
      />
      <ReturnsCard summary={summary} overview={overview} />
      <FinancingCard property={detail.property} remainingDebtNow={summary.remainingDebtNow} today={today} />
      <ObjectCard property={detail.property} purchasePricePerSqm={summary.purchasePricePerSqm} />
    </div>
  );
}
