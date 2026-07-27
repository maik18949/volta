'use client';

import { useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
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
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await promoteInvestmentCalculation(calculationId);
      } catch (err) {
        // promoteInvestmentCalculation redirects on success, which Next.js implements via an
        // internal thrown signal — unstable_rethrow re-throws that (and other Next.js internal
        // control-flow errors like notFound()) so only a genuine failure reaches setError below.
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : 'Übernehmen fehlgeschlagen — bitte erneut versuchen.');
      }
    });
  }

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

      <Modal open={open} onClose={() => setOpen(false)} title="Als Immobilie übernehmen?">
        <div className="space-y-4 text-center">
          <p className="text-sm text-text-secondary">
            &ldquo;{calculationName}&rdquo; wird als neue Immobilie ins Portfolio aufgenommen. Dieser Eintrag bleibt als
            Prognose-Referenz erhalten.
          </p>
          {error && (
            <p role="alert" className="text-xs text-negative">
              {error}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-black/10 px-4 py-2 text-sm">
              Abbrechen
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Übernehmen
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
