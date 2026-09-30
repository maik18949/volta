// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { useLandTransferTaxAutoSync } from '@/components/wizard/useLandTransferTaxAutoSync';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

// Like the production form roots: the auto-sync hook lives at the root, not in the step.
function useWizardForm(overrides: Partial<WizardFormValues>) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
  });
  useLandTransferTaxAutoSync(form);
  return form;
}

// Edit-form style: a saved value is opened in manual mode (see mapPropertyToEditFormValues).
const EDIT_FORM: Partial<WizardFormValues> = { landTransferTaxMode: 'manual' };

function Harness({ overrides = {}, onFormChange }: { overrides?: Partial<WizardFormValues>; onFormChange?: () => void }) {
  const form = useWizardForm(overrides);
  const { watch } = form;
  useEffect(() => {
    if (!onFormChange) return;
    const subscription = watch(() => onFormChange());
    return () => subscription.unsubscribe();
  }, [watch, onFormChange]);
  return (
    <FormProvider {...form}>
      <StepKauf />
    </FormProvider>
  );
}

// Keeps the form alive while the step can be unmounted (wizard navigation) and lets tests change the Bundesland.
function ControlledHarness({ overrides = {} }: { overrides?: Partial<WizardFormValues> }) {
  const form = useWizardForm(overrides);
  const [mounted, setMounted] = useState(true);
  return (
    <FormProvider {...form}>
      <button type="button" onClick={() => setMounted((m) => !m)}>
        remount step
      </button>
      <button type="button" onClick={() => form.setValue('state', 'Bayern')}>
        select Bayern
      </button>
      <button type="button" onClick={() => form.setValue('state', '')}>
        clear Bundesland
      </button>
      {mounted && <StepKauf />}
    </FormProvider>
  );
}

// The CurrencyField label also wraps the "€" suffix (and a required asterisk), so match the start only.
const taxField = () => screen.getByLabelText(/^Grunderwerbsteuer/);
const priceField = () => screen.getByLabelText(/^Kaufpreis Wohnung/);

describe('StepKauf Grunderwerbsteuer suggestion', () => {
  it('fills in rate x purchase price in automatic mode and explains it', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    expect(screen.getByText(/Sachsen 5,5\s% \(Vorschlag\)/)).toBeInTheDocument();
  });

  it('includes the parking price in the base', async () => {
    render(
      <Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, purchasePriceParking: 25000, parkingType: 'tiefgarage' }} />
    );
    await waitFor(() => expect(taxField()).toHaveValue(11000));
  });

  it('recalculates when the purchase price changes', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    fireEvent.change(priceField(), { target: { value: '200000' } });
    await waitFor(() => expect(taxField()).toHaveValue(11000));
  });

  it('asks for a Bundesland while none is chosen', () => {
    render(<Harness overrides={{ purchasePriceUnit: 175000 }} />);
    expect(taxField()).toHaveValue(0);
    expect(screen.getByText('Bundesland wählen, dann erscheint ein Vorschlag.')).toBeInTheDocument();
  });

  it('switches to manual on user edit, keeps the value and offers a reset', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));

    fireEvent.change(taxField(), { target: { value: '8000' } });
    fireEvent.change(priceField(), { target: { value: '200000' } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument());
    expect(taxField()).toHaveValue(8000);
    expect(screen.getByText(/wären/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    await waitFor(() => expect(taxField()).toHaveValue(11000));
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument();
  });

  it('never overwrites a saved value in an edit form (mode manual)', async () => {
    render(<Harness overrides={{ ...EDIT_FORM, state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }} />);
    expect(taxField()).toHaveValue(1234);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('suggests 0 without complaint for a purchase price of 0', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 0 }} />);
    await waitFor(() => expect(screen.getByText(/Sachsen 5,5\s% \(Vorschlag\)/)).toBeInTheDocument());
    expect(taxField()).toHaveValue(0);
  });

  it('keeps a saved value equal to the suggestion in an edit form (mode manual)', async () => {
    render(<Harness overrides={{ ...EDIT_FORM, state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 9625 }} />);
    expect(taxField()).toHaveValue(9625);

    fireEvent.change(priceField(), { target: { value: '200000' } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument());
    expect(taxField()).toHaveValue(9625);
  });

  it('follows the price in automatic mode when the value equals the suggestion', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 9625 }} />);
    expect(taxField()).toHaveValue(9625);

    fireEvent.change(priceField(), { target: { value: '200000' } });

    await waitFor(() => expect(taxField()).toHaveValue(11000));
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument();
  });

  it('stays manual with a user-typed value when the step is remounted', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    fireEvent.change(taxField(), { target: { value: '8000' } });

    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));
    expect(screen.queryByLabelText(/^Grunderwerbsteuer/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));

    expect(taxField()).toHaveValue(8000);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('follows a Bundesland change in automatic mode', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 100000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(5500));

    fireEvent.click(screen.getByRole('button', { name: 'select Bayern' }));

    await waitFor(() => expect(taxField()).toHaveValue(3500));
    expect(screen.getByText(/Bayern 3,5\s% \(Vorschlag\)/)).toBeInTheDocument();
  });

  it('keeps the value on a Bundesland change in manual mode and shows the new amount', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 100000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(5500));
    fireEvent.change(taxField(), { target: { value: '8000' } });

    fireEvent.click(screen.getByRole('button', { name: 'select Bayern' }));

    await waitFor(() => expect(screen.getByText(/Bayern 3,5\s% wären 3\.500,00/)).toBeInTheDocument());
    expect(taxField()).toHaveValue(8000);
  });

  it('points the tax input at the status element carrying the hint', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    const hintId = taxField().getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    const hint = document.getElementById(hintId as string);
    expect(hint).toHaveAttribute('role', 'status');
    expect(hint).toHaveTextContent(/Sachsen 5,5\s% \(Vorschlag\)/);
  });

  it('keeps the reset button outside the status region and announces only the text', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    fireEvent.change(taxField(), { target: { value: '8000' } });
    fireEvent.change(priceField(), { target: { value: '200000' } });
    const button = await screen.findByRole('button', { name: 'Zurücksetzen' });
    const hint = document.getElementById(taxField().getAttribute('aria-describedby') as string) as HTMLElement;
    expect(hint).toHaveAttribute('role', 'status');
    expect(hint).not.toContainElement(button);
    expect(hint).toHaveTextContent(/^Sachsen 5,5\s% wären 11\.000,00\s€\s·$/);
    expect(hint.querySelector('[aria-hidden="true"]')).toHaveTextContent('·');
  });

  it('keeps a user-typed 0 across a remount because the mode is manual', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(9625));
    fireEvent.change(taxField(), { target: { value: '0' } });
    expect(taxField()).toHaveValue(0);

    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));
    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));

    expect(taxField()).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('follows a Bundesland change made while the step was unmounted (wizard: back to step 1)', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 100000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(5500));

    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));
    fireEvent.click(screen.getByRole('button', { name: 'select Bayern' }));
    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));

    await waitFor(() => expect(taxField()).toHaveValue(3500));
    expect(screen.getByText(/Bayern 3,5\s% \(Vorschlag\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument();
  });

  it('keeps a manual value when the Bundesland changes while the step was unmounted and shows the new amount', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 100000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(5500));
    fireEvent.change(taxField(), { target: { value: '8000' } });

    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));
    fireEvent.click(screen.getByRole('button', { name: 'select Bayern' }));
    fireEvent.click(screen.getByRole('button', { name: 'remount step' }));

    await waitFor(() => expect(screen.getByText(/Bayern 3,5\s% wären 3\.500,00/)).toBeInTheDocument());
    expect(taxField()).toHaveValue(8000);
  });

  it('does not write to the form on mount in an edit form (no extra autosave)', async () => {
    const onFormChange = vi.fn();
    render(
      <Harness
        onFormChange={onFormChange}
        overrides={{ ...EDIT_FORM, state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }}
      />
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(taxField()).toHaveValue(1234);
    expect(onFormChange).not.toHaveBeenCalled();
  });

  it('keeps the computed amount when the Bundesland is cleared in automatic mode', async () => {
    render(<ControlledHarness overrides={{ state: 'Sachsen', purchasePriceUnit: 100000 }} />);
    await waitFor(() => expect(taxField()).toHaveValue(5500));

    fireEvent.click(screen.getByRole('button', { name: 'clear Bundesland' }));

    await waitFor(() => expect(screen.getByText('Bundesland wählen, dann erscheint ein Vorschlag.')).toBeInTheDocument());
    expect(taxField()).toHaveValue(5500);
  });
});
