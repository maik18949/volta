// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepStammdaten } from '@/components/wizard/steps/StepStammdaten';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {} }: { overrides?: Partial<WizardFormValues> }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
  });
  return (
    <FormProvider {...form}>
      <StepStammdaten />
    </FormProvider>
  );
}

function typePostalCode(value: string) {
  fireEvent.change(screen.getByLabelText('PLZ'), { target: { value } });
}

describe('StepStammdaten Bundesland from PLZ', () => {
  it('offers all 16 Bundesländer plus the empty option', () => {
    render(<Harness />);
    const select = screen.getByLabelText('Bundesland');
    expect(select.querySelectorAll('option')).toHaveLength(17);
  });

  it('sets the Bundesland for a unique PLZ and says so', async () => {
    render(<Harness />);
    typePostalCode('01099');
    expect(await screen.findByText('Aus PLZ erkannt')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Sachsen');
  });

  it('clears the Bundesland and names both candidates for an ambiguous PLZ', async () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('65326');
    expect(await screen.findByText('PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('');
  });

  it('keeps the Bundesland and asks for a valid PLZ when a complete PLZ is unknown', async () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('00000');
    expect(await screen.findByText('Gültige Postleitzahl eingeben')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('shows no hint while the PLZ is incomplete', () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('0109');
    expect(screen.queryByText('Gültige Postleitzahl eingeben')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('does not touch a saved Bundesland on mount', () => {
    render(<Harness overrides={{ postalCode: '01099', state: 'Bayern' }} />);
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });

  it('keeps an unrecognized legacy value as a selectable option', () => {
    render(<Harness overrides={{ state: 'NRW' }} />);
    expect(screen.getByRole('option', { name: 'NRW (bitte prüfen)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('NRW');
  });
});
