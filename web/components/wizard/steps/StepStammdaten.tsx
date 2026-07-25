'use client';

import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
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
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Gib die Basisdaten deiner Immobilie ein. Name, Adresse und Stadt sind Pflichtfelder.
      </p>

      <TextField label="Name" name="name" register={register} required />
      <TextField label="Adresse" name="address" register={register} required />

      <div className="grid grid-cols-3 gap-3">
        <TextField label="PLZ" name="postalCode" register={register} />
        <TextField label="Stadt" name="city" register={register} required />
        <TextField label="Bundesland" name="state" register={register} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Objekttyp</span>
          <select
            {...register('propertyType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {PROPERTY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Erwerbsart</span>
          <select
            {...register('acquisitionType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {ACQUISITION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Baujahr" name="yearBuilt" register={register} type="number" />
      </div>

      <label className="block">
        <span className="text-[13px] font-medium text-text-secondary">Notizen</span>
        <textarea
          {...register('notes')}
          rows={3}
          className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
        />
      </label>
    </div>
  );
}
