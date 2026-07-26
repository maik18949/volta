import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { PropertyTabNav } from '@/components/property/PropertyTabNav';

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

  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-xs text-text-dim hover:underline">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-extrabold text-text-primary">{detail.property.name}</h1>
      </div>
      <PropertyTabNav propertyId={id} />
      {children}
    </div>
  );
}
