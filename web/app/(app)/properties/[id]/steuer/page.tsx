import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { SteuerTab } from '@/components/property/steuer/SteuerTab';

export default async function SteuerTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <SteuerTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      today={new Date()}
    />
  );
}
