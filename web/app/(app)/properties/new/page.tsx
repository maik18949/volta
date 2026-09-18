import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PropertyWizard } from '@/components/wizard/PropertyWizard';

/** Same chrome as the property detail's edit mode (header bar + flat background), minus the sidebar. */
export default function NewPropertyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f3f5f8]">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-black/[0.07] bg-white px-6 py-2.5">
        <Link href="/" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
          <ChevronLeft size={15} strokeWidth={2.5} />
          Portfolio
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <h1 className="text-[22px] font-extrabold tracking-[-0.3px] text-text-primary">Neue Immobilie</h1>
        <span className="rounded-md bg-slate-100 px-2.5 py-[3px] text-[13px] font-semibold text-text-secondary">Anlegen</span>
      </header>
      <div className="flex min-w-0 flex-1 flex-col px-6 pb-8 pt-5">
        <PropertyWizard />
      </div>
    </div>
  );
}
