'use client';

import { useEffect } from 'react';
import { useWatch, type Control, type UseFormReturn, type UseFormSetValue } from 'react-hook-form';
import { suggestLandTransferTax } from '@/lib/data/landTransferTaxRates';
import { totalPurchasePrice, type WizardFormValues } from '@/lib/wizard/wizardLogic';

/**
 * Keeps `landTransferTax` at the Bundesland suggestion while `landTransferTaxMode` is 'auto'.
 *
 * Runs at the form root (wizard and edit form), not inside StepKauf: Bundesland (step 1) and Stellplatz (step 2)
 * can change while the Kauf step is not mounted, and the user can jump to the last step and finish.
 * An unknown mode counts as manual, so nothing is ever overwritten when unsure. Idempotent: it only writes
 * when the suggestion differs from the current value.
 */
export function useLandTransferTaxAutoSync<T extends WizardFormValues>(form: Pick<UseFormReturn<T>, 'control' | 'setValue'>) {
  // Structural narrowing: PropertyEditFormValues extends WizardFormValues, but RHF's generics are invariant.
  const control = form.control as unknown as Control<WizardFormValues>;
  const setValue = form.setValue as unknown as UseFormSetValue<WizardFormValues>;
  const [state, mode, landTransferTax, purchasePriceUnit, purchasePriceParking, parkingType] = useWatch({
    control,
    name: ['state', 'landTransferTaxMode', 'landTransferTax', 'purchasePriceUnit', 'purchasePriceParking', 'parkingType'],
  });

  useEffect(() => {
    if (mode !== 'auto') return;
    const suggestion = suggestLandTransferTax(state ?? '', totalPurchasePrice({ purchasePriceUnit, purchasePriceParking, parkingType }));
    if (suggestion !== null && suggestion !== landTransferTax) {
      setValue('landTransferTax', suggestion);
    }
  }, [state, mode, landTransferTax, purchasePriceUnit, purchasePriceParking, parkingType, setValue]);
}
