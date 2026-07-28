import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInvestmentCalculation } from '@/lib/data/investmentCalculations';
import { InvestmentCalculatorDetail } from '@/components/investment-calculator/InvestmentCalculatorDetail';

export default async function InvestmentCalculatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculation = await getInvestmentCalculation(id);
  if (!calculation) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/investment-calculator" className="text-xs text-text-dim hover:underline">
        ← Investment-Rechner
      </Link>
      <InvestmentCalculatorDetail calculation={calculation} />
    </div>
  );
}
