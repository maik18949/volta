'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, DollarSign, FileText, Activity, CreditCard } from 'lucide-react';
import { SidebarPhoto } from './SidebarPhoto';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

const TABS = [
  { href: '', label: 'Übersicht', icon: LayoutGrid },
  { href: '/cashflow', label: 'Cashflow', icon: DollarSign },
  { href: '/steuer', label: 'Steuer', icon: FileText },
  { href: '/verlauf', label: 'Verlauf', icon: Activity },
  { href: '/finanzierung', label: 'Finanzierung', icon: CreditCard },
];

export function PropertySidebar({
  propertyId,
  address,
  postalCode,
  city,
  propertyType,
  photos,
}: {
  propertyId: string;
  address: string;
  postalCode: string;
  city: string;
  propertyType: PropertyType;
  photos: PropertyPhotoWithUrl[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/properties/${propertyId}`;
  const leerstandParam = searchParams.get('leerstand');

  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-black/[0.07] bg-white">
      <SidebarPhoto photos={photos} propertyType={propertyType} />
      <div className="border-b border-black/[0.06] px-3.5 py-3">
        <p className="text-[13px] font-semibold leading-[1.35] text-text-primary">{address}</p>
        <p className="text-[13px] text-text-secondary">
          {postalCode} {city}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2.5 py-3">
        <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.5px] text-text-dim">Immobilie</p>
        {TABS.map(({ href, label, icon: Icon }) => {
          const fullHref = `${basePath}${href}`;
          const isActive = pathname === fullHref;
          // Der Leerstandsquote-Regler lebt nur in Cashflow/Steuer — nur dorthin mitgeben,
          // damit ein Link zu z.B. "Verlauf" keinen ungenutzten Query-Parameter bekommt.
          const carriesQuote = href === '/cashflow' || href === '/steuer';
          const hrefWithQuery =
            carriesQuote && leerstandParam !== null ? `${fullHref}?leerstand=${encodeURIComponent(leerstandParam)}` : fullHref;
          return (
            <Link
              key={href}
              href={hrefWithQuery}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-[9px] text-[13px] ${
                isActive
                  ? 'bg-accent/10 font-bold text-accent'
                  : 'font-medium text-text-secondary hover:bg-accent/[0.06] hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
