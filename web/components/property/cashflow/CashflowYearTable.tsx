import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CashflowYearTableResult } from '@/lib/data/propertyCashflow';
import type { CashflowLineItems } from '@/lib/calculations/cashflowCalculator';

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
}

function buildRows(options: {
  hasParking: boolean;
  hasInsurance: boolean;
  hasOtherCosts: boolean;
  hasLeerstandCosts: boolean;
}): RowDef[] {
  const { hasParking, hasInsurance, hasOtherCosts, hasLeerstandCosts } = options;
  const rows: RowDef[] = [
    { label: 'Einnahmen', select: (i) => i.income, sign: 1 },
    { label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 },
    { label: 'Nicht umlagef. Kosten WE', select: (i) => i.hoaNonRecoverableWE, sign: -1 },
    { label: 'Instandhaltungsrücklage WE', select: (i) => i.maintenanceReserveWE, sign: -1 },
  ];
  if (hasInsurance) rows.push({ label: 'Gebäudeversicherung', select: (i) => i.insuranceWE, sign: -1 });
  rows.push({ label: 'Verwaltung', select: (i) => i.managementWE, sign: -1 });
  if (hasOtherCosts) rows.push({ label: 'Sonstige Kosten', select: (i) => i.otherCostsWE, sign: -1 });
  if (hasLeerstandCosts) {
    rows.push({ label: 'Umlagef. Kosten WE', select: (i) => i.hoaRecoverableWE, sign: -1 });
    rows.push({ label: 'Grundsteuer WE', select: (i) => i.propertyTaxWE, sign: -1 });
  }
  if (hasParking) {
    rows.push({ label: 'Nicht umlagef. Kosten TE', select: (i) => i.hoaNonRecoverableTE, sign: -1 });
    rows.push({ label: 'Instandhaltungsrücklage TE', select: (i) => i.maintenanceReserveTE, sign: -1 });
    rows.push({ label: 'Umlagef. Kosten TE', select: (i) => i.hoaRecoverableTE, sign: -1 });
    rows.push({ label: 'Grundsteuer TE', select: (i) => i.propertyTaxTE, sign: -1 });
  }
  return rows;
}

export function CashflowYearTable({ result, hasParking }: { result: CashflowYearTableResult; hasParking: boolean }) {
  const anyMonthHasInsurance = result.months.some((m) => m.lineItems.insuranceWE > 0);
  const anyMonthHasOtherCosts = result.months.some((m) => m.lineItems.otherCostsWE > 0);
  const anyMonthHasLeerstandCosts = result.months.some((m) => m.lineItems.hoaRecoverableWE > 0 || m.lineItems.propertyTaxWE > 0);
  const rows = buildRows({
    hasParking,
    hasInsurance: anyMonthHasInsurance,
    hasOtherCosts: anyMonthHasOtherCosts,
    hasLeerstandCosts: anyMonthHasLeerstandCosts,
  });
  const columnCount = 15; // label + 12 months + Ø + Total

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-[11px]">
        <thead>
          <tr>
            <th scope="col" className="w-32 text-left text-text-secondary">Position</th>
            {result.months.map((col) => (
              <th key={col.month} scope="col" className="px-1 text-right font-normal">
                <div className={col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}>{MONTH_LABELS[col.month - 1]}</div>
                {col.statusLabel && (
                  <div className="mt-0.5 flex justify-end">
                    <StatusBadge status={col.statusLabel} />
                  </div>
                )}
              </th>
            ))}
            <th scope="col" className="bg-blue-50/50 px-1 text-right font-normal text-text-secondary">Ø Mon</th>
            <th scope="col" className="bg-blue-50/50 px-1 text-right font-normal text-text-secondary">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/[0.04]">
              <td className="py-1 text-text-secondary">{row.label}</td>
              {result.months.map((col) => (
                <td
                  key={col.month}
                  className={`px-1 text-right font-mono ${
                    col.isOwned ? (row.sign === 1 ? 'text-positive' : 'text-negative') : 'text-text-dim'
                  }`}
                >
                  {col.isOwned ? formatCurrency(row.sign * row.select(col.lineItems)) : '–'}
                </td>
              ))}
              <td className={`bg-blue-50/50 px-1 text-right font-mono ${row.sign === 1 ? 'text-positive' : 'text-negative'}`}>
                {result.avgColumn ? formatCurrency(row.sign * row.select(result.avgColumn)) : '–'}
              </td>
              <td className={`bg-blue-50/50 px-1 text-right font-mono ${row.sign === 1 ? 'text-positive' : 'text-negative'}`}>
                {result.totalColumn ? formatCurrency(row.sign * row.select(result.totalColumn)) : '–'}
              </td>
            </tr>
          ))}

          {result.extraordinaryCostsEntryCountForYear > 0 && (
            <>
              <tr className="border-t border-blue-200">
                <td colSpan={columnCount} className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  Außergewöhnliche Kosten
                </td>
              </tr>
              {result.months.flatMap((col) =>
                col.extraordinaryCostRows.map((costRow) => (
                  <tr key={costRow.id} className="border-t border-black/[0.04]">
                    <td className="py-1 text-text-secondary">
                      {costRow.description_text || formatDate(new Date(costRow.cost_month + 'T00:00:00Z'))}
                    </td>
                    {result.months.map((c) => (
                      <td key={c.month} className="px-1 text-right font-mono text-negative">
                        {c.month === col.month ? formatCurrency(-costRow.amount) : ''}
                      </td>
                    ))}
                    <td className="bg-blue-50/50 px-1" />
                    <td className="bg-blue-50/50 px-1" />
                  </tr>
                ))
              )}
              <tr className="border-t border-black/[0.04] font-semibold">
                <td className="py-1 text-text-secondary">Total</td>
                <td colSpan={12} />
                <td className="bg-blue-50/50 px-1 text-right font-mono text-negative">
                  {result.extraordinaryCostsAvgForYear !== null ? formatCurrency(-result.extraordinaryCostsAvgForYear) : ''}
                </td>
                <td className="bg-blue-50/50 px-1 text-right font-mono text-negative">
                  {formatCurrency(-result.extraordinaryCostsTotalForYear)}
                </td>
              </tr>
            </>
          )}

          <tr className="border-t-2 border-blue-200 font-bold">
            <td className="py-1 text-text-primary">Cashflow vor Steuern</td>
            {result.months.map((col) => (
              <td key={col.month} className="px-1 text-right font-mono">
                {col.isOwned ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
              </td>
            ))}
            <td className="bg-blue-50/50 px-1 text-right font-mono">
              {result.avgColumn ? formatCurrency(result.avgColumn.cashflowBeforeTax) : '–'}
            </td>
            <td className="bg-blue-50/50 px-1 text-right font-mono">
              {result.totalColumn ? formatCurrency(result.totalColumn.cashflowBeforeTax) : '–'}
            </td>
          </tr>

          {result.isFutureYear ? (
            <tr>
              <td colSpan={columnCount} className="pt-2 text-xs text-warning">
                ⚠ Steuereffekt für Zukunftsjahre: Muss noch genauer nachgedacht werden wie wir das machen.
              </td>
            </tr>
          ) : (
            <>
              <tr className="text-accent">
                <td className="py-1">Steuererstattung Ø / Mon</td>
                {result.months.map((col) => (
                  <td key={col.month} className="px-1 text-right font-mono">
                    {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                  </td>
                ))}
                <td className="bg-blue-50/50 px-1" />
                <td className="bg-blue-50/50 px-1" />
              </tr>
              <tr className="font-bold">
                <td className="py-1">Cashflow nach Steuern</td>
                {result.months.map((col) => (
                  <td
                    key={col.month}
                    className={`px-1 text-right font-mono ${
                      col.cashflowAfterTax !== null ? (col.cashflowAfterTax >= 0 ? 'text-positive' : 'text-negative') : 'text-text-dim'
                    }`}
                  >
                    {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                  </td>
                ))}
                <td className="bg-blue-50/50 px-1" />
                <td className="bg-blue-50/50 px-1" />
              </tr>
            </>
          )}
        </tbody>
      </table>

      {(result.hoaUnitSplitWarning || result.hoaParkingSplitWarning) && (
        <div className="mt-3 space-y-1 text-xs text-warning">
          {result.hoaUnitSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung
              Hausgeld aufteilen (→ Einstellungen)
            </p>
          )}
          {result.hoaParkingSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue
              Berechnung aufteilen (→ Einstellungen)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
