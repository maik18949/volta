'use client';

import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Toggle } from '@/components/ui/Toggle';
import { FormCard, FormGrid, FormSection } from '@/components/ui/FormLayout';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const PARKING_TYPES: Array<[WizardFormValues['parkingType'], string]> = [
  ['nicht_vorhanden', 'Kein Stellplatz'],
  ['tiefgarage', 'Tiefgarage'],
  ['aussenstellplatz', 'Außenstellplatz'],
  ['garage', 'Garage'],
];

const HEATING_TYPES: Array<[NonNullable<WizardFormValues['heatingType']>, string]> = [
  ['fernwarme', 'Fernwärme'],
  ['gas', 'Gas'],
  ['ol', 'Öl'],
  ['warmepumpe', 'Wärmepumpe'],
  ['pellet', 'Pellet'],
  ['elektro', 'Elektro'],
  ['sonstiges', 'Sonstiges'],
];

const ENERGY_CLASSES: Array<[NonNullable<WizardFormValues['energyEfficiencyClass']>, string]> = [
  ['a_plus_plus', 'A++'],
  ['a', 'A'],
  ['b', 'B'],
  ['c', 'C'],
  ['d', 'D'],
  ['e', 'E'],
  ['f', 'F'],
  ['g', 'G'],
  ['h', 'H'],
];

const CONDITIONS: Array<[NonNullable<WizardFormValues['condition']>, string]> = [
  ['neubau', 'Neubau'],
  ['erstbezug', 'Erstbezug'],
  ['gepflegt', 'Gepflegt'],
  ['renovierungsbedurftig', 'Renovierungsbedürftig'],
  ['sanierungsbedurftig', 'Sanierungsbedürftig'],
];

const BOOLEAN_FEATURES = [
  { field: 'hasBalcony', label: 'Balkon' },
  { field: 'hasTerrace', label: 'Terrasse' },
  { field: 'hasGarden', label: 'Garten' },
  { field: 'hasBasement', label: 'Keller' },
  { field: 'hasFittedKitchen', label: 'Einbauküche' },
] as const;

const NULL_WHEN_EMPTY = { setValueAs: (v: string) => (v === '' ? null : v) };

/** `fotos` is an optional extra card rendered between Objektdaten and Ausstattung (Immobiliendaten tab only). */
export function StepObjektdaten({ fotos }: { fotos?: ReactNode }) {
  const { register, control } = useFormContext<WizardFormValues>();

  return (
    <FormSection>
      <FormCard title="Objektdaten">
        <FormGrid>
          <TextField label="Wohnfläche (m²)" name="livingAreaSqm" register={register} type="number" required />
          <TextField label="Nutzfläche (m²)" name="usableAreaSqm" register={register} type="number" />
          <NumberStepper label="Zimmer" name="rooms" control={control} step={0.5} min={0.5} />
          <SelectField label="Stellplatz" name="parkingType" register={register} options={PARKING_TYPES} />
          <SelectField label="Heizung" name="heatingType" register={register} options={HEATING_TYPES} emptyOption="–" registerOptions={NULL_WHEN_EMPTY} />
          <SelectField
            label="Energieklasse"
            name="energyEfficiencyClass"
            register={register}
            options={ENERGY_CLASSES}
            emptyOption="–"
            registerOptions={NULL_WHEN_EMPTY}
          />
          <SelectField label="Zustand" name="condition" register={register} options={CONDITIONS} emptyOption="–" registerOptions={NULL_WHEN_EMPTY} />
          <TextField label="Letzte Renovierung" name="lastRenovationYear" register={register} type="number" />
        </FormGrid>
      </FormCard>

      {fotos}

      <FormCard title="Ausstattung">
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {BOOLEAN_FEATURES.map(({ field, label }) => (
            <Toggle key={field} label={label} name={field} register={register} className="border-b border-black/[0.07] last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0" />
          ))}
        </div>
      </FormCard>
    </FormSection>
  );
}
