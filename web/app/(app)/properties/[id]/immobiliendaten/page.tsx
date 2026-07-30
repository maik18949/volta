import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { PropertyEditForm } from '@/components/property/immobiliendaten/PropertyEditForm';

export default async function ImmobiliendatenTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return <PropertyEditForm propertyId={id} property={detail.property} photos={detail.photos} />;
}
