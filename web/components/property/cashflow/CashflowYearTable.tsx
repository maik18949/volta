import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CashflowMonthColumn, CashflowYearTableResult } from '@/lib/data/propertyCashflow';
import type { CashflowLineItems } from '@/lib/calculations/cashflowCalculator';
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const TH_BASE = 'border-b-2 border-black/[0.07] px-1.5 py-1.5 text-[11px]';
const TD_LABEL = 'whitespace-nowrap border-t border-black/[0.04] px-1.5 py-[5px] text-left text-text-secondary';
const TD_VALUE = 'whitespace-nowrap border-t border-black/[0.04] px-1.5 py-[5px] text-right align-top font-mono font-medium';
const TD_SUMMARY = `${TD_VALUE} bg-accent/5`;

interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
  /** Defaults to `col.isOwned` when omitted — see the Kreditrate row below for the one override. */
  visible?: (col: CashflowMonthColumn) => boolean;
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

  const top: RowDef[] = [{ label: 'Kreditrate', select: (i) => i.mortgage, sign: -1, visible: (col) => col.hasMortgagePayment }];

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
    <tr>
      <td colSpan={columnCount} className="border-t border-accent/25 px-1.5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.4px] text-text-secondary">
        {label}
      </td>
    </tr>
  );
}

function SummaryCell({ items, select, sign = 1 }: { items: CashflowLineItems | null; select: (i: CashflowLineItems) => number; sign?: -1 | 1 }) {
  if (!items) return <td className={`${TD_SUMMARY} text-text-dim`}>–</td>;
  const value = sign * select(items);
  return <td className={`${TD_SUMMARY} ${amountColorClass(value)}`}>{formatCurrency(value)}</td>;
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
    <tr>
      <td className={TD_LABEL}>{row.label}</td>
      {months.map((col) => {
        const value = row.sign * row.select(col.lineItems);
        const isVisible = row.visible ? row.visible(col) : col.isOwned;
        return (
          <td key={col.month} className={`${TD_VALUE} ${isVisible ? amountColorClass(value) : 'text-text-dim'}`}>
            {isVisible ? formatCurrency(value) : '–'}
          </td>
        );
      })}
      <SummaryCell items={avgColumn} select={row.select} sign={row.sign} />
      <SummaryCell items={totalColumn} select={row.select} sign={row.sign} />
    </tr>
  );
}

function IncomeRow({
  months,
  avgColumn,
  totalColumn,
  select,
  statusLabelsFor,
}: {
  months: CashflowMonthColumn[];
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  select: (items: CashflowLineItems) => number;
  statusLabelsFor: (col: CashflowMonthColumn) => PropertyStatus[];
}) {
  return (
    <tr>
      <td className={TD_LABEL}>Einnahmen</td>
      {months.map((col) => {
        const value = select(col.lineItems);
        const labels = statusLabelsFor(col);
        return (
          <td key={col.month} className={`${TD_VALUE} ${col.isOwned ? amountColorClass(value) : 'text-text-dim'}`}>
            <div>{col.isOwned ? formatCurrency(value) : '–'}</div>
            {labels.length > 0 && (
              <div className="mt-[3px] flex flex-wrap justify-end gap-1 font-sans">
                {labels.map((status) => (
                  <StatusBadge key={status} status={status} size="sm" />
                ))}
              </div>
            )}
          </td>
        );
      })}
      <SummaryCell items={avgColumn} select={select} />
      <SummaryCell items={totalColumn} select={select} />
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

  const afterTaxAvg =
    result.avgColumn && result.taxEffectMonthly !== null ? result.avgColumn.cashflowBeforeTax + result.taxEffectMonthly : null;
  const afterTaxTotal =
    result.totalColumn && result.taxEffectMonthly !== null
      ? result.totalColumn.cashflowBeforeTax + result.taxEffectMonthly * result.ownershipMonthCount
      : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1560px] border-collapse text-[11px] tabular-nums">
          <thead>
            <tr>
              <th scope="col" className={`${TH_BASE} min-w-40 text-left font-bold uppercase tracking-[0.4px] text-text-dim`}>
                Position
              </th>
              {result.months.map((col) => (
                <th
                  key={col.month}
                  scope="col"
                  className={`${TH_BASE} whitespace-nowrap text-right font-semibold ${col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}`}
                >
                  {MONTH_LABELS[col.month - 1]}
                </th>
              ))}
              <th scope="col" className={`${TH_BASE} bg-accent/5 text-right font-bold uppercase text-text-secondary`}>
                Ø Mon
              </th>
              <th scope="col" className={`${TH_BASE} bg-accent/5 text-right font-bold uppercase text-text-secondary`}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((row) => (
              <DataRow key={`top-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
            ))}

            <CategoryDivider label="Wohnung" columnCount={columnCount} />
            <IncomeRow
              months={result.months}
              avgColumn={result.avgColumn}
              totalColumn={result.totalColumn}
              select={(i) => i.incomeWE}
              statusLabelsFor={(col) => col.statusLabelsWE}
            />
            {wohnung.map((row) => (
              <DataRow key={`we-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
            ))}

            {hasParking && (
              <>
                <CategoryDivider label="Stellplatz" columnCount={columnCount} />
                <IncomeRow
                  months={result.months}
                  avgColumn={result.avgColumn}
                  totalColumn={result.totalColumn}
                  select={(i) => i.incomeTE}
                  statusLabelsFor={(col) => col.statusLabelsTE}
                />
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
                <CategoryDivider label="Außergewöhnliche Kosten" columnCount={columnCount} />
                {result.months.flatMap((col) =>
                  col.extraordinaryCostRows.map((costRow) => (
                    <tr key={costRow.id}>
                      <td className={TD_LABEL}>{costRow.description_text || formatDate(new Date(costRow.cost_month + 'T00:00:00Z'))}</td>
                      {result.months.map((c) => (
                        <td key={c.month} className={`${TD_VALUE} text-negative`}>
                          {c.month === col.month ? formatCurrency(-costRow.amount) : ''}
                        </td>
                      ))}
                      <td className={TD_SUMMARY} />
                      <td className={TD_SUMMARY} />
                    </tr>
                  ))
                )}
                <tr className="font-semibold">
                  <td className={TD_LABEL}>Total</td>
                  <td colSpan={12} className="border-t border-black/[0.04]" />
                  <td className={`${TD_SUMMARY} text-negative`}>
                    {result.extraordinaryCostsAvgForYear !== null ? formatCurrency(-result.extraordinaryCostsAvgForYear) : ''}
                  </td>
                  <td className={`${TD_SUMMARY} text-negative`}>{formatCurrency(-result.extraordinaryCostsTotalForYear)}</td>
                </tr>
              </>
            )}

            <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
              <td className={`${TD_LABEL} text-text-primary`}>Cashflow vor Steuern</td>
              {result.months.map((col) => (
                <td key={col.month} className={`${TD_VALUE} ${col.hasMortgagePayment ? amountColorClass(col.lineItems.cashflowBeforeTax) : 'text-text-dim'}`}>
                  {col.hasMortgagePayment ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
                </td>
              ))}
              <SummaryCell items={result.avgColumn} select={(i) => i.cashflowBeforeTax} />
              <SummaryCell items={result.totalColumn} select={(i) => i.cashflowBeforeTax} />
            </tr>

            {result.isFutureYear ? (
              <tr>
                <td colSpan={columnCount} className="px-1.5 pt-2 text-[11px] text-warning">
                  ⚠ Steuereffekt für Zukunftsjahre: Muss noch genauer nachgedacht werden wie wir das machen.
                </td>
              </tr>
            ) : (
              <>
                <tr className="text-accent">
                  <td className={`${TD_LABEL} text-accent`}>Steuererstattung Ø / Mon</td>
                  {result.months.map((col) => (
                    <td key={col.month} className={`${TD_VALUE} ${col.isOwned ? 'text-accent' : 'text-text-dim'}`}>
                      {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                    </td>
                  ))}
                  <td className={TD_SUMMARY} />
                  <td className={TD_SUMMARY} />
                </tr>
                <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
                  <td className={`${TD_LABEL} text-text-primary`}>Cashflow nach Steuern</td>
                  {result.months.map((col) => (
                    <td
                      key={col.month}
                      className={`${TD_VALUE} ${col.cashflowAfterTax !== null ? amountColorClass(col.cashflowAfterTax) : 'text-text-dim'}`}
                    >
                      {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                    </td>
                  ))}
                  <td className={`${TD_SUMMARY} ${afterTaxAvg !== null ? amountColorClass(afterTaxAvg) : 'text-text-dim'}`}>
                    {afterTaxAvg !== null ? formatCurrency(afterTaxAvg) : '–'}
                  </td>
                  <td className={`${TD_SUMMARY} ${afterTaxTotal !== null ? amountColorClass(afterTaxTotal) : 'text-text-dim'}`}>
                    {afterTaxTotal !== null ? formatCurrency(afterTaxTotal) : '–'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-text-dim">
        <span className="italic">Kursive Monate</span> = projiziert · Ø und Total über Eigentums- bzw. Kreditmonate
      </p>

      {(result.hoaUnitSplitWarning || result.hoaParkingSplitWarning) && (
        <div className="mt-2 space-y-1 text-[13px] font-medium text-warning">
          {result.hoaUnitSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung
              Hausgeld aufteilen (→ Immobiliendaten)
            </p>
          )}
          {result.hoaParkingSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue
              Berechnung aufteilen (→ Immobiliendaten)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
