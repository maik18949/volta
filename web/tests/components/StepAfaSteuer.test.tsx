// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { StepAfaSteuer } from '@/components/wizard/steps/StepAfaSteuer';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

function Harness({ overrides = {} }: { overrides?: Partial<WizardFormValues> }) {
  const form = useForm<WizardFormValues>({
    defaultValues: {
      ...makeWizardDefaultValues(makeDate(2026, 7, 25)),
      purchasePriceUnit: 300_000,
      buildingValue: 240_000,
      landValue: 60_000,
      ...overrides,
    },
  });
  return (
    <FormProvider {...form}>
      <StepAfaSteuer />
    </FormProvider>
  );
}

describe('StepAfaSteuer degressive AfA', () => {
  it('zeigt bei Linear weder Wechseljahr noch Warnung und nennt den Restwert in der Zusammenfassung', () => {
    render(<Harness />);
    expect(screen.queryByLabelText(/Wechsel zu linear ab Jahr/)).not.toBeInTheDocument();
    expect(screen.getByText('Restwert Ende 2027')).toBeInTheDocument();
    expect(screen.getByLabelText(/AfA-Satz/)).toBeInTheDocument();
  });

  it('Umschalten auf Degressiv setzt den Satz auf 3 %, benennt ihn um und zeigt das Wechseljahr-Feld', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('AfA-Methode'), { target: { value: 'degressiv_5a' } });
    expect(screen.getByLabelText(/Linearer Satz \(nach Wechsel\)/)).toHaveValue(3);
    expect(screen.getByLabelText(/Wechsel zu linear ab Jahr/)).toBeInTheDocument();
    expect(screen.getByText(/Empfohlen: ab 2040/)).toBeInTheDocument();
  });

  it('„übernehmen" trägt das empfohlene Wechseljahr ein', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', depreciationRate: 0.03 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'übernehmen' }));
    expect(screen.getByLabelText(/Wechsel zu linear ab Jahr/)).toHaveValue(2040);
  });

  it('warnt weich, wenn das Baujahr vor 2023 liegt', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', yearBuilt: 2015 }} />);
    expect(screen.getByText(/nach 2022 fertiggestellt/)).toBeInTheDocument();
  });

  it('warnt, wenn das Wechseljahr nicht nach dem Erwerbsjahr liegt', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', degressiveSwitchYear: 2026 }} />);
    expect(screen.getByText(/Wechseljahr muss nach dem Erwerbsjahr/)).toBeInTheDocument();
  });
});
