import { twMerge } from 'tailwind-merge';

export function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <p className={twMerge('mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-section-label', className)}>
      {children}
    </p>
  );
}
