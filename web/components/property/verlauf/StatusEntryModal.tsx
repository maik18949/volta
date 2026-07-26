'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createStatusEntry, updateStatusEntry } from '@/lib/data/statusEntryActions';
import type { Database } from '@/lib/supabase/types';

type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type PropertyStatus = Database['public']['Enums']['property_status'];

interface FormValues {
  date: string;
  status: PropertyStatus;
  incomeActualMonthly: number | null;
  notes: string;
}

const STATUS_OPTIONS: Array<[PropertyStatus, string]> = [
  ['vermietet', 'Vermietet'],
  ['leerstand', 'Leerstand'],
  ['mietgarantie', 'Mietgarantie'],
];

export function StatusEntryModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: StatusEntryRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // StatusEntryModal stays mounted while the caller merely toggles `open`
  // (Modal itself returns null when closed), so this state survives across
  // close/reopen cycles. Clear stale errors whenever the modal (re)opens
  // rather than only on submit/close, since Modal can also be dismissed via
  // the backdrop, Escape, or its own close button, not just "Abbrechen".
  useEffect(() => {
    if (open) {
      setSubmitError(null);
    }
  }, [open]);

  // NOTE: `values` here only resets correctly on reopen because the caller
  // (VerlaufFeed, Task 20) is expected to null out `entry` in its onClose
  // handler, not just flip `open` to false. If a future caller closes the
  // modal without clearing `entry`, stale unsaved edits from the previous
  // session could resurface the next time it opens.
  const { register, handleSubmit, watch } = useForm<FormValues>({
    values: {
      date: entry?.date ?? new Date().toISOString().slice(0, 10),
      status: entry?.status ?? 'vermietet',
      incomeActualMonthly: entry?.income_actual_monthly ?? null,
      notes: entry?.notes ?? '',
    },
  });
  const status = watch('status');

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          date: values.date,
          status: values.status,
          income_actual_monthly: values.status === 'mietgarantie' ? values.incomeActualMonthly : null,
          notes: values.notes,
        };
        if (entry) {
          await updateStatusEntry(entry.id, propertyId, payload);
        } else {
          await createStatusEntry(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Status bearbeiten' : 'Status hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Datum" name="date" register={register} type="date" required />
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Status</span>
          <select
            {...register('status')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {status === 'mietgarantie' && <CurrencyField label="Einnahme/Monat" name="incomeActualMonthly" register={register} />}
        <TextField label="Notizen" name="notes" register={register} />
        {submitError && (
          <p role="alert" className="text-sm text-negative">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-black/5">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}
