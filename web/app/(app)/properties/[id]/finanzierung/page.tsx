import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computeFinancingOverview, computeAmortizationYearTable } from '@/lib/data/propertyFinancing';
import { FinanzierungTab } from '@/components/property/finanzierung/FinanzierungTab';

export default async function FinanzierungTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const overview = computeFinancingOverview(detail.property, today);
  const yearTable = computeAmortizationYearTable(detail.property, today);

  return <FinanzierungTab overview={overview} yearTable={yearTable} />;
}
