import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { PropertyDetailShell } from '@/components/property/detail/PropertyDetailShell';

export default async function PropertyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const { currentStatus } = computePropertySummary(detail.property, detail.statusEntries, new Date());

  return (
    <PropertyDetailShell
      propertyId={id}
      name={detail.property.name}
      address={detail.property.address}
      postalCode={detail.property.postal_code}
      city={detail.property.city}
      propertyType={detail.property.property_type}
      status={currentStatus}
      photos={detail.photos}
    >
      {children}
    </PropertyDetailShell>
  );
}
