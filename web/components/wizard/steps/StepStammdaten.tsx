'use client';

import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { FormCard, FormGrid, FormSection } from '@/components/ui/FormLayout';
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
  const { register } = useFormContext<WizardFormValues>();

  return (
    <FormSection>
      <FormCard title="Stammdaten">
        <FormGrid>
          <TextField label="Name" name="name" register={register} required className="sm:col-span-2" />
          <TextField label="Adresse" name="address" register={register} required />
          <TextField label="Stadt" name="city" register={register} required />
          <TextField label="PLZ" name="postalCode" register={register} />
          <TextField label="Bundesland" name="state" register={register} />
          <SelectField label="Objekttyp" name="propertyType" register={register} options={PROPERTY_TYPES} />
          <TextField label="Baujahr" name="yearBuilt" register={register} type="number" />
          <SelectField label="Erwerbsart" name="acquisitionType" register={register} options={ACQUISITION_TYPES} />
          <TextAreaField label="Notizen" name="notes" register={register} className="sm:col-span-2" />
        </FormGrid>
      </FormCard>
    </FormSection>
  );
}
