import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export function GlassCard({
  children,
  className = '',
  variant = 'glass',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'solid';
}) {
  const base = variant === 'solid' ? 'rounded-[18px] bg-white shadow-sm' : 'glass-card';
  return <div className={twMerge(base, 'p-4', className)}>{children}</div>;
}
export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-section-label mt-2.5 mb-2">
      {children}
    </p>
  );
}
