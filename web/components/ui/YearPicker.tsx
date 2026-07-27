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
        className="text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="w-12 text-center text-sm font-semibold text-text-primary">{year}</span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        disabled={maxYear !== undefined && year >= maxYear}
        aria-label="Nächstes Jahr"
        className="text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
