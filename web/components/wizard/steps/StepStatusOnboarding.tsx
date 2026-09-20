'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { FormCard, FormGrid, FormHint, FormSection } from '@/components/ui/FormLayout';
import { formatDate } from '@/lib/formatters';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const STATUS_OPTIONS: Array<[WizardFormValues['firstStatus'], string]> = [
  ['vermietet', 'Vermietet'],
  ['leerstand', 'Leerstand'],
  ['mietgarantie', 'Mietgarantie'],
];

export function StepStatusOnboarding() {
  const { register, control, setValue, getFieldState } = useFormContext<WizardFormValues>();
  const economicTransferDate = useWatch({ control, name: 'economicTransferDate' });
  const firstStatus = useWatch({ control, name: 'firstStatus' });

  // Auto-fill `firstStatusDate` from `economicTransferDate` until the user has actually
  // touched (blurred) the field themselves. `isTouched` is set on blur regardless of the
  // value typed — including a value that happens to equal economicTransferDate — and is
  // NOT set by this effect's own programmatic setValue() calls, so a user who deliberately
  // sets firstStatusDate to match economicTransferDate won't have a later transfer-date
  // edit silently overwrite their explicit choice. Same fix pattern as the Finanzierung step.
  useEffect(() => {
    if (!getFieldState('firstStatusDate').isTouched && economicTransferDate) {
      setValue('firstStatusDate', economicTransferDate);
    }
  }, [economicTransferDate, getFieldState, setValue]);

  return (
    <FormSection>
      <FormHint>
        Der wirtschaftliche Übergang ({economicTransferDate ? formatDate(new Date(economicTransferDate + 'T00:00:00Z')) : '–'}) liegt in
        der Vergangenheit. Erfasse den bisherigen Nutzungsverlauf — mindestens ein Eintrag ab diesem Datum ist Pflicht.
      </FormHint>

      <FormCard title="Nutzungsverlauf">
        <FormGrid>
          <TextField label="Erster Statuseintrag ab (Datum)" name="firstStatusDate" register={register} type="date" required />
          <SelectField label="Status" name="firstStatus" register={register} options={STATUS_OPTIONS} />
          {firstStatus === 'mietgarantie' && (
            <CurrencyField label="Einnahmen in diesem Zeitraum / Monat" name="firstStatusIncome" register={register} />
          )}
          <TextField label="Notiz (optional)" name="firstStatusNotes" register={register} className="sm:col-span-2" />
        </FormGrid>
        <p className="mt-4 text-xs text-text-dim">Weitere Statuswechsel können nach dem Anlegen im Verlauf-Tab ergänzt werden.</p>
      </FormCard>
    </FormSection>
  );
}
