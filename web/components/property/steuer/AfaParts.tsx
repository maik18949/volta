import type { ReactNode } from 'react';
import { formatCurrency } from '@/lib/formatters';

/** Gemeinsame Bausteine der AfA-Darstellung (Steuer-Tab-Karte und Wizard-Vorschau). */

const SUBHEADING = 'mb-2 text-[10.5px] font-bold uppercase tracking-[0.5px] text-text-secondary';

export interface AfaOutlookRow {
  year: number;
  /** Zusatz hinter dem Jahr, z. B. „in 5 Jahren" oder „10 Monate". */
  label?: string;
  amount: number;
  bookValue: number;
}

/** Kleine Tabelle Jahr · AfA · Restwert plus Schlusszeile „Vollständig abgeschrieben". */
export function AfaOutlookTable({ rows, endYear }: { rows: AfaOutlookRow[]; endYear: number | null }) {
  return (
    <div>
      <p className={SUBHEADING}>Ausblick</p>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-[11px] text-text-secondary">
            <th scope="col" className="pb-1.5 text-left font-medium">
              Jahr
            </th>
            <th scope="col" className="pb-1.5 text-right font-medium">
              AfA
            </th>
            <th scope="col" className="pb-1.5 text-right font-medium">
              Restwert
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} className="border-t border-black/[0.06]">
              <td className="py-2 text-left">
                <span className="font-semibold text-text-primary">{row.year}</span>
                {row.label && <span className="ml-1.5 text-[11px] text-text-dim">{row.label}</span>}
              </td>
              <td className="py-2 text-right font-semibold text-text-primary">{formatCurrency(row.amount)}</td>
              <td className="py-2 text-right text-text-secondary">{formatCurrency(row.bookValue)}</td>
            </tr>
          ))}
          <tr className="border-t border-black/[0.06]">
            <td className="py-2 text-left text-text-secondary">Vollständig abgeschrieben</td>
            <td colSpan={2} className="py-2 text-right font-semibold text-text-primary">
              {endYear !== null ? endYear : <span className="font-normal text-text-secondary">nie (ohne Wechsel)</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Beschriftete Liste aus `AfaFactRow`s. */
export function AfaFacts({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className={SUBHEADING}>{title}</p>
      <dl className="text-[13px] tabular-nums">{children}</dl>
    </div>
  );
}

export function AfaFactRow({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-black/[0.06] py-2 first:border-t-0 first:pt-0">
      <dt className={strong ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
        {label}
        {note && <span className="ml-1.5 text-[11px] font-normal text-text-dim">{note}</span>}
      </dt>
      <dd className={strong ? 'font-bold text-text-primary' : 'font-semibold text-text-primary'}>{value}</dd>
    </div>
  );
}
