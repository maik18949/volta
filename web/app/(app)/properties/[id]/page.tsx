import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: property } = await supabase.from('properties').select('name').eq('id', id).single();

  if (!property) notFound();

  return <p className="text-text-secondary">{property.name} — Detail-Tabs kommen in Plan 4.</p>;
}
