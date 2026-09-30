// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {}, taxStartsManual = false }: { overrides?: Partial<WizardFormValues>; taxStartsManual?: boolean }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
  });
  return (
    <FormProvider {...form}>
      <StepKauf taxStartsManual={taxStartsManual} />
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
    expect(screen.getByText(/Sachsen 5,5 % \(Vorschlag\)/)).toBeInTheDocument();
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

  it('never overwrites a saved value when taxStartsManual is set', async () => {
    render(<Harness taxStartsManual overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }} />);
    expect(taxField()).toHaveValue(1234);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('starts manual in the wizard when the current value differs from the suggestion', () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 175000, landTransferTax: 1234 }} />);
    expect(taxField()).toHaveValue(1234);
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });

  it('suggests 0 without complaint for a purchase price of 0', async () => {
    render(<Harness overrides={{ state: 'Sachsen', purchasePriceUnit: 0 }} />);
    await waitFor(() => expect(screen.getByText(/Sachsen 5,5 % \(Vorschlag\)/)).toBeInTheDocument());
    expect(taxField()).toHaveValue(0);
  });
});
