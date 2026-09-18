'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import {
  mapPropertyToEditFormValues,
  mapEditFormValuesToPropertyUpdate,
  type PropertyEditFormValues,
} from '@/lib/wizard/propertyEditLogic';
import { updateProperty } from '@/lib/data/propertyActions';
import { SectionNav } from '@/components/ui/SectionNav';
import { FormCard } from '@/components/ui/FormLayout';
import { StepStammdaten } from '@/components/wizard/steps/StepStammdaten';
import { StepObjektdaten } from '@/components/wizard/steps/StepObjektdaten';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { StepEinnahmen } from '@/components/wizard/steps/StepEinnahmen';
import { StepKosten } from '@/components/wizard/steps/StepKosten';
import { StepFinanzierung } from '@/components/wizard/steps/StepFinanzierung';
import { StepAfaSteuer } from '@/components/wizard/steps/StepAfaSteuer';
import { StepAnnahmen } from './StepAnnahmen';
import { GefahrenzoneSection } from './GefahrenzoneSection';
import { FotosSection } from './FotosSection';
import { useReportSaveStatus, type SaveState } from '@/components/property/detail/editSaveStatus';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

// Order follows the redesign's "Bereiche" nav; Fotos live inside Objektdaten.
const SECTIONS = [
  { key: 'stammdaten', label: 'Stammdaten' },
  { key: 'objektdaten', label: 'Objektdaten' },
  { key: 'kauf', label: 'Kauf' },
  { key: 'einnahmen', label: 'Einnahmen' },
  { key: 'kosten', label: 'Kosten' },
  { key: 'finanzierung', label: 'Finanzierung' },
  { key: 'afaSteuer', label: 'AfA & Steuer' },
  { key: 'annahmen', label: 'Annahmen' },
  { key: 'gefahrenzone', label: 'Gefahrenzone' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const AUTOSAVE_DEBOUNCE_MS = 600;

export function PropertyEditForm({
  propertyId,
  property,
  photos,
}: {
  propertyId: string;
  property: PropertyRow;
  photos: PropertyPhotoWithUrl[];
}) {
  const [activeSection, setActiveSection] = useState<SectionKey>('stammdaten');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const reportSaveStatus = useReportSaveStatus();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValuesRef = useRef<PropertyEditFormValues | null>(null);

  const form = useForm<PropertyEditFormValues>({ defaultValues: mapPropertyToEditFormValues(property) });
  const { watch, control } = form;

  // Mirror the autosave state into the detail header ("Gespeichert" next to the title) and
  // clear it again when the user leaves the tab.
  useEffect(() => {
    reportSaveStatus(saveState);
  }, [saveState, reportSaveStatus]);
  useEffect(() => () => reportSaveStatus('idle'), [reportSaveStatus]);

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

  const activeIndex = SECTIONS.findIndex((s) => s.key === activeSection);

  return (
    <FormProvider {...form}>
      <div className="flex w-full items-start gap-6">
        <SectionNav
          heading="Bereiche"
          items={SECTIONS.map((s) => s.label)}
          activeIndex={activeIndex}
          onSelect={(i) => setActiveSection(SECTIONS[i].key)}
        />

        <div className="min-w-0 flex-1">
          {activeSection === 'stammdaten' && <StepStammdaten />}
          {activeSection === 'objektdaten' && (
            <StepObjektdaten
              fotos={
                <FormCard title="Fotos">
                  <FotosSection propertyId={propertyId} photos={photos} />
                </FormCard>
              }
            />
          )}
          {activeSection === 'kauf' && <StepKauf />}
          {activeSection === 'einnahmen' && <StepEinnahmen />}
          {activeSection === 'kosten' && <StepKosten />}
          {activeSection === 'finanzierung' && <StepFinanzierung />}
          {activeSection === 'afaSteuer' && <StepAfaSteuer />}
          {activeSection === 'annahmen' && <StepAnnahmen control={control} />}
          {activeSection === 'gefahrenzone' && <GefahrenzoneSection propertyId={propertyId} propertyName={property.name} />}
        </div>
      </div>
    </FormProvider>
  );
}
