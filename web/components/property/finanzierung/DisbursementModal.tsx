'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createLoanDisbursement, updateLoanDisbursement } from '@/lib/data/loanDisbursementActions';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

interface FormValues {
  date: string;
  amount: number;
  isDeductible: boolean;
  label: string;
}

export function DisbursementModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: LoanDisbursementRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clear a stale error the moment the modal transitions to open — adjusted
  // during render (React's recommended pattern for "reset state when a prop
  // changes") rather than in an effect, so it happens in the same render
  // instead of triggering an extra one.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSubmitError(null);
  }

  const { register, handleSubmit } = useForm<FormValues>({
    values: {
      date: entry?.date ?? new Date().toISOString().slice(0, 10),
      amount: entry?.amount ?? 0,
      isDeductible: entry?.is_deductible ?? true,
      label: entry?.label ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          date: values.date,
          amount: values.amount,
          is_deductible: values.isDeductible,
          label: values.label,
        };
        if (entry) {
          await updateLoanDisbursement(entry.id, propertyId, payload);
        } else {
          await createLoanDisbursement(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Auszahlung bearbeiten' : 'Auszahlung hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Bezeichnung" name="label" register={register} />
        <TextField label="Datum" name="date" register={register} type="date" required />
        <CurrencyField label="Betrag" name="amount" register={register} required />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" {...register('isDeductible')} />
          Steuerlich abzugsfähig
        </label>
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
