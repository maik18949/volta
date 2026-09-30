'use client';

import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { FormCard, FormGrid, FormSection } from '@/components/ui/FormLayout';
import { STATE_NAMES, isStateName } from '@/lib/data/landTransferTaxRates';
import { postalCodeHint, stateUpdateForPostalCode } from '@/lib/wizard/postalCodeState';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const PROPERTY_TYPES: Array<[WizardFormValues['propertyType'], string]> = [
  ['apartment', 'Apartment'],
  ['einfamilienhaus', 'Einfamilienhaus'],
  ['mehrfamilienhaus', 'Mehrfamilienhaus'],
  ['gewerbe', 'Gewerbe'],
  ['grundstuck', 'Grundstück'],
  ['sonstiges', 'Sonstiges'],
];

const ACQUISITION_TYPES: Array<[WizardFormValues['acquisitionType'], string]> = [
  ['kauf', 'Kauf'],
  ['erbschaft', 'Erbschaft'],
  ['schenkung', 'Schenkung'],
];

export function StepStammdaten() {
  const { register, control, setValue } = useFormContext<WizardFormValues>();
  const postalCode = useWatch({ control, name: 'postalCode' }) ?? '';
  const state = useWatch({ control, name: 'state' }) ?? '';

  // Only react to a *change* of the PLZ, never to the initial value (a saved Bundesland must survive opening the form).
  const previousPostalCode = useRef(postalCode);
  useEffect(() => {
    if (postalCode === previousPostalCode.current) return;
    previousPostalCode.current = postalCode;
    const update = stateUpdateForPostalCode(postalCode);
    if (update.action === 'set') setValue('state', update.state);
    else if (update.action === 'clear') setValue('state', '');
  }, [postalCode, setValue]);

  const stateOptions: Array<[string, string]> = STATE_NAMES.map((name) => [name, name]);
  // A saved free-text value we can't map stays selectable so autosave never silently drops it.
  if (state && !isStateName(state)) stateOptions.push([state, `${state} (bitte prüfen)`]);
  const hint = postalCodeHint(postalCode, state);

  return (
    <FormSection>
      <FormCard title="Stammdaten">
        <FormGrid>
          <TextField label="Name" name="name" register={register} required className="sm:col-span-2" />
          <TextField label="Adresse" name="address" register={register} required />
          <TextField label="Stadt" name="city" register={register} required />
          <TextField label="PLZ" name="postalCode" register={register} />
          <div>
            <SelectField label="Bundesland" name="state" register={register} options={stateOptions} emptyOption="Bitte wählen" />
            {hint && (
              <p className={hint.tone === 'warn' ? 'mt-1.5 text-[12px] font-medium text-amber-800' : 'mt-1.5 text-[12px] text-text-dim'}>
                {hint.text}
              </p>
            )}
          </div>
          <SelectField label="Objekttyp" name="propertyType" register={register} options={PROPERTY_TYPES} />
          <TextField label="Baujahr" name="yearBuilt" register={register} type="number" />
          <SelectField label="Erwerbsart" name="acquisitionType" register={register} options={ACQUISITION_TYPES} />
          <TextAreaField label="Notizen" name="notes" register={register} className="sm:col-span-2" />
        </FormGrid>
      </FormCard>
    </FormSection>
  );
}
