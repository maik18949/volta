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
  mapToStatusEntryInsert,
} from '@/lib/wizard/wizardLogic';
import { createProperty } from '@/lib/data/propertyActions';
import { StepStammdaten } from './steps/StepStammdaten';
import { StepObjektdaten } from './steps/StepObjektdaten';
import { StepKauf } from './steps/StepKauf';
import { StepEinnahmen } from './steps/StepEinnahmen';
import { StepKosten } from './steps/StepKosten';
import { StepFinanzierung } from './steps/StepFinanzierung';
import { StepAfaSteuer } from './steps/StepAfaSteuer';
import { StepStatusOnboarding } from './steps/StepStatusOnboarding';

const STEP_TITLES = [
  'Stammdaten',
  'Objektdaten',
  'Kauf & Nebenkosten',
  'Einnahmen',
  'Kosten',
  'Finanzierung',
  'AfA & Steuer',
  'Nutzungsverlauf',
];

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
    const statusEntryInsert = mapToStatusEntryInsert(values, today);
    startTransition(async () => {
      try {
        await createProperty(propertyInsert, statusEntryInsert);
        router.push('/');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      }
    });
  }

  return (
    <FormProvider {...form}>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {Array.from({ length: stepCount }, (_, i) => i + 1).map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                step === currentStep
                  ? 'bg-accent font-semibold text-white'
                  : 'text-text-secondary hover:bg-black/[0.04]'
              }`}
            >
              {step}. {STEP_TITLES[step - 1]}
            </button>
          ))}
        </nav>

        <div className="glass-card flex-1 p-6">
          <p className="mb-4 text-xs font-semibold text-text-secondary">
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
            <p role="alert" className="mt-4 text-sm text-negative">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-black/[0.06] pt-4">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-md border border-black/10 px-4 py-2 text-sm text-text-primary"
                >
                  Zurück
                </button>
              )}
            </div>
            {currentStep < stepCount ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep, values)}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish(values) || isPending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? 'Wird gespeichert…' : 'Fertigstellen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
