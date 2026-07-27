'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import {
  mapPropertyToEditFormValues,
  mapEditFormValuesToPropertyUpdate,
  type PropertyEditFormValues,
} from '@/lib/wizard/propertyEditLogic';
import { updateProperty } from '@/lib/data/propertyActions';
import { StepStammdaten } from '@/components/wizard/steps/StepStammdaten';
import { StepObjektdaten } from '@/components/wizard/steps/StepObjektdaten';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { StepEinnahmen } from '@/components/wizard/steps/StepEinnahmen';
import { StepKosten } from '@/components/wizard/steps/StepKosten';
import { StepFinanzierung } from '@/components/wizard/steps/StepFinanzierung';
import { StepAfaSteuer } from '@/components/wizard/steps/StepAfaSteuer';
import { StepAnnahmen } from './StepAnnahmen';
import { GefahrenzoneSection } from './GefahrenzoneSection';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const SECTIONS = [
  { key: 'stammdaten', label: 'Stammdaten' },
  { key: 'objektdaten', label: 'Objektdaten' },
  { key: 'kauf', label: 'Kauf' },
  { key: 'einnahmen', label: 'Einnahmen' },
  { key: 'annahmen', label: 'Annahmen' },
  { key: 'kosten', label: 'Kosten' },
  { key: 'finanzierung', label: 'Finanzierung' },
  { key: 'afaSteuer', label: 'AfA & Steuer' },
  { key: 'gefahrenzone', label: 'Gefahrenzone' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DEBOUNCE_MS = 600;

export function PropertyEditForm({ propertyId, property }: { propertyId: string; property: PropertyRow }) {
  const [activeSection, setActiveSection] = useState<SectionKey>('stammdaten');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValuesRef = useRef<PropertyEditFormValues | null>(null);

  const form = useForm<PropertyEditFormValues>({ defaultValues: mapPropertyToEditFormValues(property) });
  const { watch, control } = form;

  useEffect(() => {
    const save = (values: PropertyEditFormValues) => updateProperty(propertyId, mapEditFormValuesToPropertyUpdate(values));

    const subscription = watch((values) => {
      // `values` is typed as a DeepPartial by react-hook-form's watch() signature, but in
      // practice it's never actually partial here: defaultValues (mapPropertyToEditFormValues)
      // populates every field synchronously on construction, regardless of which fields are
      // currently mounted/registered on the active section.
      latestValuesRef.current = values as PropertyEditFormValues;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setSaveState('saving');
        save(values as PropertyEditFormValues)
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (latestValuesRef.current) {
          // Component is unmounting (e.g. user navigated away mid-debounce) — flush the
          // pending edit rather than silently dropping it. Fire-and-forget: there's no
          // component left to show saving/saved/error state to.
          save(latestValuesRef.current).catch(() => {
            // Best-effort flush on unmount; nothing left to report the error to.
          });
        }
      }
    };
  }, [watch, propertyId]);

  const activeLabel = SECTIONS.find((s) => s.key === activeSection)!.label;

  return (
    <FormProvider {...form}>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                section.key === activeSection ? 'bg-accent font-semibold text-white' : 'text-text-secondary hover:bg-black/[0.04]'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="glass-card flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary">{activeLabel}</p>
            <SaveStatus state={saveState} />
          </div>

          {activeSection === 'stammdaten' && <StepStammdaten />}
          {activeSection === 'objektdaten' && <StepObjektdaten />}
          {activeSection === 'kauf' && <StepKauf />}
          {activeSection === 'einnahmen' && <StepEinnahmen />}
          {activeSection === 'annahmen' && <StepAnnahmen control={control} />}
          {activeSection === 'kosten' && <StepKosten />}
          {activeSection === 'finanzierung' && <StepFinanzierung />}
          {activeSection === 'afaSteuer' && <StepAfaSteuer />}
          {activeSection === 'gefahrenzone' && <GefahrenzoneSection propertyId={propertyId} propertyName={property.name} />}
        </div>
      </div>
    </FormProvider>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <span className="text-xs text-text-dim">Speichert…</span>;
  if (state === 'error') return <span className="text-xs text-negative">Speichern fehlgeschlagen</span>;
  return <span className="text-xs text-positive">Gespeichert</span>;
}
