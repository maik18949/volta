'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProperty } from '@/lib/data/propertyActions';

export function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = window.confirm(
      `${propertyName} löschen?\n\nDiese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.`
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteProperty(propertyId);
      } catch {
        setError('Löschen fehlgeschlagen — bitte erneut versuchen.');
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={`${propertyName} löschen`}
        className="text-text-dim hover:text-negative disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>
      {error && <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-negative">{error}</p>}
    </div>
  );
}
