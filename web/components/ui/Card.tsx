import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Flat white content card from the detail redesign (Volta Detail Redesign.dc.html):
 * 14px radius, hairline border, 20px/22px padding. Pass `className` to adjust padding
 * (e.g. `py-[18px]` for the denser stat cards, `p-0` for list cards).
 */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={twMerge('rounded-[14px] border border-black/[0.07] bg-white px-[22px] py-5', className)}>
      {children}
    </section>
  );
}
