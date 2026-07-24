'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProperty } from '@/lib/data/propertyActions';

export function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `${propertyName} löschen?\n\nDiese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht.`
    );
    if (!confirmed) return;
    startTransition(() => {
      deleteProperty(propertyId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`${propertyName} löschen`}
      className="text-text-dim hover:text-negative disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}
