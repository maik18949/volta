'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import type { WizardFormValues } from '@/lib/wizard/wizardLogic';

const PARKING_TYPES: Array<[WizardFormValues['parkingType'], string]> = [
  ['nicht_vorhanden', 'Nicht vorhanden'],
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

const ENERGY_CLASSES: Array<NonNullable<WizardFormValues['energyEfficiencyClass']>> = [
  'a_plus_plus',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
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

export function StepObjektdaten() {
  const { register, control } = useFormContext<WizardFormValues>();
  const parkingType = useWatch({ control, name: 'parkingType' });

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">Objektdaten — trage ein, was du weißt.</p>

      <div className="grid grid-cols-3 gap-3">
        <TextField label="Wohnfläche (m²)" name="livingAreaSqm" register={register} type="number" required />
        <TextField label="Nutzfläche (m²)" name="usableAreaSqm" register={register} type="number" />
        <TextField label="Zimmer" name="rooms" register={register} type="number" />
      </div>

      <div className="flex flex-wrap gap-4">
        {BOOLEAN_FEATURES.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" {...register(field)} />
            {label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Stellplatz</span>
          <select
            {...register('parkingType')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {PARKING_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Heizung</span>
          <select
            {...register('heatingType', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {HEATING_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Energieklasse</span>
          <select
            {...register('energyEfficiencyClass', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {ENERGY_CLASSES.map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase().replace('_PLUS_PLUS', '++')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Zustand</span>
          <select
            {...register('condition', { setValueAs: (v) => (v === '' ? null : v) })}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {CONDITIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TextField label="Letzte Renovierung (Jahr)" name="lastRenovationYear" register={register} type="number" />

      {parkingType !== 'nicht_vorhanden' && (
        <p className="text-xs text-text-dim">Stellplatz-Felder (Kaufpreis, Miete, Kosten) erscheinen in den folgenden Schritten.</p>
      )}
    </div>
  );
}
