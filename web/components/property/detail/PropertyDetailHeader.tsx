'use client';

import Link from 'next/link';
import { ChevronLeft, Check, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import type { SaveState } from './editSaveStatus';

const BACK_LINK = 'inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent hover:underline';

export function PropertyDetailHeader({
  propertyId,
  name,
  status,
  isEditing,
  saveState,
}: {
  propertyId: string;
  name: string;
  status: PropertyStatus;
  isEditing: boolean;
  saveState: SaveState;
}) {
  const basePath = `/properties/${propertyId}`;

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-black/[0.07] bg-white px-6 py-2.5">
      {isEditing ? (
        <Link href={basePath} className={BACK_LINK}>
          <ChevronLeft size={15} strokeWidth={2.5} />
          Zurück zur Übersicht
        </Link>
      ) : (
        <Link href="/" className={BACK_LINK}>
          <ChevronLeft size={15} strokeWidth={2.5} />
          Portfolio
        </Link>
      )}
      <div className="h-5 w-px bg-black/10" />
      <h1 className="text-[22px] font-extrabold tracking-[-0.3px] text-text-primary">{name}</h1>
      <StatusBadge status={status} />
      {isEditing && (
        <span className="rounded-md bg-slate-100 px-2.5 py-[3px] text-[13px] font-semibold text-text-secondary">Bearbeiten</span>
      )}
      <div className="flex-1" />
      {isEditing ? (
        <SaveStatus state={saveState} />
      ) : (
        <Link
          href={`${basePath}/immobiliendaten`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-black/10 bg-white px-3.5 py-[7px] text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
        >
          <Pencil size={14} />
          Daten bearbeiten
        </Link>
      )}
    </header>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <span className="text-[13px] font-semibold text-text-dim">Speichert…</span>;
  if (state === 'error') return <span className="text-[13px] font-semibold text-negative">Speichern fehlgeschlagen</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-positive">
      <Check size={13} strokeWidth={2.5} />
      Gespeichert
    </span>
  );
}
