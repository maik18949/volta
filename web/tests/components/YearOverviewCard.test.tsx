// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/lib/data/propertyTax', () => ({
  computeTaxCurrentYear: vi.fn(() => ({})),
  computeTaxForecastYear: vi.fn(() => ({})),
}));
vi.mock('@/components/property/steuer/CurrentYearSection', () => ({ CurrentYearSection: () => <div>Ist-Ansicht</div> }));
vi.mock('@/components/property/steuer/ForecastSection', () => ({ ForecastSection: () => <div>Prognose-Ansicht</div> }));

import { YearOverviewCard } from '@/components/property/steuer/YearOverviewCard';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

afterEach(cleanup);

function renderCard() {
  const property = { parking_type: 'nicht_vorhanden', loan_start_date: '2025-10-01' } as unknown as PropertyRow;
  return render(
    <YearOverviewCard
      property={property}
      statusEntries={[]}
      extraordinaryCosts={[]}
      loanDisbursements={[]}
      today={makeDate(2026, 6, 15)}
      overview={{ actualVacancyRate: null } as never}
      economicTransferDate={makeDate(2026, 2, 1)}
    />
  );
}

describe('YearOverviewCard (Steuer-Tab)', () => {
  it('startet beim Folgejahr als Prognose, nicht beim aktuellen Jahr', () => {
    renderCard();
    expect(screen.getByText('2027')).toBeInTheDocument();
    expect(screen.queryByText('2026')).not.toBeInTheDocument();
    expect(screen.getByText('Prognose')).toBeInTheDocument();
    expect(screen.getByText('Prognose-Ansicht')).toBeInTheDocument();
  });

  it('der Jahreswähler überspringt das aktuelle Jahr in beide Richtungen', () => {
    renderCard();
    fireEvent.click(screen.getByLabelText('Vorheriges Jahr'));
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Ist')).toBeInTheDocument();
    expect(screen.getByText('Ist-Ansicht')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Nächstes Jahr'));
    expect(screen.getByText('2027')).toBeInTheDocument();
  });

  it('das früheste Jahr ist das Erwerbs- bzw. Kreditjahr (2025), davor gibt es nichts', () => {
    renderCard();
    fireEvent.click(screen.getByLabelText('Vorheriges Jahr'));
    expect(screen.getByLabelText('Vorheriges Jahr')).toBeDisabled();
  });
});
