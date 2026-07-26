import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { VerlaufFeed } from '@/components/property/verlauf/VerlaufFeed';

export default async function VerlaufTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <VerlaufFeed propertyId={id} statusEntries={detail.statusEntries} extraordinaryCosts={detail.extraordinaryCosts} />
  );
}
