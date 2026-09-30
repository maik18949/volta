// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { BuildingShareFields } from '@/components/wizard/BuildingShareFields';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { formatCurrency } from '@/lib/formatters';

afterEach(cleanup);

function Harness({ price, building, land }: { price: number; building: number; land: number }) {
  const form = useForm<WizardFormValues>({
    defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), buildingValue: building, landValue: land },
  });
  const [b, l] = useWatch({ control: form.control, name: ['buildingValue', 'landValue'] });
  const buildingDirty = Boolean(form.formState.dirtyFields.buildingValue);
  return (
    <FormProvider {...form}>
      <BuildingShareFields purchasePrice={price} buildingLabel="Gebäudewert" landLabel="Grundstückswert" />
      <output data-testid="values">{JSON.stringify({ b, l })}</output>
      <output data-testid="dirty">{String(buildingDirty)}</output>
    </FormProvider>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as { b: number; l: number };

describe('BuildingShareFields', () => {
  it('starts in euro mode with both euro fields', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    expect(screen.getByLabelText(/Gebäudewert/)).toHaveValue(140000);
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(35000);
    expect(screen.getByRole('button', { name: '€' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the current share when switching to percent and hides the euro inputs', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/^Gebäudeanteil/)).toHaveValue('80');
    expect(screen.queryByLabelText(/^Gebäudewert/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveAttribute('readonly');
  });

  it('does not change the euro values just by switching modes', () => {
    render(<Harness price={175000} building={141234} land={33766} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.click(screen.getByRole('button', { name: '€' }));
    expect(values()).toEqual({ b: 141234, l: 33766 });
    expect(screen.getByLabelText(/Gebäudewert/)).toHaveValue(141234);
  });

  it('computes building value and remainder from the typed percentage', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '50' } });
    expect(values()).toEqual({ b: 87500, l: 87500 });
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(formatCurrency(87500));
  });

  it('shows the remainder (not the building value) as read-only land value', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '30' } });
    expect(values()).toEqual({ b: 52500, l: 122500 });
    const land = screen.getByLabelText(/Grundstückswert/);
    expect(land).toHaveValue(formatCurrency(122500));
    expect(land).not.toHaveValue(formatCurrency(52500));
  });

  it.each([
    ['negative', -1000],
    ['NaN', Number.NaN],
  ])('writes 0/0 and never negative or NaN euro values for a %s purchase price', (_name, price) => {
    render(<Harness price={price} building={0} land={0} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '40' } });
    expect(values()).toEqual({ b: 0, l: 0 });
  });

  it('keeps the percentage and recalculates when the purchase price changes', () => {
    const { rerender } = render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '50' } });
    rerender(<Harness price={200000} building={140000} land={35000} />);
    expect(values()).toEqual({ b: 100000, l: 100000 });
  });

  it('ignores a percentage above 100 and accepts exactly 100', () => {
    render(<Harness price={1000} building={800} land={200} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    const field = screen.getByLabelText(/^Gebäudeanteil/);
    fireEvent.change(field, { target: { value: '150' } });
    expect(field).toHaveValue('80');
    expect(values()).toEqual({ b: 800, l: 200 });
    fireEvent.change(field, { target: { value: '100' } });
    expect(field).toHaveValue('100');
    expect(values()).toEqual({ b: 1000, l: 0 });
  });

  it('clamps the displayed share when the euro values are inconsistent and keeps them untouched', () => {
    render(<Harness price={175000} building={200000} land={0} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/^Gebäudeanteil/)).toHaveValue('100');
    expect(values()).toEqual({ b: 200000, l: 0 });
  });

  it('clamps a negative legacy building value to 0 when switching to percent', () => {
    render(<Harness price={175000} building={-5000} land={180000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/^Gebäudeanteil/)).toHaveValue('0');
    expect(values()).toEqual({ b: -5000, l: 180000 });
  });

  it('keeps both euro values at 0 when typing a percentage without a purchase price', () => {
    render(<Harness price={0} building={0} land={0} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '40' } });
    expect(values()).toEqual({ b: 0, l: 0 });
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(formatCurrency(0));
  });

  it('writes building 0 and land = price when the percent field is cleared', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '' } });
    expect(values()).toEqual({ b: 0, l: 175000 });
  });

  it('accepts comma and trailing dot and shows what was typed', () => {
    render(<Harness price={200000} building={0} land={200000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    const field = screen.getByLabelText(/^Gebäudeanteil/);
    fireEvent.change(field, { target: { value: '33,5' } });
    expect(field).toHaveValue('33,5');
    expect(values()).toEqual({ b: 67000, l: 133000 });
    fireEvent.change(field, { target: { value: '33.' } });
    expect(field).toHaveValue('33.');
    expect(values()).toEqual({ b: 66000, l: 134000 });
  });

  it('ignores invalid input completely', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    const field = screen.getByLabelText(/^Gebäudeanteil/);
    for (const bad of ['abc', '-', '1e3', '150.555']) {
      fireEvent.change(field, { target: { value: bad } });
      expect(field).toHaveValue('80');
      expect(values()).toEqual({ b: 140000, l: 35000 });
    }
  });

  it('shows the edited euro values in the euro inputs after switching back', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: '€' }));
    expect(screen.getByLabelText(/Gebäudewert/)).toHaveValue(52500);
    expect(screen.getByLabelText(/Grundstückswert/)).toHaveValue(122500);
  });

  it('recomputes on a purchase price change under StrictMode', () => {
    const { rerender } = render(
      <StrictMode>
        <Harness price={175000} building={140000} land={35000} />
      </StrictMode>
    );
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '50' } });
    rerender(
      <StrictMode>
        <Harness price={200000} building={140000} land={35000} />
      </StrictMode>
    );
    expect(values()).toEqual({ b: 100000, l: 100000 });
  });

  it('marks the building value dirty after typing a percentage', () => {
    render(<Harness price={175000} building={140000} land={35000} />);
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Gebäudeanteil/), { target: { value: '30' } });
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
  });

  it('leaves the percent field empty without a purchase price', () => {
    render(<Harness price={0} building={0} land={0} />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText(/^Gebäudeanteil/)).toHaveValue('');
  });
});
