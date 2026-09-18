'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Portfolio', icon: Home, matches: (path: string) => path === '/' || path.startsWith('/properties') },
  { href: '/investment-calculator', label: 'Investment-Rechner', icon: Calculator, matches: (path: string) => path.startsWith('/investment-calculator') },
  { href: '/settings', label: 'Einstellungen', icon: Settings, matches: (path: string) => path.startsWith('/settings') },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-6 border-r border-black/[0.08] bg-white py-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon, matches }) => (
        <Link
          key={href}
          href={href}
          title={label}
          aria-label={label}
          aria-current={matches(pathname) ? 'page' : undefined}
          className={`flex ${matches(pathname) ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}
        >
          <Icon size={22} />
        </Link>
      ))}
    </nav>
  );
}
