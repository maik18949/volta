'use client';

import type { UseFormRegister, Control } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { PercentField } from '@/components/ui/PercentField';
import { TextField } from '@/components/ui/TextField';
import type { InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-text-secondary">{title}</p>
      <div className="glass-card grid grid-cols-2 gap-3 p-4">{children}</div>
    </div>
  );
}

export function InvestmentInputSections({
  register,
  control,
}: {
  register: UseFormRegister<InvestmentCalculatorValues>;
  control: Control<InvestmentCalculatorValues>;
}) {
  return (
    <div className="space-y-6">
      <Section title="Objekt">
        <div className="col-span-2">
          <TextField label="Name" name="name" register={register} required />
        </div>
      </Section>

      <Section title="Kauf — Stufe 1">
        <CurrencyField label="Kaufpreis Wohnung" name="purchasePriceUnit" register={register} required />
        <CurrencyField label="Kaufpreis Stellplatz" name="purchasePriceParking" register={register} />
        <CurrencyField label="Grunderwerbsteuer" name="landTransferTax" register={register} />
        <CurrencyField label="Notarkosten" name="notaryCosts" register={register} />
        <CurrencyField label="Grundbuchkosten" name="landRegistryCosts" register={register} />
        <CurrencyField label="Maklerprovision" name="agentFee" register={register} />
        <CurrencyField label="Gutachterkosten" name="appraisalCosts" register={register} />
        <CurrencyField label="Renovierung gesamt" name="renovationModernizationCosts" register={register} />
        <CurrencyField label="davon aktivierungspflichtig" name="renovationAfaEligible" register={register} />
      </Section>

      <Section title="Einnahmen — Stufe 1">
        <CurrencyField label="Kaltmiete/Monat" name="coldRentMonthly" register={register} required />
        <CurrencyField label="Stellplatzmiete/Monat" name="parkingRentMonthly" register={register} />
        <CurrencyField label="Sonstige Einnahmen/Monat" name="otherIncomeMonthly" register={register} />
        <PercentField label="Leerstandsquote" name="vacancyRateAssumption" control={control} />
      </Section>

      <Section title="Finanzierung — Stufe 2">
        <CurrencyField label="Darlehensbetrag" name="loanAmount" register={register} required />
        <PercentField label="Zinssatz" name="interestRate" control={control} required />
        <PercentField label="Tilgungssatz" name="amortizationRate" control={control} required />
        <CurrencyField label="Monatsrate" name="monthlyMortgage" register={register} />
        <TextField label="Darlehensbeginn" name="loanStartDate" register={register} type="date" />
      </Section>

      <Section title="Kosten — Stufe 3">
        <CurrencyField label="Hausgeld gesamt/Monat" name="hoaFeeTotalMonthly" register={register} />
        <CurrencyField label="davon umlagefähig/Monat" name="hoaFeeRecoverableMonthly" register={register} />
        <CurrencyField label="davon Instandhaltungsrücklage/Monat" name="hoaFeeMaintenanceReserveMonthly" register={register} />
        <CurrencyField label="Hausverwaltung/Jahr" name="propertyManagementAnnual" register={register} />
        <CurrencyField label="Gebäudeversicherung/Jahr" name="propertyInsuranceAnnual" register={register} />
        <CurrencyField label="Sonstige Kosten/Monat" name="otherCostsMonthly" register={register} />
      </Section>

      <Section title="AfA & Steuer — Stufe 4">
        <CurrencyField label="Gebäudewert" name="buildingValue" register={register} />
        <PercentField label="AfA-Satz" name="depreciationRate" control={control} />
        <PercentField label="Grenzsteuersatz" name="marginalTaxRate" control={control} />
      </Section>
    </div>
  );
}
