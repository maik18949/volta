// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useLandTransferTaxAutoSync } from '@/components/wizard/useLandTransferTaxAutoSync';
import { makeWizardDefaultValues, type WizardFormValues } from '@/lib/wizard/wizardLogic';
import { makeDate } from '@/lib/calculations/dateHelpers';

afterEach(cleanup);

// No step component is mounted: the hook alone must keep the tax in sync (wizard jumps between steps).
function setup(overrides: Partial<WizardFormValues>) {
  const setValueSpy = vi.fn();
  const hook = renderHook(() => {
    const form = useForm<WizardFormValues>({
      defaultValues: { ...makeWizardDefaultValues(makeDate(2026, 7, 25)), ...overrides },
    });
    const setValue: typeof form.setValue = (...args) => {
      setValueSpy(...args);
      form.setValue(...args);
    };
    useLandTransferTaxAutoSync({ control: form.control, setValue });
    return form;
  });
  return { ...hook, setValueSpy, form: () => hook.result.current };
}

describe('useLandTransferTaxAutoSync', () => {
  it('fills the suggestion in automatic mode', () => {
    const { form } = setup({ state: 'Sachsen', purchasePriceUnit: 100000 });
    expect(form().getValues('landTransferTax')).toBe(5500);
  });

  it('follows a Bundesland change without any step mounted', () => {
    const { form } = setup({ state: 'Sachsen', purchasePriceUnit: 100000 });
    act(() => form().setValue('state', 'Bayern'));
    expect(form().getValues('landTransferTax')).toBe(3500);
  });

  it('follows the purchase price', () => {
    const { form } = setup({ state: 'Sachsen', purchasePriceUnit: 100000 });
    act(() => form().setValue('purchasePriceUnit', 200000));
    expect(form().getValues('landTransferTax')).toBe(11000);
  });

  it('follows the parking type and price', () => {
    const { form } = setup({ state: 'Sachsen', purchasePriceUnit: 100000, purchasePriceParking: 20000, parkingType: 'tiefgarage' });
    expect(form().getValues('landTransferTax')).toBe(6600);
    act(() => form().setValue('parkingType', 'nicht_vorhanden'));
    expect(form().getValues('landTransferTax')).toBe(5500);
  });

  it('never writes in manual mode', () => {
    const { form, setValueSpy } = setup({ state: 'Sachsen', purchasePriceUnit: 100000, landTransferTax: 1234, landTransferTaxMode: 'manual' });
    act(() => form().setValue('state', 'Bayern'));
    expect(form().getValues('landTransferTax')).toBe(1234);
    expect(setValueSpy).not.toHaveBeenCalled();
  });

  it('never writes when the mode is unknown', () => {
    const { form } = setup({
      state: 'Sachsen',
      purchasePriceUnit: 100000,
      landTransferTax: 1234,
      landTransferTaxMode: undefined as unknown as WizardFormValues['landTransferTaxMode'],
    });
    expect(form().getValues('landTransferTax')).toBe(1234);
  });

  it('never writes without a Bundesland', () => {
    const { form, setValueSpy } = setup({ state: '', purchasePriceUnit: 100000, landTransferTax: 777 });
    expect(form().getValues('landTransferTax')).toBe(777);
    expect(setValueSpy).not.toHaveBeenCalled();
  });

  it('does not write again when re-rendered with unchanged inputs', () => {
    const { rerender, setValueSpy } = setup({ state: 'Sachsen', purchasePriceUnit: 100000 });
    expect(setValueSpy).toHaveBeenCalledTimes(1);
    rerender();
    rerender();
    expect(setValueSpy).toHaveBeenCalledTimes(1);
  });
});
