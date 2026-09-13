import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { SteuerTab } from '@/components/property/steuer/SteuerTab';

export default async function SteuerTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  return (
    <SteuerTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      overview={overview}
      today={today}
    />
  );
}
