'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createInvestmentCalculation } from '@/lib/data/investmentCalculationActions';

export function NewCalculationButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const id = await createInvestmentCalculation();
          router.push(`/investment-calculator/${id}`);
        })
      }
      className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
    >
      <Plus size={16} /> Neu
    </button>
  );
}
