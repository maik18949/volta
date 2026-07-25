import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={twMerge('glass-card p-4', className)}>{children}</div>;
}
