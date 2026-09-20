'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { DisbursementModal } from './DisbursementModal';
import { deleteLoanDisbursement } from '@/lib/data/loanDisbursementActions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function DisbursementList({
  propertyId,
  disbursements,
}: {
  propertyId: string;
  disbursements: LoanDisbursementRow[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LoanDisbursementRow | null>(null);
  const [, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const sorted = [...disbursements].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, d) => sum + d.amount, 0);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: LoanDisbursementRow) {
    setEditing(row);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (!window.confirm('Diese Auszahlung löschen?')) return;
    setDeleteErrors((prev) => withoutKey(prev, id));
    setPendingIds((prev) => ({ ...prev, [id]: true }));
    startTransition(async () => {
      try {
        await deleteLoanDisbursement(id, propertyId);
      } catch {
        setDeleteErrors((prev) => ({ ...prev, [id]: 'Löschen fehlgeschlagen — bitte erneut versuchen.' }));
      } finally {
        setPendingIds((prev) => withoutKey(prev, id));
      }
    });
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <SectionLabel className="mb-0">Auszahlungen</SectionLabel>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
          <Plus size={14} strokeWidth={2.5} /> Hinzufügen
        </button>
      </div>

      <p className="mb-3 rounded-[9px] bg-[#f5f7fa] px-3.5 py-2.5 text-[13px] leading-[1.55] text-text-secondary">
        Nur eintragen, wenn dein Darlehen in mehreren Tranchen zu unterschiedlichen Zeitpunkten ausgezahlt wurde (z.&nbsp;B.
        eine Versicherungsprämie vor der Hauptauszahlung), oder ein Teilbetrag steuerlich nicht abzugsfähig ist. Wurde alles
        auf einmal ausgezahlt und ist alles abzugsfähig, brauchst du hier nichts einzutragen — dann gelten einfach die
        Angaben aus den Immobiliendaten (Darlehensbetrag, Datum).
      </p>

      {sorted.length === 0 ? (
        <p className="text-[13px] text-text-secondary">
          Keine Auszahlungstranchen erfasst — es wird mit einer einzelnen Auszahlung gerechnet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-[9px] bg-[#f5f7fa] px-3.5 py-2.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-text-primary">{row.label || 'Auszahlung'}</span>
                <span className="text-text-secondary">{formatDate(new Date(row.date + 'T00:00:00Z'))}</span>
                {!row.is_deductible && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">nicht abzugsfähig</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-text-primary">{formatCurrency(row.amount)}</span>
                <button type="button" onClick={() => openEdit(row)} aria-label="Bearbeiten" className="flex text-text-dim hover:text-accent">
                  <Pencil size={14} />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={!!pendingIds[row.id]}
                    aria-label="Löschen"
                    className="flex text-text-dim hover:text-negative disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                  {deleteErrors[row.id] && (
                    <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-negative">
                      {deleteErrors[row.id]}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sorted.length > 0 && (
        <div className="mt-3 flex justify-between border-t border-black/10 pt-2 text-[13px] font-semibold tabular-nums">
          <span>Summe</span>
          <span>{formatCurrency(total)}</span>
        </div>
      )}

      <DisbursementModal open={modalOpen} onClose={() => setModalOpen(false)} propertyId={propertyId} entry={editing} />
    </div>
  );
}
