'use client';

import { useState, useTransition } from 'react';
import { promoteInvestmentCalculation } from '@/lib/data/investmentCalculationActions';

export function PromoteDialog({
  calculationId,
  calculationName,
  disabled,
}: {
  calculationId: string;
  calculationName: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Als Immobilie übernehmen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[400px] space-y-4 rounded-xl bg-white p-8 text-center">
            <p className="text-lg font-bold text-text-primary">Als Immobilie übernehmen?</p>
            <p className="text-sm text-text-secondary">
              &ldquo;{calculationName}&rdquo; wird als neue Immobilie ins Portfolio aufgenommen. Dieser Eintrag bleibt als
              Prognose-Referenz erhalten.
            </p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-black/10 px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => promoteInvestmentCalculation(calculationId))}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
