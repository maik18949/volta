'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function YearPicker({
  year,
  onChange,
  minYear,
  maxYear,
  skipYear,
}: {
  year: number;
  onChange: (year: number) => void;
  minYear: number;
  maxYear?: number;
  /** Ein Jahr, das beim Blättern übersprungen wird (z. B. weil es an anderer Stelle schon angezeigt wird). */
  skipYear?: number;
}) {
  const previousYear = skipYear !== undefined && year - 1 === skipYear ? year - 2 : year - 1;
  const nextYear = skipYear !== undefined && year + 1 === skipYear ? year + 2 : year + 1;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(previousYear)}
        disabled={previousYear < minYear}
        aria-label="Vorheriges Jahr"
        className="flex p-0.5 text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
      </button>
      <span className="w-12 text-center text-[13px] font-bold text-text-primary">{year}</span>
      <button
        type="button"
        onClick={() => onChange(nextYear)}
        disabled={maxYear !== undefined && nextYear > maxYear}
        aria-label="Nächstes Jahr"
        className="flex p-0.5 text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
