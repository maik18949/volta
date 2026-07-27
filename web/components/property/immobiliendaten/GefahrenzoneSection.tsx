'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProperty } from '@/lib/data/propertyActions';

export function GefahrenzoneSection({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `${propertyName} löschen?\n\nDiese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten) werden unwiderruflich gelöscht.`
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteProperty(propertyId);
        router.push('/');
      } catch {
        setError('Löschen fehlgeschlagen — bitte erneut versuchen.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Diese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten) werden unwiderruflich gelöscht.
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md border border-negative px-4 py-2 text-sm font-semibold text-negative disabled:opacity-50"
      >
        Immobilie löschen
      </button>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
