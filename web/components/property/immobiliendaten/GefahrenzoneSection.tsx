'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FormSection } from '@/components/ui/FormLayout';
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
    <FormSection>
      <section className="rounded-[14px] border border-negative/25 bg-white px-6 py-[22px]">
        <SectionLabel className="mb-5">Gefahrenzone</SectionLabel>
        <p className="mb-4 text-[13px] leading-[1.6] text-text-secondary">
          Diese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten) werden unwiderruflich gelöscht.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-[9px] border-[1.5px] border-negative bg-white px-5 py-2.5 text-[13px] font-bold text-negative hover:bg-negative hover:text-white disabled:opacity-50"
        >
          Immobilie löschen
        </button>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-negative">
            {error}
          </p>
        )}
      </section>
    </FormSection>
  );
}
