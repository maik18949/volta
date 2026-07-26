'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

const TABS = [
  { href: '', label: 'Übersicht' },
  { href: '/cashflow', label: 'Cashflow' },
  { href: '/steuer', label: 'Steuer' },
  { href: '/verlauf', label: 'Verlauf' },
  { href: '/finanzierung', label: 'Finanzierung' },
  { href: '/immobiliendaten', label: 'Immobiliendaten' },
];

export function PropertyTabNav({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const basePath = `/properties/${propertyId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={twMerge(
              'whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-text-secondary',
              isActive && 'border-accent text-accent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
