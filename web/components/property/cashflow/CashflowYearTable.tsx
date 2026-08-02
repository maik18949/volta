import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CashflowMonthColumn, CashflowYearTableResult } from '@/lib/data/propertyCashflow';
import type { CashflowLineItems } from '@/lib/calculations/cashflowCalculator';

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
}

/** Zero rounds to neutral text color instead of the row's positive/negative color — a -0,00 € shouldn't read as a real loss. */
function amountColorClass(value: number): string {
  const rounded = Math.round(value * 100);
  if (rounded === 0) return 'text-text-primary';
  return rounded > 0 ? 'text-positive' : 'text-negative';
}

function buildRowGroups(options: {
  hasParking: boolean;
  hasInsurance: boolean;
  hasOtherCosts: boolean;
  hasLeerstandCosts: boolean;
}): { top: RowDef[]; wohnung: RowDef[]; stellplatz: RowDef[] } {
  const { hasParking, hasInsurance, hasOtherCosts, hasLeerstandCosts } = options;

  const top: RowDef[] = [
    { label: 'Einnahmen', select: (i) => i.income, sign: 1 },
    { label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 },
  ];

  const wohnung: RowDef[] = [
    { label: 'Nicht umlagefähige Kosten', select: (i) => i.hoaNonRecoverableWE, sign: -1 },
    { label: 'Instandhaltungsrücklage', select: (i) => i.maintenanceReserveWE, sign: -1 },
  ];
  if (hasInsurance) wohnung.push({ label: 'Gebäudeversicherung', select: (i) => i.insuranceWE, sign: -1 });
  wohnung.push({ label: 'Verwaltung', select: (i) => i.managementWE, sign: -1 });
  if (hasOtherCosts) wohnung.push({ label: 'Sonstige Kosten', select: (i) => i.otherCostsWE, sign: -1 });
  if (hasLeerstandCosts) {
    wohnung.push({ label: 'Umlagefähige Kosten', select: (i) => i.hoaRecoverableWE, sign: -1 });
    wohnung.push({ label: 'Grundsteuer', select: (i) => i.propertyTaxWE, sign: -1 });
  }

  const stellplatz: RowDef[] = hasParking
    ? [
        { label: 'Nicht umlagefähige Kosten', select: (i) => i.hoaNonRecoverableTE, sign: -1 },
        { label: 'Instandhaltungsrücklage', select: (i) => i.maintenanceReserveTE, sign: -1 },
        { label: 'Umlagefähige Kosten', select: (i) => i.hoaRecoverableTE, sign: -1 },
        { label: 'Grundsteuer', select: (i) => i.propertyTaxTE, sign: -1 },
      ]
    : [];

  return { top, wohnung, stellplatz };
}

function CategoryDivider({ label, columnCount }: { label: string; columnCount: number }) {
  return (
    <tr className="border-t border-blue-200">
      <td colSpan={columnCount} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  row,
  months,
  avgColumn,
  totalColumn,
}: {
  row: RowDef;
  months: CashflowMonthColumn[];
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
}) {
  return (
    <tr className="border-t border-black/[0.04]">
      <td className="whitespace-nowrap py-1.5 text-text-secondary">{row.label}</td>
      {months.map((col) => {
        const value = row.sign * row.select(col.lineItems);
        return (
          <td key={col.month} className={`px-1.5 text-right font-mono ${col.isOwned ? amountColorClass(value) : 'text-text-dim'}`}>
            {col.isOwned ? formatCurrency(value) : '–'}
          </td>
        );
      })}
      <td
        className={`bg-blue-50/50 px-1.5 text-right font-mono ${
          avgColumn ? amountColorClass(row.sign * row.select(avgColumn)) : 'text-text-dim'
        }`}
      >
        {avgColumn ? formatCurrency(row.sign * row.select(avgColumn)) : '–'}
      </td>
      <td
        className={`bg-blue-50/50 px-1.5 text-right font-mono ${
          totalColumn ? amountColorClass(row.sign * row.select(totalColumn)) : 'text-text-dim'
        }`}
      >
        {totalColumn ? formatCurrency(row.sign * row.select(totalColumn)) : '–'}
      </td>
    </tr>
  );
}

export function CashflowYearTable({ result, hasParking }: { result: CashflowYearTableResult; hasParking: boolean }) {
  const anyMonthHasInsurance = result.months.some((m) => m.lineItems.insuranceWE > 0);
  const anyMonthHasOtherCosts = result.months.some((m) => m.lineItems.otherCostsWE > 0);
  const anyMonthHasLeerstandCosts = result.months.some((m) => m.lineItems.hoaRecoverableWE > 0 || m.lineItems.propertyTaxWE > 0);
  const { top, wohnung, stellplatz } = buildRowGroups({
    hasParking,
    hasInsurance: anyMonthHasInsurance,
    hasOtherCosts: anyMonthHasOtherCosts,
    hasLeerstandCosts: anyMonthHasLeerstandCosts,
  });
  const columnCount = 15; // label + 12 months + Ø + Total

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1720px] table-fixed border-collapse text-[11px]">
        <thead>
          <tr>
            <th scope="col" className="w-44 text-left text-text-secondary">Position</th>
            {result.months.map((col) => (
              <th key={col.month} scope="col" className="w-28 px-1.5 text-right font-normal">
                <div className={col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}>{MONTH_LABELS[col.month - 1]}</div>
                {col.statusLabel && (
                  <div className="mt-0.5 flex justify-end">
                    <StatusBadge status={col.statusLabel} />
                  </div>
                )}
              </th>
            ))}
            <th scope="col" className="w-24 bg-blue-50/50 px-1.5 text-right font-normal text-text-secondary">Ø Mon</th>
            <th scope="col" className="w-24 bg-blue-50/50 px-1.5 text-right font-normal text-text-secondary">Total</th>
          </tr>
        </thead>
        <tbody>
          {top.map((row) => (
            <DataRow key={`top-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          <CategoryDivider label="Kosten Wohnung" columnCount={columnCount} />
          {wohnung.map((row) => (
            <DataRow key={`we-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          {hasParking && (
            <>
              <CategoryDivider label="Kosten Stellplatz" columnCount={columnCount} />
              {stellplatz.map((row) => (
                <DataRow
                  key={`te-${row.label}`}
                  row={row}
                  months={result.months}
                  avgColumn={result.avgColumn}
                  totalColumn={result.totalColumn}
                />
              ))}
            </>
          )}

          {result.extraordinaryCostsEntryCountForYear > 0 && (
            <>
              <tr className="border-t border-blue-200">
                <td colSpan={columnCount} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                  Außergewöhnliche Kosten
                </td>
              </tr>
              {result.months.flatMap((col) =>
                col.extraordinaryCostRows.map((costRow) => (
                  <tr key={costRow.id} className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-text-secondary">
                      {costRow.description_text || formatDate(new Date(costRow.cost_month + 'T00:00:00Z'))}
                    </td>
                    {result.months.map((c) => (
                      <td key={c.month} className="px-1.5 text-right font-mono text-negative">
                        {c.month === col.month ? formatCurrency(-costRow.amount) : ''}
                      </td>
                    ))}
                    <td className="bg-blue-50/50 px-1.5" />
                    <td className="bg-blue-50/50 px-1.5" />
                  </tr>
                ))
              )}
              <tr className="border-t border-black/[0.04] font-semibold">
                <td className="py-1.5 text-text-secondary">Total</td>
                <td colSpan={12} />
                <td className="bg-blue-50/50 px-1.5 text-right font-mono text-negative">
                  {result.extraordinaryCostsAvgForYear !== null ? formatCurrency(-result.extraordinaryCostsAvgForYear) : ''}
                </td>
                <td className="bg-blue-50/50 px-1.5 text-right font-mono text-negative">
                  {formatCurrency(-result.extraordinaryCostsTotalForYear)}
                </td>
              </tr>
            </>
          )}

          <tr className="border-t-2 border-blue-200 font-bold">
            <td className="whitespace-nowrap py-1.5 text-text-primary">Cashflow vor Steuern</td>
            {result.months.map((col) => (
              <td key={col.month} className={`px-1.5 text-right font-mono ${col.isOwned ? amountColorClass(col.lineItems.cashflowBeforeTax) : 'text-text-dim'}`}>
                {col.isOwned ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
              </td>
            ))}
            <td className={`bg-blue-50/50 px-1.5 text-right font-mono ${result.avgColumn ? amountColorClass(result.avgColumn.cashflowBeforeTax) : 'text-text-dim'}`}>
              {result.avgColumn ? formatCurrency(result.avgColumn.cashflowBeforeTax) : '–'}
            </td>
            <td className={`bg-blue-50/50 px-1.5 text-right font-mono ${result.totalColumn ? amountColorClass(result.totalColumn.cashflowBeforeTax) : 'text-text-dim'}`}>
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
                <td className="whitespace-nowrap py-1.5">Steuererstattung Ø / Mon</td>
                {result.months.map((col) => (
                  <td key={col.month} className="px-1.5 text-right font-mono">
                    {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                  </td>
                ))}
                <td className="bg-blue-50/50 px-1.5" />
                <td className="bg-blue-50/50 px-1.5" />
              </tr>
              <tr className="font-bold">
                <td className="whitespace-nowrap py-1.5">Cashflow nach Steuern</td>
                {result.months.map((col) => (
                  <td
                    key={col.month}
                    className={`px-1.5 text-right font-mono ${
                      col.cashflowAfterTax !== null ? amountColorClass(col.cashflowAfterTax) : 'text-text-dim'
                    }`}
                  >
                    {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                  </td>
                ))}
                <td
                  className={`bg-blue-50/50 px-1.5 text-right font-mono ${
                    result.avgColumn && result.taxEffectMonthly !== null
                      ? amountColorClass(result.avgColumn.cashflowBeforeTax + result.taxEffectMonthly)
                      : 'text-text-dim'
                  }`}
                >
                  {result.avgColumn && result.taxEffectMonthly !== null
                    ? formatCurrency(result.avgColumn.cashflowBeforeTax + result.taxEffectMonthly)
                    : '–'}
                </td>
                <td
                  className={`bg-blue-50/50 px-1.5 text-right font-mono ${
                    result.totalColumn && result.taxEffectMonthly !== null
                      ? amountColorClass(result.totalColumn.cashflowBeforeTax + result.taxEffectMonthly * result.ownershipMonthCount)
                      : 'text-text-dim'
                  }`}
                >
                  {result.totalColumn && result.taxEffectMonthly !== null
                    ? formatCurrency(result.totalColumn.cashflowBeforeTax + result.taxEffectMonthly * result.ownershipMonthCount)
                    : '–'}
                </td>
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
