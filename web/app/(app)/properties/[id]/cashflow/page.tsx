import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { CashflowTab } from '@/components/property/cashflow/CashflowTab';

export default async function CashflowTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <CashflowTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      today={new Date()}
    />
  );
}
