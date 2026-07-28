'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createInvestmentCalculation } from '@/lib/data/investmentCalculationActions';

export function NewCalculationButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createInvestmentCalculation();
        router.push(`/investment-calculator/${id}`);
      } catch {
        setError('Erstellen fehlgeschlagen — bitte erneut versuchen.');
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Plus size={16} /> Neu
      </button>
      {error && <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-negative">{error}</p>}
    </div>
  );
}
