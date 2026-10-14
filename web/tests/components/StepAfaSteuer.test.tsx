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
  it('zeigt bei Linear den AfA-Satz und die Vorschau mit Ausblick-Tabelle und Restwert', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/AfA-Satz/)).toBeInTheDocument();
    expect(screen.getByText('AfA-Vorschau')).toBeInTheDocument();
    expect(screen.getByText('Ausblick')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Restwert' })).toBeInTheDocument();
    expect(screen.getByText('2036')).toBeInTheDocument();
    expect(screen.getByText('Vollständig abgeschrieben')).toBeInTheDocument();
  });

  it('gliedert den Schritt in Kaufpreisaufteilung und AfA & Steuer', () => {
    render(<Harness />);
    expect(screen.getByText('Kaufpreisaufteilung')).toBeInTheDocument();
    expect(screen.getAllByText('AfA & Steuer').length).toBeGreaterThan(0);
  });

  it('schlüsselt die Bemessungsgrundlage auf', () => {
    render(
      <Harness
        overrides={{ landTransferTax: 15_000, notaryCosts: 4_500, landRegistryCosts: 1_500, renovationAfaEligible: 10_000 }}
      />
    );
    // Nebenkosten 21.000 € × Gebäudeanteil 80 % = 16.800 €; Basis 240.000 + 16.800 + 10.000 = 266.800 €
    expect(screen.getByText('Anteilige Kaufnebenkosten').parentElement).toHaveTextContent(/16\.800/);
    expect(screen.getByText('Aktivierte Renovierung')).toBeInTheDocument();
    expect(screen.getAllByText('Bemessungsgrundlage').length).toBeGreaterThan(0);
    expect(screen.getByText('Bemessungsgrundlage', { selector: 'dt' }).parentElement).toHaveTextContent(/266\.800/);
  });

  it('legt die Satz-Übersicht bei Linear in einen Infotip statt neben das Label', () => {
    render(<Harness />);
    const hint = /2 % ab 1925 · 2,5 % vor 1925 · 3 % Neubau ab 2023/;
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Info' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent(hint);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('das Infotip nimmt dem Eingabefeld nicht das Label weg', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/AfA-Satz/)).toHaveAttribute('type', 'number');
  });

  it('bietet die Methode ohne Paragraphenhinweis im Label an', () => {
    render(<Harness />);
    const options = Array.from(screen.getByLabelText('AfA-Methode').querySelectorAll('option')).map((option) => option.textContent);
    expect(options).toEqual(['Linear', 'Degressiv 5 %']);
  });

  it('Degressiv blendet den AfA-Satz aus (fest 3 %) und hat kein Wechseljahr-Feld', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('AfA-Methode'), { target: { value: 'degressiv_5a' } });
    expect(screen.queryByLabelText(/AfA-Satz/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Linearer Satz/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Wechsel zu linear/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Grenzsteuersatz/)).toBeInTheDocument();
  });

  it('Degressiv rechnet die Zusammenfassung mit 5 % vom Restwert', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', depreciationRate: 0.03 }} />);
    // Basis 240.000 €, Übergang 25.7.2026 (6 Monate): 240.000 × 5 % × 6/12 = 6.000 €
    expect(screen.getByRole('row', { name: /2026/ })).toHaveTextContent(/6\.000/);
    expect(screen.getByText(/Wechsel zu linear kannst du später im Steuer-Tab/)).toBeInTheDocument();
    expect(screen.getByText(/nie \(ohne Wechsel\)/)).toBeInTheDocument();
  });

  it('warnt weich, wenn das Baujahr vor 2023 liegt', () => {
    render(<Harness overrides={{ depreciationMethod: 'degressiv_5a', yearBuilt: 2015 }} />);
    expect(screen.getByText(/nach 2022 fertiggestellt/)).toBeInTheDocument();
  });
});
