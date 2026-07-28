import { getInvestmentCalculations } from '@/lib/data/investmentCalculations';
import { InvestmentCalculatorList } from '@/components/investment-calculator/InvestmentCalculatorList';
import { NewCalculationButton } from '@/components/investment-calculator/NewCalculationButton';

export default async function InvestmentCalculatorPage() {
  const calculations = await getInvestmentCalculations();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Investment-Rechner</h1>
        <NewCalculationButton />
      </div>
      <InvestmentCalculatorList calculations={calculations} />
    </div>
  );
}
