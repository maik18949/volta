'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusEntryModal } from './StatusEntryModal';
import { ExtraordinaryCostModal } from './ExtraordinaryCostModal';
import { deleteStatusEntry } from '@/lib/data/statusEntryActions';
import { deleteExtraordinaryCost } from '@/lib/data/extraordinaryCostActions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

type FeedItem = { kind: 'status'; date: string; row: StatusEntryRow } | { kind: 'cost'; date: string; row: ExtraordinaryCostRow };

const CATEGORY_LABELS: Record<ExtraordinaryCostRow['category'], string> = {
  sonderumlage: 'Sonderumlage',
  reparatur: 'Reparatur',
  gutachter: 'Gutachter',
  rechtskosten: 'Rechtskosten',
  sonstiges: 'Sonstiges',
};

function sortFeed(items: FeedItem[]): FeedItem[] {
  // Same-date ties: StatusEntry has created_at (later wins, per spec-verlauf-tab.md).
  // ExtraordinaryCost has no created_at in the Plan-1 schema, so a tie involving a cost
  // keeps the array's incoming order (Array.sort is stable) — an accepted gap, not
  // something in scope for this plan to fix.
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.kind === 'status' && b.kind === 'status') return b.row.created_at.localeCompare(a.row.created_at);
    return 0;
  });
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + 'T00:00:00Z').getTime();
  const end = new Date(endIso + 'T00:00:00Z').getTime();
  return Math.round((end - start) / 86_400_000);
}

export function VerlaufFeed({
  propertyId,
  statusEntries,
  extraordinaryCosts,
}: {
  propertyId: string;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
}) {
  const [statusModal, setStatusModal] = useState<{ open: boolean; entry: StatusEntryRow | null }>({ open: false, entry: null });
  const [costModal, setCostModal] = useState<{ open: boolean; entry: ExtraordinaryCostRow | null }>({ open: false, entry: null });

  const ascendingStatus = [...statusEntries].sort((a, b) => a.date.localeCompare(b.date));
  function endDateFor(row: StatusEntryRow): string | null {
    const idx = ascendingStatus.findIndex((e) => e.id === row.id);
    return idx >= 0 && idx + 1 < ascendingStatus.length ? ascendingStatus[idx + 1].date : null;
  }

  const items: FeedItem[] = sortFeed([
    ...statusEntries.map((row): FeedItem => ({ kind: 'status', date: row.date, row })),
    ...extraordinaryCosts.map((row): FeedItem => ({ kind: 'cost', date: row.cost_month, row })),
  ]);

  async function handleDeleteStatus(id: string) {
    if (!window.confirm('Diesen Statuseintrag löschen?')) return;
    await deleteStatusEntry(id, propertyId);
  }

  async function handleDeleteCost(id: string) {
    if (!window.confirm('Diesen Kosteneintrag löschen?')) return;
    await deleteExtraordinaryCost(id, propertyId);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setStatusModal({ open: true, entry: null })}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={14} /> Status
        </button>
        <button
          type="button"
          onClick={() => setCostModal({ open: true, entry: null })}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={14} /> Kosten
        </button>
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-text-secondary">Noch kein Statusverlauf.</p>
          <button
            type="button"
            onClick={() => setStatusModal({ open: true, entry: null })}
            className="mt-2 text-sm font-semibold text-accent hover:underline"
          >
            + Ersten Status hinzufügen
          </button>
        </div>
      ) : (
        <div className="glass-card divide-y divide-black/[0.06] p-0">
          {items.map((item) =>
            item.kind === 'status' ? (
              <div key={`status-${item.row.id}`} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.row.status} />
                  {(() => {
                    const end = endDateFor(item.row);
                    const start = new Date(item.row.date + 'T00:00:00Z');
                    return end ? (
                      <span className="text-sm text-text-secondary">
                        {formatDate(start)} – {formatDate(new Date(end + 'T00:00:00Z'))} ({daysBetween(item.row.date, end)} Tage)
                      </span>
                    ) : (
                      <span className="text-sm text-text-secondary">seit {formatDate(start)}</span>
                    );
                  })()}
                  {item.row.status === 'mietgarantie' && item.row.income_actual_monthly !== null && (
                    <span className="text-sm text-text-dim">{formatCurrency(item.row.income_actual_monthly)}/Monat</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModal({ open: true, entry: item.row })}
                    aria-label="Bearbeiten"
                    className="text-text-dim hover:text-accent"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStatus(item.row.id)}
                    aria-label="Löschen"
                    className="text-text-dim hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={`cost-${item.row.id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-text-primary">
                    {item.row.description_text || CATEGORY_LABELS[item.row.category]}{' '}
                    <span className="text-xs text-text-dim">({formatDate(new Date(item.row.cost_month + 'T00:00:00Z'))})</span>
                  </p>
                  <p className="text-sm text-negative">
                    {formatCurrency(-item.row.amount)}{' '}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                        item.row.is_deductible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.row.is_deductible ? 'absetzbar' : 'nicht absetzbar'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCostModal({ open: true, entry: item.row })}
                    aria-label="Bearbeiten"
                    className="text-text-dim hover:text-accent"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCost(item.row.id)}
                    aria-label="Löschen"
                    className="text-text-dim hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <StatusEntryModal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, entry: null })}
        propertyId={propertyId}
        entry={statusModal.entry}
      />
      <ExtraordinaryCostModal
        open={costModal.open}
        onClose={() => setCostModal({ open: false, entry: null })}
        propertyId={propertyId}
        entry={costModal.entry}
      />
    </div>
  );
}
