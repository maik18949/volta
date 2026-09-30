// @vitest-environment jsdom
import { StrictMode } from 'react';
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

  it('sets the Bundesland for a unique PLZ and says so', () => {
    render(<Harness />);
    typePostalCode('01099');
    expect(screen.getByText('Aus PLZ erkannt')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Sachsen');
  });

  it('clears the Bundesland and names both candidates for an ambiguous PLZ', () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('65326');
    expect(screen.getByText('PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundesland')).toHaveValue('');
  });

  it('keeps the Bundesland and asks for a valid PLZ when a complete PLZ is unknown', () => {
    render(<Harness overrides={{ state: 'Bayern' }} />);
    typePostalCode('00000');
    expect(screen.getByText('Gültige Postleitzahl eingeben')).toBeInTheDocument();
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

  it('links the Bundesland select to a status region with the current hint', () => {
    render(<Harness />);
    typePostalCode('01099');
    const select = screen.getByLabelText('Bundesland');
    const status = document.getElementById(select.getAttribute('aria-describedby') ?? '');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('Aus PLZ erkannt');
  });

  it('drops the ambiguity hint once the user picks a Bundesland', () => {
    render(<Harness />);
    typePostalCode('65326');
    const select = screen.getByLabelText('Bundesland');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Hessen und Rheinland-Pfalz');
    fireEvent.change(select, { target: { value: 'Hessen' } });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('replaces a legacy value by the PLZ-derived Bundesland', () => {
    render(<Harness overrides={{ state: 'NRW' }} />);
    typePostalCode('01099');
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Sachsen');
    expect(screen.queryByRole('option', { name: 'NRW (bitte prüfen)' })).not.toBeInTheDocument();
  });

  it('does not touch a saved Bundesland on mount in StrictMode', () => {
    render(
      <StrictMode>
        <Harness overrides={{ postalCode: '01099', state: 'Bayern' }} />
      </StrictMode>,
    );
    expect(screen.getByLabelText('Bundesland')).toHaveValue('Bayern');
  });
});
