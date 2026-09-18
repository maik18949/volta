'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Plus, Trash2, Pencil, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge, STATUS_LABELS } from '@/components/ui/StatusBadge';
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

const PRIMARY_BUTTON =
  'inline-flex items-center gap-1.5 rounded-[9px] bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-600';

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

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

/** One feed line: badge · title/subtitle on the left, amount · date · edit/delete on the right. */
function FeedRow({
  badge,
  title,
  subtitle,
  amount,
  date,
  onEdit,
  onDelete,
  deleting,
  deleteError,
}: {
  badge: ReactNode;
  title: string;
  subtitle: ReactNode;
  amount?: string;
  date: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  deleteError?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3.5">
        {badge}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text-primary">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">{subtitle}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3.5">
        {amount && <span className="text-[13px] font-semibold tabular-nums text-text-primary">{amount}</span>}
        <span className="text-[13px] tabular-nums text-text-dim">{date}</span>
        <button type="button" onClick={onEdit} title="Bearbeiten" aria-label="Bearbeiten" className="flex p-1 text-text-dim hover:text-accent">
          <Pencil size={14} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title="Löschen"
            aria-label="Löschen"
            className="flex p-1 text-text-dim hover:text-negative disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
          {deleteError && (
            <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-negative">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function VerlaufFeed({
  propertyId,
  hasParking,
  statusEntries,
  extraordinaryCosts,
}: {
  propertyId: string;
  hasParking: boolean;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
}) {
  const [statusModal, setStatusModal] = useState<{ open: boolean; entry: StatusEntryRow | null }>({ open: false, entry: null });
  const [costModal, setCostModal] = useState<{ open: boolean; entry: ExtraordinaryCostRow | null }>({ open: false, entry: null });
  const [, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [activeUnit, setActiveUnit] = useState<StatusEntryRow['unit']>('wohnung');

  const unitStatusEntries = statusEntries.filter((e) => e.unit === activeUnit);

  const ascendingStatus = [...unitStatusEntries].sort((a, b) => a.date.localeCompare(b.date));
  function endDateFor(row: StatusEntryRow): string | null {
    const sameUnit = ascendingStatus.filter((e) => e.unit === row.unit);
    const idx = sameUnit.findIndex((e) => e.id === row.id);
    return idx >= 0 && idx + 1 < sameUnit.length ? sameUnit[idx + 1].date : null;
  }

  const items: FeedItem[] = sortFeed([
    ...unitStatusEntries.map((row): FeedItem => ({ kind: 'status', date: row.date, row })),
    ...extraordinaryCosts.map((row): FeedItem => ({ kind: 'cost', date: row.cost_month, row })),
  ]);

  function runDelete(id: string, confirmText: string, action: () => Promise<unknown>) {
    if (!window.confirm(confirmText)) return;
    setDeleteErrors((prev) => withoutKey(prev, id));
    setPendingIds((prev) => ({ ...prev, [id]: true }));
    startTransition(async () => {
      try {
        await action();
      } catch {
        setDeleteErrors((prev) => ({ ...prev, [id]: 'Löschen fehlgeschlagen — bitte erneut versuchen.' }));
      } finally {
        setPendingIds((prev) => withoutKey(prev, id));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasParking ? (
          <div className="inline-flex rounded-[9px] bg-[#e9edf3] p-[3px]">
            {(['wohnung', 'stellplatz'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setActiveUnit(unit)}
                aria-pressed={activeUnit === unit}
                className={`rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold ${
                  activeUnit === unit ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                }`}
              >
                {unit === 'wohnung' ? 'Wohnung' : 'Stellplatz'}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => setStatusModal({ open: true, entry: null })} className={PRIMARY_BUTTON}>
            <Plus size={14} strokeWidth={2.5} /> Status
          </button>
          <button type="button" onClick={() => setCostModal({ open: true, entry: null })} className={PRIMARY_BUTTON}>
            <Plus size={14} strokeWidth={2.5} /> Kosten
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center">
          <p className="text-[13px] text-text-secondary">
            {hasParking ? `Noch kein Statusverlauf für ${activeUnit === 'wohnung' ? 'Wohnung' : 'Stellplatz'}.` : 'Noch kein Statusverlauf.'}
          </p>
          <button
            type="button"
            onClick={() => setStatusModal({ open: true, entry: null })}
            className="mt-2 text-[13px] font-semibold text-accent hover:underline"
          >
            + Ersten Status hinzufügen
          </button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {items.map((item) => {
            if (item.kind === 'status') {
              const row = item.row;
              const end = endDateFor(row);
              const start = isoToDate(row.date);
              return (
                <FeedRow
                  key={`status-${row.id}`}
                  badge={<StatusBadge status={row.status} />}
                  title={STATUS_LABELS[row.status]}
                  subtitle={
                    <>
                      <span>
                        {end
                          ? `${formatDate(start)} – ${formatDate(isoToDate(end))} (${daysBetween(row.date, end)} Tage)`
                          : `seit ${formatDate(start)}`}
                      </span>
                      {row.status === 'mietgarantie' && row.income_actual_monthly !== null && (
                        <span className="text-text-dim">
                          {row.income_is_fixed_amount && row.income_period_end_date ? (
                            <>
                              Fixbetrag: {formatCurrency(row.income_actual_monthly)} ({formatDate(start)} –{' '}
                              {formatDate(isoToDate(row.income_period_end_date))})
                            </>
                          ) : (
                            <>{formatCurrency(row.income_actual_monthly)}/Monat</>
                          )}
                        </span>
                      )}
                    </>
                  }
                  date={formatDate(start)}
                  onEdit={() => setStatusModal({ open: true, entry: row })}
                  onDelete={() => runDelete(row.id, 'Diesen Statuseintrag löschen?', () => deleteStatusEntry(row.id, propertyId))}
                  deleting={!!pendingIds[row.id]}
                  deleteError={deleteErrors[row.id]}
                />
              );
            }

            const row = item.row;
            return (
              <FeedRow
                key={`cost-${row.id}`}
                badge={
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-negative/[0.08] px-2.5 py-1 text-[11px] font-bold text-negative">
                    <ArrowDown size={11} strokeWidth={2.5} />
                    Kosten
                  </span>
                }
                title={row.description_text || CATEGORY_LABELS[row.category]}
                subtitle={
                  <>
                    <span>{CATEGORY_LABELS[row.category]}</span>
                    <span>· {row.is_deductible ? 'absetzbar' : 'nicht absetzbar'}</span>
                  </>
                }
                amount={formatCurrency(-row.amount)}
                date={formatDate(isoToDate(row.cost_month))}
                onEdit={() => setCostModal({ open: true, entry: row })}
                onDelete={() => runDelete(row.id, 'Diesen Kosteneintrag löschen?', () => deleteExtraordinaryCost(row.id, propertyId))}
                deleting={!!pendingIds[row.id]}
                deleteError={deleteErrors[row.id]}
              />
            );
          })}
        </Card>
      )}

      <StatusEntryModal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, entry: null })}
        propertyId={propertyId}
        unit={activeUnit}
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
