'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function YearPicker({
  year,
  onChange,
  minYear,
  maxYear,
}: {
  year: number;
  onChange: (year: number) => void;
  minYear: number;
  maxYear?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        disabled={year <= minYear}
        aria-label="Vorheriges Jahr"
        className="flex p-0.5 text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
      </button>
      <span className="w-12 text-center text-[13px] font-bold text-text-primary">{year}</span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        disabled={maxYear !== undefined && year >= maxYear}
        aria-label="Nächstes Jahr"
        className="flex p-0.5 text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
