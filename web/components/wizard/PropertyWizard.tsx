'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  type WizardFormValues,
  makeWizardDefaultValues,
  canProceedFromStep,
  canFinish,
  totalSteps,
  mapToPropertyInsert,
  mapToStatusEntryInserts,
} from '@/lib/wizard/wizardLogic';
import { createProperty } from '@/lib/data/propertyActions';
import { SectionNav } from '@/components/ui/SectionNav';
import { StepStammdaten } from './steps/StepStammdaten';
import { StepObjektdaten } from './steps/StepObjektdaten';
import { StepKauf } from './steps/StepKauf';
import { StepEinnahmen } from './steps/StepEinnahmen';
import { StepKosten } from './steps/StepKosten';
import { StepFinanzierung } from './steps/StepFinanzierung';
import { StepAfaSteuer } from './steps/StepAfaSteuer';
import { StepStatusOnboarding } from './steps/StepStatusOnboarding';

// Same labels as the Immobiliendaten "Bereiche" nav (minus Annahmen/Gefahrenzone, which only
// exist for an already-created property), plus the conditional Nutzungsverlauf step.
const STEP_TITLES = [
  'Stammdaten',
  'Objektdaten',
  'Kauf',
  'Einnahmen',
  'Kosten',
  'Finanzierung',
  'AfA & Steuer',
  'Nutzungsverlauf',
];

const PRIMARY_BUTTON = 'rounded-[9px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50';

export function PropertyWizard() {
  const router = useRouter();
  const [today] = useState(() => new Date());
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<WizardFormValues>({ defaultValues: makeWizardDefaultValues(today) });
  const { control } = form;
  // defaultValues fully populates every field, so after mount this is never
  // actually partial — the cast keeps the pure wizardLogic functions (which
  // take a complete WizardFormValues) usable without a second parallel type.
  const values = useWatch({ control }) as WizardFormValues;

  const stepCount = totalSteps(values, today);

  function handleNext() {
    if (canProceedFromStep(currentStep, values)) {
      setCurrentStep((s) => Math.min(s + 1, stepCount));
    }
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  function handleFinish() {
    setSubmitError(null);
    const propertyInsert = mapToPropertyInsert(values);
    const statusEntryInserts = mapToStatusEntryInserts(values, today);
    startTransition(async () => {
      try {
        await createProperty(propertyInsert, statusEntryInserts);
        router.push('/');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      }
    });
  }

  return (
    <FormProvider {...form}>
      <div className="flex w-full items-start gap-6">
        <SectionNav
          heading="Bereiche"
          items={STEP_TITLES.slice(0, stepCount)}
          activeIndex={currentStep - 1}
          onSelect={(i) => setCurrentStep(i + 1)}
        />

        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[13px] font-semibold text-text-secondary">
            Schritt {currentStep} von {stepCount}
          </p>
          {currentStep === 1 && <StepStammdaten />}
          {currentStep === 2 && <StepObjektdaten />}
          {currentStep === 3 && <StepKauf />}
          {currentStep === 4 && <StepEinnahmen />}
          {currentStep === 5 && <StepKosten />}
          {currentStep === 6 && <StepFinanzierung />}
          {currentStep === 7 && <StepAfaSteuer />}
          {currentStep === 8 && <StepStatusOnboarding />}

          {submitError && (
            <p role="alert" className="mt-4 text-[13px] text-negative">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-[9px] border border-black/10 bg-white px-4 py-2 text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
                >
                  Zurück
                </button>
              )}
            </div>
            {currentStep < stepCount ? (
              <button type="button" onClick={handleNext} disabled={!canProceedFromStep(currentStep, values)} className={PRIMARY_BUTTON}>
                Weiter
              </button>
            ) : (
              <button type="button" onClick={handleFinish} disabled={!canFinish(values) || isPending} className={PRIMARY_BUTTON}>
                {isPending ? 'Wird gespeichert…' : 'Fertigstellen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
