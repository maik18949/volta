import Link from 'next/link';
import { Home, Calculator, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Portfolio', icon: Home },
  { href: '/investment-calculator', label: 'Investment-Rechner', icon: Calculator },
  { href: '/settings', label: 'Einstellungen', icon: Settings },
];

export function Sidebar() {
  return (
    <nav className="w-16 shrink-0 border-r border-black/[0.08] py-4 flex flex-col items-center gap-6">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} title={label} aria-label={label} className="text-text-secondary hover:text-accent">
          <Icon size={22} />
        </Link>
      ))}
    </nav>
  );
}
