'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createExtraordinaryCost, updateExtraordinaryCost } from '@/lib/data/extraordinaryCostActions';
import type { Database } from '@/lib/supabase/types';

type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type CostCategory = Database['public']['Enums']['extraordinary_cost_category'];

interface FormValues {
  costMonth: string;
  category: CostCategory;
  amount: number;
  descriptionText: string;
  isDeductible: boolean;
}

const CATEGORY_OPTIONS: Array<[CostCategory, string]> = [
  ['sonderumlage', 'Sonderumlage'],
  ['reparatur', 'Reparatur'],
  ['gutachter', 'Gutachter'],
  ['rechtskosten', 'Rechtskosten'],
  ['sonstiges', 'Sonstiges'],
];

export function ExtraordinaryCostModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: ExtraordinaryCostRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ExtraordinaryCostModal stays mounted while the caller merely toggles `open`
  // (Modal itself returns null when closed), so this state survives across
  // close/reopen cycles. Clear stale errors whenever the modal transitions
  // from closed to open, rather than only on submit/close, since Modal can
  // also be dismissed via the backdrop, Escape, or its own close button, not
  // just "Abbrechen".
  //
  // Unlike StatusEntryModal's sibling fix, this is done during render (React's
  // "adjusting state when a prop changes" pattern) instead of in a useEffect.
  // StatusEntryModal calls react-hook-form's watch(), which makes the React
  // Compiler bail out of analyzing that component, silencing further
  // diagnostics; this component has no such bailout, so the equivalent
  // setSubmitError-inside-useEffect would trip the (real) eslint
  // react-hooks/set-state-in-effect rule. Updating state directly in the
  // render body avoids the extra commit/render pass the rule warns about
  // while producing the same clear-on-reopen behavior.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSubmitError(null);
    }
  }

  // NOTE: `values` here only resets correctly on reopen because the caller
  // (VerlaufFeed, Task 20) is expected to null out `entry` in its onClose
  // handler, not just flip `open` to false. If a future caller closes the
  // modal without clearing `entry`, stale unsaved edits from the previous
  // session could resurface the next time it opens.
  const { register, handleSubmit } = useForm<FormValues>({
    values: {
      costMonth: entry?.cost_month ?? new Date().toISOString().slice(0, 10),
      category: entry?.category ?? 'sonstiges',
      amount: entry?.amount ?? 0,
      descriptionText: entry?.description_text ?? '',
      isDeductible: entry?.is_deductible ?? true,
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          cost_month: values.costMonth,
          category: values.category,
          amount: values.amount,
          description_text: values.descriptionText || null,
          is_deductible: values.isDeductible,
        };
        if (entry) {
          await updateExtraordinaryCost(entry.id, propertyId, payload);
        } else {
          await createExtraordinaryCost(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Kosten bearbeiten' : 'Kosten hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Datum" name="costMonth" register={register} type="date" required />
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Kategorie</span>
          <select
            {...register('category')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <CurrencyField label="Betrag" name="amount" register={register} required />
        <TextField label="Beschreibung (optional)" name="descriptionText" register={register} />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" {...register('isDeductible')} />
          Steuerlich absetzbar
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
