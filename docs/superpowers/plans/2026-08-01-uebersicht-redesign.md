# Übersicht-Seite Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the property Übersicht page: a new header (photo carousel + object data + KPI bar), a gradient scale replacing the KPI traffic-light dot, a redesigned KPI info popup (no overlay, real-number calculation, clearer copy), and an itemized "Laufende Kosten" breakdown.

**Architecture:** Pure calculation/formatting logic (scale position, calculation-text strings, cost breakdown) lives in `lib/`, is unit-tested with Vitest, and is consumed by presentational React components. Existing `computePropertySummary`/`computeOverviewMetrics` are extended (new fields on their existing return types) rather than replaced, so all current callers keep working unchanged.

**Tech Stack:** Next.js App Router, React Server Components + a few `'use client'` islands, Tailwind CSS, Vitest + @testing-library/react, Supabase-generated `Database` types.

**Spec:** `docs/superpowers/specs/2026-08-01-uebersicht-redesign-design.md`

---

## File Structure

**New files:**
- `web/components/property/KpiScale.tsx` — gradient scale + marker, replaces the traffic-light dot everywhere
- `web/lib/kpiCalculationText.ts` — builds the "Berechnung" (real numbers plugged into the formula) string per KPI
- `web/components/property/overview/PhotoCarousel.tsx` — scrollable square photo widget
- `web/components/property/overview/PropertyHeaderCard.tsx` — replaces `PropertyHeaderPhoto.tsx` + `ObjectCard.tsx`: photo carousel + all object data in one header card
- `web/tests/components/KpiScale.test.tsx`
- `web/tests/kpiCalculationText.test.ts`
- `web/tests/components/PhotoCarousel.test.tsx`
- `web/tests/components/PropertyHeaderCard.test.tsx`

**Modified files:**
- `web/lib/calculations/kpiCalculator.ts` — add `domainMin`/`domainMax` to `BENCHMARK_THRESHOLDS`, add `scalePosition()` and `benchmarkThreshold()`
- `web/lib/data/propertyOverview.ts` — expose `cashflowBeforeTaxYear`, `eigenkapitalrenditeNumerator`, `leerstandDaysSinceTransfer`, `ownershipDaysSinceTransfer` on `OverviewMetrics`
- `web/lib/data/propertySummary.ts` — add `runningCostsBreakdown` to `PropertySummary`
- `web/lib/kpiInfo.ts` — restructure `KpiInfo` (formula / purpose / goodWhen / einordnung), rewrite all 8 entries
- `web/components/ui/Modal.tsx` — add optional `overlay` prop (default `true`, so every other call site is unaffected)
- `web/components/ui/GlassCard.tsx` — add optional `variant` prop (`'glass' | 'solid'`, default `'glass'`)
- `web/components/property/KpiInfoButton.tsx` — new props, new popup content
- `web/components/property/overview/ReturnsCard.tsx` — `KpiScale` + colored value instead of `KpiChip`, solid white card, new `KpiInfoButton` props
- `web/components/property/overview/OverviewKpiBar.tsx` — `KpiScale` + colored value instead of `KpiChip`, no longer sticky
- `web/components/property/overview/CurrentStatusCard.tsx` — itemized "Laufende Kosten" instead of the algebraic-inverse single number
- `web/app/(app)/properties/[id]/page.tsx` — new component order, `PropertyHeaderCard` replaces `PropertyHeaderPhoto` + `ObjectCard`
- `web/tests/calculations/kpiCalculator.test.ts` — add `scalePosition` tests
- `web/tests/components/Modal.test.tsx` — add `overlay` prop test
- `web/tests/data/propertyOverview.test.ts` — add tests for the 4 newly exposed fields
- `web/tests/data/propertySummary.test.ts` — add tests for `runningCostsBreakdown`
- `web/tests/kpiInfo.test.ts` — rewrite for the new `KpiInfo` shape

**Deleted files:**
- `web/components/property/KpiChip.tsx`
- `web/components/property/PropertyHeaderPhoto.tsx`
- `web/components/property/overview/ObjectCard.tsx`

All file paths below are relative to `/Users/maikschlarmann/volta/web` unless stated otherwise.

---

### Task 1: `scalePosition` — where a KPI value sits on its 0–100% scale

**Files:**
- Modify: `lib/calculations/kpiCalculator.ts:113–146`
- Test: `tests/calculations/kpiCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/calculations/kpiCalculator.test.ts`, inside the existing `describe('kpiCalculator', ...)` block (before the closing `});`):

```ts
  it('scalePosition: grossYield (higherIsBetter, domain 0–0.10) — midpoint value sits at 0.5', () => {
    expect(scalePosition('grossYield', 0.05)).toBeCloseTo(0.5, 4);
  });

  it('scalePosition: grossYield — value at domainMin sits at 0, value above domainMax clamps to 1', () => {
    expect(scalePosition('grossYield', 0)).toBeCloseTo(0, 4);
    expect(scalePosition('grossYield', 0.5)).toBe(1);
  });

  it('scalePosition: grossYield — negative value (below domainMin) clamps to 0', () => {
    expect(scalePosition('grossYield', -0.05)).toBe(0);
  });

  it('scalePosition: ltv (lowerIsBetter, domain 0–1.10) — low (good) value sits near 1, high (bad) value sits near 0', () => {
    expect(scalePosition('ltv', 0)).toBeCloseTo(1, 4);
    expect(scalePosition('ltv', 1.1)).toBeCloseTo(0, 4);
  });

  it('scalePosition: ltv — value above domainMax clamps to 0, not negative', () => {
    expect(scalePosition('ltv', 2)).toBe(0);
  });

  it('scalePosition: kaufpreisfaktor (lowerIsBetter, domain 10–35) — low value sits at 1, high value sits at 0', () => {
    expect(scalePosition('kaufpreisfaktor', 10)).toBeCloseTo(1, 4);
    expect(scalePosition('kaufpreisfaktor', 35)).toBeCloseTo(0, 4);
    expect(scalePosition('kaufpreisfaktor', 5)).toBe(1); // below domainMin clamps to the "good" end
  });

  it('benchmarkThreshold: exposes direction/green/orange/domain for a KPI', () => {
    const t = benchmarkThreshold('dscr');
    expect(t).toEqual({ direction: 'higherIsBetter', green: 1.25, orange: 1.0, domainMin: 0, domainMax: 2.0 });
  });
```

Add `scalePosition` and `benchmarkThreshold` to the existing import from `@/lib/calculations/kpiCalculator` at the top of the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npm test -- kpiCalculator`
Expected: FAIL — `scalePosition`/`benchmarkThreshold` are not exported.

- [ ] **Step 3: Implement `scalePosition` and `benchmarkThreshold`**

In `lib/calculations/kpiCalculator.ts`, replace the `BenchmarkThreshold` interface, the `BENCHMARK_THRESHOLDS` const, and add the two new functions after `benchmarkColor`:

```ts
interface BenchmarkThreshold {
  direction: 'higherIsBetter' | 'lowerIsBetter';
  green: number;
  orange: number;
  domainMin: number;
  domainMax: number;
}

// Per spec-overview-tab.md's 3-tier chip table (grün/orange/rot) — the richer
// 4-tier "Kontext" copy in docs/superpowers/specs/2026-06-14-kpi-benchmarks.md
// feeds the KPI info sheet's text, not this coloring. domainMin/domainMax define
// the 0–100% range the KpiScale marker is placed within (see scalePosition below) —
// chosen with headroom beyond the orange threshold so realistic values don't sit
// permanently pinned to an edge; see docs/superpowers/specs/2026-08-01-uebersicht-redesign-design.md.
const BENCHMARK_THRESHOLDS: Record<BenchmarkKpi, BenchmarkThreshold> = {
  grossYield: { direction: 'higherIsBetter', green: 0.05, orange: 0.03, domainMin: 0, domainMax: 0.1 },
  netYield: { direction: 'higherIsBetter', green: 0.04, orange: 0.02, domainMin: 0, domainMax: 0.08 },
  cashOnCash: { direction: 'higherIsBetter', green: 0.06, orange: 0.03, domainMin: -0.2, domainMax: 0.2 },
  // Higher than cashOnCash's thresholds since this also credits Tilgung + Wertsteigerung.
  eigenkapitalrendite: { direction: 'higherIsBetter', green: 0.08, orange: 0.04, domainMin: -0.1, domainMax: 0.2 },
  kaufpreisfaktor: { direction: 'lowerIsBetter', green: 20, orange: 25, domainMin: 10, domainMax: 35 },
  dscr: { direction: 'higherIsBetter', green: 1.25, orange: 1.0, domainMin: 0, domainMax: 2.0 },
  ltv: { direction: 'lowerIsBetter', green: 0.7, orange: 0.8, domainMin: 0, domainMax: 1.1 },
  actualVacancyRate: { direction: 'lowerIsBetter', green: 0.03, orange: 0.08, domainMin: 0, domainMax: 0.2 },
};

/** Chip color for a KPI value. null value (no data yet) -> null (no chip rendered). */
export function benchmarkColor(kpi: BenchmarkKpi, value: number | null): BenchmarkColor | null {
  if (value === null) return null;
  const t = BENCHMARK_THRESHOLDS[kpi];
  if (t.direction === 'higherIsBetter') {
    if (value >= t.green) return 'green';
    if (value >= t.orange) return 'orange';
    return 'red';
  }
  if (value <= t.green) return 'green';
  if (value <= t.orange) return 'orange';
  return 'red';
}

/** Read-only access to a KPI's threshold/domain config, e.g. for rendering scale axis labels. */
export function benchmarkThreshold(kpi: BenchmarkKpi): Readonly<BenchmarkThreshold> {
  return BENCHMARK_THRESHOLDS[kpi];
}

/**
 * Where `value` sits on a 0–1 scale within [domainMin, domainMax], oriented so
 * "good" is always 1 (right/green end) and "bad" is always 0 (left/red end) —
 * regardless of the KPI's direction. Out-of-domain values clamp to the nearest end.
 */
export function scalePosition(kpi: BenchmarkKpi, value: number): number {
  const t = BENCHMARK_THRESHOLDS[kpi];
  const raw =
    t.direction === 'higherIsBetter'
      ? (value - t.domainMin) / (t.domainMax - t.domainMin)
      : (t.domainMax - value) / (t.domainMax - t.domainMin);
  return Math.min(1, Math.max(0, raw));
}
```

(This replaces the old `interface BenchmarkThreshold`, `BENCHMARK_THRESHOLDS`, and `benchmarkColor` — `benchmarkColor`'s own body is unchanged, only the threshold type/data it reads gained two fields.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npm test -- kpiCalculator`
Expected: PASS (all existing `benchmarkColor` tests still pass unchanged, plus the new `scalePosition`/`benchmarkThreshold` tests)

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/kpiCalculator.ts web/tests/calculations/kpiCalculator.test.ts
git commit -m "feat(kpi): add scalePosition + benchmarkThreshold for the gradient scale"
```

---

### Task 2: `KpiScale` component — gradient bar + marker, replaces the traffic-light dot

**Files:**
- Create: `components/property/KpiScale.tsx`
- Test: `tests/components/KpiScale.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/KpiScale.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { KpiScale, kpiValueColorClass } from '@/components/property/KpiScale';

afterEach(cleanup);

describe('KpiScale', () => {
  it('renders nothing when value is null', () => {
    const { container } = render(<KpiScale kpi="grossYield" value={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('places the marker at 50% for a value exactly at the domain midpoint', () => {
    // grossYield domain [0, 0.10] -> 0.05 is the midpoint
    const { container } = render(<KpiScale kpi="grossYield" value={0.05} />);
    const marker = container.querySelector('[style]') as HTMLElement;
    expect(marker.style.left).toBe('50%');
  });

  it('clamps the marker to 0% for a lowerIsBetter KPI value above the domain max', () => {
    // ltv domain [0, 1.10], lowerIsBetter -> a value above domainMax clamps to the "bad" end (0%)
    const { container } = render(<KpiScale kpi="ltv" value={2} />);
    const marker = container.querySelector('[style]') as HTMLElement;
    expect(marker.style.left).toBe('0%');
  });

  it('renders no axis labels by default, and 4 axis labels when showAxis is true', () => {
    const { container: withoutAxis } = render(<KpiScale kpi="dscr" value={1.1} />);
    expect(withoutAxis.textContent).toBe('');

    cleanup();
    render(<KpiScale kpi="dscr" value={1.1} showAxis />);
    // axis order for higherIsBetter dscr: domainMin(0), orange(1.0), green(1.25), domainMax(2.0)
    expect(screen.getByText('0,00')).toBeInTheDocument();
    expect(screen.getByText('1,00')).toBeInTheDocument();
    expect(screen.getByText('1,25')).toBeInTheDocument();
    expect(screen.getByText('2,00')).toBeInTheDocument();
  });

  it('renders axis labels reversed (domainMax first) for a lowerIsBetter KPI', () => {
    render(<KpiScale kpi="ltv" value={0.5} showAxis />);
    const labels = screen.getAllByText(/%/).map((el) => el.textContent);
    // ltv domain [0, 1.10], lowerIsBetter -> domainMax(110%) first, domainMin(0%) last
    expect(labels[0]).toBe('110,0 %');
    expect(labels[labels.length - 1]).toBe('0,0 %');
  });
});

describe('kpiValueColorClass', () => {
  it('returns the green text class for a green-benchmark value', () => {
    expect(kpiValueColorClass('grossYield', 0.06)).toBe('text-emerald-600');
  });

  it('returns the default text class when value is null', () => {
    expect(kpiValueColorClass('grossYield', null)).toBe('text-text-primary');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- components/KpiScale`
Expected: FAIL — `@/components/property/KpiScale` does not exist yet.

- [ ] **Step 3: Implement `KpiScale.tsx`**

Create `components/property/KpiScale.tsx`:

```tsx
import { benchmarkColor, benchmarkThreshold, scalePosition, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatPercent, formatNumber, formatMultiplier } from '@/lib/formatters';

const VALUE_COLOR_CLASSES: Record<'green' | 'orange' | 'red', string> = {
  green: 'text-emerald-600',
  orange: 'text-amber-600',
  red: 'text-red-600',
};

/** Text color for a KPI's displayed value, matching its position on the scale. */
export function kpiValueColorClass(kpi: BenchmarkKpi, value: number | null): string {
  const color = benchmarkColor(kpi, value);
  return color ? VALUE_COLOR_CLASSES[color] : 'text-text-primary';
}

const AXIS_FORMAT: Record<BenchmarkKpi, (value: number) => string> = {
  grossYield: formatPercent,
  netYield: formatPercent,
  cashOnCash: formatPercent,
  eigenkapitalrendite: formatPercent,
  kaufpreisfaktor: formatMultiplier,
  dscr: (value) => formatNumber(value, 2),
  ltv: formatPercent,
  actualVacancyRate: formatPercent,
};

/**
 * Rot→Orange→Grün gradient bar with a marker at the KPI's current position.
 * Renders nothing when value is null (no data yet) — same as the old KpiChip dot.
 * showAxis adds domain/threshold tick labels below the bar (used in the KPI info popup).
 */
export function KpiScale({ kpi, value, showAxis = false }: { kpi: BenchmarkKpi; value: number | null; showAxis?: boolean }) {
  if (value === null) return null;

  const pct = scalePosition(kpi, value) * 100;
  const t = benchmarkThreshold(kpi);
  const axisValues =
    t.direction === 'higherIsBetter' ? [t.domainMin, t.orange, t.green, t.domainMax] : [t.domainMax, t.orange, t.green, t.domainMin];
  const format = AXIS_FORMAT[kpi];

  return (
    <div>
      <div className="relative h-[6px] w-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500">
        <div className="absolute -top-[7px]" style={{ left: `${pct}%` }}>
          <div className="h-0 w-0 -translate-x-1/2 border-x-[3.5px] border-t-[5px] border-x-transparent border-t-[#1f2937]" />
        </div>
      </div>
      {showAxis && (
        <div className="mt-1.5 flex justify-between text-[10.5px] text-text-dim">
          {axisValues.map((axisValue, i) => (
            <span key={i}>{format(axisValue)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- components/KpiScale`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/components/property/KpiScale.tsx web/tests/components/KpiScale.test.tsx
git commit -m "feat(kpi): add KpiScale gradient-marker component"
```

---

### Task 3: Wire `KpiScale` into `ReturnsCard`, delete `KpiChip`, solid white card

**Files:**
- Modify: `components/ui/GlassCard.tsx`
- Modify: `components/property/overview/ReturnsCard.tsx`
- Delete: `components/property/KpiChip.tsx`

- [ ] **Step 1: Add a `variant` prop to `GlassCard`**

Replace the full contents of `components/ui/GlassCard.tsx`:

```tsx
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export function GlassCard({
  children,
  className = '',
  variant = 'glass',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'solid';
}) {
  const base = variant === 'solid' ? 'rounded-[18px] bg-white shadow-sm' : 'glass-card';
  return <div className={twMerge(base, 'p-4', className)}>{children}</div>;
}
export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-section-label mt-2.5 mb-2">
      {children}
    </p>
  );
}
```

Every existing `<GlassCard>` call site (no `variant` passed) keeps rendering exactly as before — `variant` defaults to `'glass'`.

- [ ] **Step 2: Rewrite `ReturnsCard.tsx` to use `KpiScale` + colored value**

Replace the full contents of `components/property/overview/ReturnsCard.tsx`:

```tsx
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { KpiScale, kpiValueColorClass } from '@/components/property/KpiScale';
import { KpiInfoButton } from '@/components/property/KpiInfoButton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function KpiRow({
  kpi,
  label,
  rawValue,
  formattedValue,
  property,
  summary,
  overview,
}: {
  kpi: BenchmarkKpi;
  label: string;
  rawValue: number | null;
  formattedValue: string;
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${kpiValueColorClass(kpi, rawValue)}`}>{formattedValue}</span>
        <div className="w-[90px]">
          <KpiScale kpi={kpi} value={rawValue} />
        </div>
        <KpiInfoButton kpi={kpi} value={rawValue} property={property} summary={summary} overview={overview} />
      </div>
    </div>
  );
}

export function ReturnsCard({
  property,
  summary,
  overview,
}: {
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  return (
    <GlassCard variant="solid">
      <SectionLabel>Rendite & Investment</SectionLabel>

      <KpiRow
        kpi="grossYield"
        label="Bruttorendite"
        rawValue={overview.grossYield}
        formattedValue={overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="netYield"
        label="Nettorendite"
        rawValue={summary.netYield}
        formattedValue={summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="cashOnCash"
        label="Cash-on-Cash"
        rawValue={overview.cashOnCash}
        formattedValue={overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="eigenkapitalrendite"
        label="Eigenkapitalrendite"
        rawValue={overview.eigenkapitalrendite}
        formattedValue={overview.eigenkapitalrendite !== null ? formatPercent(overview.eigenkapitalrendite) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="kaufpreisfaktor"
        label="Kaufpreisfaktor"
        rawValue={overview.kaufpreisfaktor}
        formattedValue={overview.kaufpreisfaktor !== null ? `${formatNumber(overview.kaufpreisfaktor, 1)}×` : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="dscr"
        label="DSCR (NOI)"
        rawValue={overview.dscr}
        formattedValue={overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="ltv"
        label="LTV"
        rawValue={overview.ltv}
        formattedValue={overview.ltv !== null ? formatPercent(overview.ltv) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />
      <KpiRow
        kpi="actualVacancyRate"
        label="Tats. Leerstandsquote"
        rawValue={overview.actualVacancyRate}
        formattedValue={overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–'}
        property={property}
        summary={summary}
        overview={overview}
      />

      <div className="my-2 h-px bg-black/[0.06]" />

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Gesamtinvestment</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.totalInvestment)}</span>

        <span className="text-text-secondary">Eigenkapital</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.equityUsed)}</span>

        <span className="text-text-secondary">NOI / Jahr</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.netOperatingIncomeYearly)}</span>

        <span className="text-text-secondary">Break-Even-Miete</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.breakEvenRentMonthly)}</span>
      </div>

      {overview.valueGain !== null && overview.valueGainPercent !== null && (
        <>
          <div className="my-2 h-px bg-black/[0.06]" />
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">Aktueller Marktwert</span>
            <span className="text-right text-text-primary">{formatCurrency(overview.currentMarketValue ?? 0)}</span>

            <span className="text-text-secondary">Wertsteigerung</span>
            <span className={`text-right font-semibold ${overview.valueGain >= 0 ? 'text-positive' : 'text-negative'}`}>
              {overview.valueGain >= 0 ? '+' : ''}
              {formatCurrency(overview.valueGain)} ({formatPercent(overview.valueGainPercent)})
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}
```

Note: `KpiInfoButton` here is given the new `value`/`property`/`summary`/`overview` props it doesn't accept yet — that's fixed in Task 9. The build will fail with a type error between this task and Task 9; that's expected and resolved within this same work session, well before final verification (Task 14).

- [ ] **Step 3: Delete `KpiChip.tsx`**

```bash
git rm web/components/property/KpiChip.tsx
```

- [ ] **Step 4: Commit**

```bash
git add web/components/ui/GlassCard.tsx web/components/property/overview/ReturnsCard.tsx
git commit -m "feat(kpi): replace KpiChip dot with KpiScale + colored value in ReturnsCard"
```

(Full type-checking/build verification for the whole chain happens in Task 14 — `KpiInfoButton`'s new prop signature isn't implemented until Task 9.)

---

### Task 4: Wire `KpiScale` into `OverviewKpiBar`, drop `sticky`

**Files:**
- Modify: `components/property/overview/OverviewKpiBar.tsx`

- [ ] **Step 1: Rewrite `OverviewKpiBar.tsx`**

Replace the full contents of `components/property/overview/OverviewKpiBar.tsx`:

```tsx
import { KpiScale, kpiValueColorClass } from '@/components/property/KpiScale';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

export function OverviewKpiBar({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  const cfColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-black/[0.06] shadow-sm sm:grid-cols-4">
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">CF nach Steuern</p>
        <p className={`text-[18px] font-extrabold ${cfColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
        <p className="text-[11px] text-text-dim">vor St.: {formatCurrency(summary.cashflowBeforeTaxMonthly)}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Nettorendite</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('netYield', summary.netYield)}`}>
          {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="netYield" value={summary.netYield} />
        </div>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Cash-on-Cash</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('cashOnCash', overview.cashOnCash)}`}>
          {overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="cashOnCash" value={overview.cashOnCash} />
        </div>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">DSCR</p>
        <p className={`text-[18px] font-extrabold ${kpiValueColorClass('dscr', overview.dscr)}`}>
          {overview.dscr !== null ? formatNumber(overview.dscr, 2) : '–'}
        </p>
        <div className="mt-1 w-16">
          <KpiScale kpi="dscr" value={overview.dscr} />
        </div>
      </div>
    </div>
  );
}
```

Changes from the original: outer wrapper drops `sticky top-0 z-10` (per the design spec, the bar is now part of the page header block, not fixed to the viewport); each of the three benchmarked tiles gets `kpiValueColorClass` on its value and a `KpiScale` underneath; the "Brutto: …" subtitle under Nettorendite is removed since the row no longer has room for both a subtitle and a scale (Bruttorendite is already shown with its own scale in `ReturnsCard`).

- [ ] **Step 2: Run the full test suite to confirm nothing else references the removed subtitle or `KpiChip`**

Run: `cd web && npm test`
Expected: no test references `OverviewKpiBar`'s markup (confirmed in the exploration step — no test file exists for it), so this is a visual-only change with no test to update.

- [ ] **Step 3: Commit**

```bash
git add web/components/property/overview/OverviewKpiBar.tsx
git commit -m "feat(kpi): add KpiScale to the sticky KPI bar, drop sticky positioning"
```

---

### Task 5: Add an `overlay` prop to `Modal`

**Files:**
- Modify: `components/ui/Modal.tsx:74–78`
- Test: `tests/components/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `tests/components/Modal.test.tsx`, inside the `describe('Modal focus trap', ...)` block (before the closing `});`):

```tsx
  it('applies the dark backdrop by default, and omits it when overlay={false}', () => {
    const { container, rerender } = render(
      <Modal open onClose={() => {}} title="Overlay test">
        <button type="button">Action</button>
      </Modal>
    );
    expect(container.firstElementChild?.className).toContain('bg-black/40');

    rerender(
      <Modal open onClose={() => {}} title="Overlay test" overlay={false}>
        <button type="button">Action</button>
      </Modal>
    );
    expect(container.firstElementChild?.className).not.toContain('bg-black/40');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- components/Modal`
Expected: FAIL — `overlay` prop doesn't exist, backdrop is always present.

- [ ] **Step 3: Implement the `overlay` prop**

In `components/ui/Modal.tsx`, update the function signature (around line 9) and the outer `<div>` (around line 74):

```tsx
export function Modal({
  open,
  onClose,
  title,
  children,
  overlay = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  overlay?: boolean;
}) {
```

```tsx
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${overlay ? 'bg-black/40' : ''}`}
      onClick={onClose}
    >
```

Everything else in the file (focus trap, Escape handling, scroll lock, panel markup) is unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- components/Modal`
Expected: PASS (all existing focus-trap tests unaffected, new overlay test passes)

- [ ] **Step 5: Commit**

```bash
git add web/components/ui/Modal.tsx web/tests/components/Modal.test.tsx
git commit -m "feat(modal): add optional overlay prop, default true (no behavior change for existing callers)"
```

---

### Task 6: Expose calculation intermediates on `OverviewMetrics`

**Files:**
- Modify: `lib/data/propertyOverview.ts:21–37, 148–165`
- Test: `tests/data/propertyOverview.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/data/propertyOverview.test.ts`, inside the `describe('computeOverviewMetrics', ...)` block (before the closing `});`):

```ts
  it('exposes cashflowBeforeTaxYear consistent with cashOnCash * equityUsed (its own numerator/denominator)', () => {
    expect(result.cashflowBeforeTaxYear).toBeCloseTo(result.cashOnCash! * result.equityUsed, 2);
  });

  it('exposes eigenkapitalrenditeNumerator consistent with eigenkapitalrendite * equityUsed', () => {
    expect(result.eigenkapitalrenditeNumerator).toBeCloseTo(result.eigenkapitalrendite! * result.equityUsed, 2);
  });

  it('exposes leerstandDaysSinceTransfer/ownershipDaysSinceTransfer consistent with actualVacancyRate', () => {
    expect(result.leerstandDaysSinceTransfer).toBe(0);
    expect(result.ownershipDaysSinceTransfer).toBeGreaterThan(0);
    expect(result.actualVacancyRate).toBeCloseTo(result.leerstandDaysSinceTransfer / result.ownershipDaysSinceTransfer, 6);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npm test -- data/propertyOverview`
Expected: FAIL — `result.cashflowBeforeTaxYear` etc. are `undefined`.

- [ ] **Step 3: Expose the four fields**

In `lib/data/propertyOverview.ts`, add to the `OverviewMetrics` interface (after `actualVacancyRate: number | null;`):

```ts
  /** Pre-tax annual cashflow — the numerator cashOnCash was computed from. */
  cashflowBeforeTaxYear: number;
  /** The numerator eigenkapitalrendite was computed from. */
  eigenkapitalrenditeNumerator: number;
  /** Raw day counts actualVacancyRate was computed from (0/0 when there's no status history). */
  leerstandDaysSinceTransfer: number;
  ownershipDaysSinceTransfer: number;
```

And in the function's `return` statement, add the four fields (values already exist as local consts — `cashflowBeforeTaxYear`, `eigenkapitalrenditeNumerator`, `leerstandDays`, `ownershipDays`):

```ts
    cashflowBeforeTaxYear,
    eigenkapitalrenditeNumerator,
    leerstandDaysSinceTransfer: leerstandDays,
    ownershipDaysSinceTransfer: ownershipDays,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npm test -- data/propertyOverview`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyOverview.ts web/tests/data/propertyOverview.test.ts
git commit -m "feat(overview): expose cashflow/eigenkapitalrendite/vacancy calculation intermediates"
```

---

### Task 7: `kpiCalculationText` — the "Berechnung" string per KPI

**Files:**
- Create: `lib/kpiCalculationText.ts`
- Test: `tests/kpiCalculationText.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/kpiCalculationText.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { kpiCalculationText } from '@/lib/kpiCalculationText';
import { formatCurrency, formatPercent } from '@/lib/formatters';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01099',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: null,
    notes: '',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'nicht_vorhanden',
    parking_count: 0,
    heating_type: null,
    energy_efficiency_class: null,
    condition: null,
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: f.purchasePriceUnit,
    purchase_price_parking: f.purchasePriceParking,
    land_transfer_tax: f.landTransferTax,
    notary_costs: f.notaryCosts,
    land_registry_costs: f.landRegistryCosts,
    agent_fee: f.agentFee,
    appraisal_costs: f.appraisalCosts,
    renovation_modernization_costs: f.renovationModernizationCosts,
    renovation_afa_eligible: f.renovationAfaEligible,
    cold_rent_monthly: f.coldRentMonthly,
    warmmiete_monthly: null,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: f.vacancyRateAssumption,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: f.loanAmount,
    interest_rate: f.interestRate,
    amortization_rate: f.amortizationRate,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: f.monthlyMortgage,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: f.landValue,
    building_value: f.buildingValue,
    depreciation_rate: f.depreciationRate,
    marginal_tax_rate: f.marginalTaxRate,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeStatusEntry(overrides: Partial<StatusEntryRow> = {}): StatusEntryRow {
  return {
    id: 'status-1',
    property_id: 'prop-1',
    date: '2026-02-01',
    status: 'vermietet',
    income_actual_monthly: null,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('kpiCalculationText', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);
  const summary = computePropertySummary(property, statusEntries, today);
  const overview = computeOverviewMetrics(property, statusEntries, [], summary, today);

  it('grossYield: shows the monthly rents, ×12, over the purchase price, ending in the formatted result', () => {
    const text = kpiCalculationText('grossYield', property, summary, overview);
    expect(text).toContain(formatCurrency(f.coldRentMonthly));
    expect(text).toContain(formatCurrency(f.parkingRentMonthly));
    expect(text).toContain(formatCurrency(f.purchasePrice));
    expect(text?.endsWith(formatPercent(overview.grossYield!))).toBe(true);
  });

  it('netYield: NOI over total investment', () => {
    const text = kpiCalculationText('netYield', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.netOperatingIncomeYearly));
    expect(text).toContain(formatCurrency(summary.totalInvestment));
    expect(text?.endsWith(formatPercent(summary.netYield!))).toBe(true);
  });

  it('dscr: NOI over annual debt service (monthly mortgage × 12)', () => {
    const text = kpiCalculationText('dscr', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.netOperatingIncomeYearly));
    expect(text).toContain(formatCurrency(property.monthly_mortgage * 12));
  });

  it('ltv: remaining debt over total investment', () => {
    const text = kpiCalculationText('ltv', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.remainingDebtNow));
    expect(text).toContain(formatCurrency(summary.totalInvestment));
    expect(text?.endsWith(formatPercent(overview.ltv!))).toBe(true);
  });

  it('kaufpreisfaktor: purchase price over yearly rent, ending in the ×-formatted result', () => {
    const text = kpiCalculationText('kaufpreisfaktor', property, summary, overview);
    expect(text).toContain(formatCurrency(summary.totalPurchasePrice));
    expect(text).toMatch(/×$/);
  });

  it('returns null when the underlying KPI value itself is null (e.g. no status history for actualVacancyRate)', () => {
    const noHistoryOverview = computeOverviewMetrics(property, [], [], summary, today);
    expect(noHistoryOverview.actualVacancyRate).toBeNull();
    expect(kpiCalculationText('actualVacancyRate', property, summary, noHistoryOverview)).toBeNull();
  });

  it('actualVacancyRate: shows leerstand days over ownership days when history exists', () => {
    const text = kpiCalculationText('actualVacancyRate', property, summary, overview);
    expect(text).toContain(`${overview.leerstandDaysSinceTransfer}`);
    expect(text).toContain(`${overview.ownershipDaysSinceTransfer}`);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npm test -- kpiCalculationText`
Expected: FAIL — `@/lib/kpiCalculationText` does not exist yet.

- [ ] **Step 3: Implement `kpiCalculationText.ts`**

Create `lib/kpiCalculationText.ts`:

```ts
import type { Database } from '@/lib/supabase/types';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import { formatCurrency, formatPercent, formatMultiplier, formatNumber } from '@/lib/formatters';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

/**
 * The KPI's formula with this property's real numbers plugged in, e.g.
 * "950,00 € + 48,00 € × 12 ÷ 278.600,00 € = 4,3 %". Returns null when the
 * KPI's own value is null (same "no data yet" cases as the KPI itself).
 */
export function kpiCalculationText(
  kpi: BenchmarkKpi,
  property: PropertyRow,
  summary: PropertySummary,
  overview: OverviewMetrics
): string | null {
  switch (kpi) {
    case 'grossYield': {
      if (overview.grossYield === null) return null;
      return `(${formatCurrency(property.cold_rent_monthly)} + ${formatCurrency(property.parking_rent_monthly)}) × 12 ÷ ${formatCurrency(
        summary.totalPurchasePrice
      )} = ${formatPercent(overview.grossYield)}`;
    }
    case 'netYield': {
      if (summary.netYield === null) return null;
      return `${formatCurrency(summary.netOperatingIncomeYearly)} ÷ ${formatCurrency(summary.totalInvestment)} = ${formatPercent(
        summary.netYield
      )}`;
    }
    case 'cashOnCash': {
      if (overview.cashOnCash === null) return null;
      return `${formatCurrency(overview.cashflowBeforeTaxYear)} ÷ ${formatCurrency(overview.equityUsed)} = ${formatPercent(
        overview.cashOnCash
      )}`;
    }
    case 'eigenkapitalrendite': {
      if (overview.eigenkapitalrendite === null) return null;
      return `${formatCurrency(overview.eigenkapitalrenditeNumerator)} ÷ ${formatCurrency(overview.equityUsed)} = ${formatPercent(
        overview.eigenkapitalrendite
      )}`;
    }
    case 'kaufpreisfaktor': {
      if (overview.kaufpreisfaktor === null) return null;
      const rentYearly = (property.cold_rent_monthly + property.parking_rent_monthly) * 12;
      return `${formatCurrency(summary.totalPurchasePrice)} ÷ ${formatCurrency(rentYearly)} = ${formatMultiplier(
        overview.kaufpreisfaktor
      )}`;
    }
    case 'dscr': {
      if (overview.dscr === null) return null;
      const debtServiceAnnual = property.monthly_mortgage * 12;
      return `${formatCurrency(summary.netOperatingIncomeYearly)} ÷ ${formatCurrency(debtServiceAnnual)} = ${formatNumber(
        overview.dscr,
        2
      )}`;
    }
    case 'ltv': {
      if (overview.ltv === null) return null;
      return `${formatCurrency(summary.remainingDebtNow)} ÷ ${formatCurrency(summary.totalInvestment)} = ${formatPercent(overview.ltv)}`;
    }
    case 'actualVacancyRate': {
      if (overview.actualVacancyRate === null) return null;
      return `${overview.leerstandDaysSinceTransfer} Tage ÷ ${overview.ownershipDaysSinceTransfer} Tage = ${formatPercent(
        overview.actualVacancyRate
      )}`;
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npm test -- kpiCalculationText`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/kpiCalculationText.ts web/tests/kpiCalculationText.test.ts
git commit -m "feat(kpi): add kpiCalculationText for the popup's real-number Berechnung line"
```

---

### Task 8: Restructure `kpiInfo.ts` — formula / purpose / goodWhen / einordnung

**Files:**
- Modify: `lib/kpiInfo.ts`
- Modify: `tests/kpiInfo.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/kpiInfo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

const ALL_KPIS: BenchmarkKpi[] = [
  'grossYield',
  'netYield',
  'cashOnCash',
  'eigenkapitalrendite',
  'kaufpreisfaktor',
  'dscr',
  'ltv',
  'actualVacancyRate',
];

describe('KPI_INFO', () => {
  it('has an entry for every BenchmarkKpi, each with non-empty formula/purpose/goodWhen', () => {
    for (const kpi of ALL_KPIS) {
      const info = KPI_INFO[kpi];
      expect(info).toBeDefined();
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.formula.length).toBeGreaterThan(0);
      expect(info.purpose.length).toBeGreaterThan(0);
      expect(info.goodWhen.length).toBeGreaterThan(0);
    }
  });

  it('einordnung, where present, is non-empty (never an empty string that would render an empty section)', () => {
    for (const kpi of ALL_KPIS) {
      const einordnung = KPI_INFO[kpi].einordnung;
      if (einordnung !== undefined) {
        expect(einordnung.length).toBeGreaterThan(0);
      }
    }
  });
});
```

(Fixes a pre-existing gap: the old `ALL_KPIS` list was missing `'eigenkapitalrendite'`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- kpiInfo`
Expected: FAIL — `info.purpose`/`info.goodWhen` are `undefined` (current shape has `meaning`/`benchmarks`/`context` instead).

- [ ] **Step 3: Rewrite `kpiInfo.ts`**

Replace the full contents of `lib/kpiInfo.ts`:

```ts
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export interface KpiInfo {
  name: string;
  /** General formula, may contain \n for multi-line display. */
  formula: string;
  /** "Wozu" — what the KPI is for / why it matters. */
  purpose: string;
  /** "Wann gut" — the threshold and why. */
  goodWhen: string;
  /** "Einordnung" — additional market context. Omitted entirely from the popup when absent. */
  einordnung?: string;
}

// Copy from docs/superpowers/specs/2026-08-01-uebersicht-redesign-design.md.
export const KPI_INFO: Record<BenchmarkKpi, KpiInfo> = {
  grossYield: {
    name: 'Bruttorendite',
    formula: '(Kaltmiete + Stellplatzmiete) × 12\n÷ Kaufpreis',
    purpose: 'Erster grober Vergleichswert zwischen Objekten — zeigt den Rohertrag, bevor laufende Kosten abgezogen werden.',
    goodWhen:
      'Ab 5 % ist die Miete komfortabel höher als typische Finanzierungskosten. Unter 3 % deckt die Miete oft nicht mal die Zinsen nach Bewirtschaftungskosten.',
    einordnung: 'In A-Lagen sind 2,5–3,5 % strukturell bedingt durch hohe Kaufpreise — kein Qualitätsmerkmal, sondern Marktrealität.',
  },
  netYield: {
    name: 'Nettorendite',
    formula: 'NOI (Nettobetriebsergebnis)\n÷ Gesamtinvestment',
    purpose:
      'Beste Vergleichskennzahl für die tatsächliche Performance — berücksichtigt laufende Kosten und Kaufnebenkosten, anders als die Bruttorendite.',
    goodWhen: 'Ab 4 % ist die Rendite nach Kosten solide. Unter 2 % ist sie bei aktuellen Zinsen von 4 %+ wirtschaftlich kritisch.',
    einordnung: 'Faustregel: Nettorendite = Bruttorendite minus 1,5 bis 2,5 Prozentpunkte.',
  },
  cashOnCash: {
    name: 'Cash-on-Cash Return',
    formula:
      'Cashflow vor Steuern (Jahr)\n÷ eingesetztes Eigenkapital\n\nCashflow vor Steuern = Mieteinnahmen\n− volle Kreditrate (Zins + Tilgung) − Bewirtschaftungskosten',
    purpose:
      'Zeigt, wie viel Bargeld die Immobilie dieses Jahr abwirft, relativ zum eingesetzten Eigenkapital — ohne Anrechnung von Tilgung oder Wertsteigerung. Für die Gesamtrendite inkl. Vermögensaufbau siehe „Eigenkapitalrendite".',
    goodWhen:
      'Ab 6 % ist der Cashflow deutlich positiv zum Eigenkapital. Unter 3 % (oder negativ) trägt sich die Investition kaum aus laufenden Einnahmen.',
    einordnung:
      'Bei aktuellen Zinsen und typischen Kaufpreisfaktoren in A/B-Städten ist 0–2 % realistisch — in A-Lagen oft negativ. Stark hebel-abhängig: mehr Eigenkapital senkt den prozentualen CoC trotz besserem Zins-Coverage.',
  },
  eigenkapitalrendite: {
    name: 'Eigenkapitalrendite',
    formula:
      '(Jahresnettokaltmiete − nicht umlegbare Kosten p.a.\n− Steuern p.a. − Zinskosten p.a.)\n÷ eingesetztes Eigenkapital\n\nEntspricht Cash-on-Cash, aber nur der Zinsanteil\nder Kreditrate wird abgezogen (nicht die Tilgung).',
    purpose:
      'Wie Cash-on-Cash, aber die Tilgung wird nicht als Kosten behandelt — sie baut ja Vermögen auf, auch wenn kein Bargeld fließt. Enthält keine Wertsteigerung.',
    goodWhen:
      'Ab 8 % ist die Gesamtrendite auf das Eigenkapital stark. Unter 4 % ist sie schwach, selbst wenn der Cash-on-Cash-Wert negativ aussieht.',
    einordnung:
      'Da nur Zinsen statt der vollen Kreditrate abgezogen werden, liegt die Eigenkapitalrendite immer über dem Cash-on-Cash-Wert (um genau den Tilgungsanteil ÷ eingesetztes Eigenkapital) — das ist kein Fehler, sondern der Unterschied zwischen den beiden Kennzahlen.',
  },
  kaufpreisfaktor: {
    name: 'Kaufpreisfaktor',
    formula: 'Kaufpreis ÷ Jahreskaltmiete',
    purpose:
      'Zeigt, wie viele Jahresmieten der Kaufpreis entspricht — gebräuchlich unter Maklern und Banken, Kehrwert der Bruttorendite × 100.',
    goodWhen: 'Bis 20× gilt als günstig. Über 25× ist der Kaufpreis im Verhältnis zur Miete hoch.',
    einordnung:
      'A-Lagen lagen 2024 bei 25–35, B-Lagen bei 18–25, C-Lagen unter 18. Ein Faktor unter 15 kann auf strukturelle Risiken hinweisen (Leerstand, schrumpfende Region).',
  },
  dscr: {
    name: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'NOI\n÷ jährlicher Schuldendienst (Kreditrate × 12)',
    purpose:
      'Risiko-Indikator, ob die Immobilie den Kredit allein aus dem Betriebsergebnis trägt — wichtig für Banken und zur eigenen Absicherung.',
    goodWhen: 'Ab 1,25 trägt sich der Kredit komfortabel aus dem Betriebsergebnis. Unter 1,0 reicht das Betriebsergebnis allein nicht aus.',
    einordnung:
      'Banken fordern für Kreditvergabe typischerweise 1,2–1,5. Bei aktuellen Zinsen (4 %+) ist ein DSCR über 1,0 in A/B-Lagen schwer zu erreichen — 0,85–1,0 ist für Privatinvestoren mit Einkommensnachweis strukturell normal.',
  },
  ltv: {
    name: 'LTV (Loan-to-Value)',
    formula: 'Restschuld ÷ Gesamtinvestment',
    purpose:
      'Zeigt den Verschuldungsgrad der Immobilie — je niedriger, desto weniger Zins- und Refinanzierungsrisiko bei einer Anschlussfinanzierung.',
    goodWhen: 'Unter 70 % gelten meist die besten Bankkonditionen. Ab 80 % steigen die Zinsen spürbar.',
    einordnung:
      'Banken bieten die besten Konditionen unter 60 % LTV (Pfandbrief-Beleihungsgrenze). Ab 80 % steigen die Zinsen deutlich — ca. +1,3 Prozentpunkte.',
  },
  actualVacancyRate: {
    name: 'Tatsächliche Leerstandsquote',
    formula: 'Leerstandstage seit Erwerb\n÷ Eigentumstage seit Erwerb',
    purpose:
      'Zeigt den Ist-Leerstand seit dem Kauf im Vergleich zur angenommenen Leerstandsquote (Mietausfallwagnis) aus den Objektdaten.',
    goodWhen: 'Unter 3 % ist der Leerstand gering. Über 8 % liegt deutlich über dem, was die meisten Kalkulationen einplanen.',
    einordnung: 'Nationaler Markt-Leerstand Ende 2024 bei ~2,2 %. In strukturschwachen Regionen reale Leerstandsquoten von 10–15 %+.',
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- kpiInfo`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/kpiInfo.ts web/tests/kpiInfo.test.ts
git commit -m "feat(kpi): restructure KPI copy into formula/purpose/goodWhen/einordnung"
```

---

### Task 9: Rewrite `KpiInfoButton` — no overlay, Berechnung, Wozu/Wann gut, scale, Einordnung

**Files:**
- Modify: `components/property/KpiInfoButton.tsx`

- [ ] **Step 1: Replace the full contents of `components/property/KpiInfoButton.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KpiScale } from '@/components/property/KpiScale';
import { KPI_INFO } from '@/lib/kpiInfo';
import { kpiCalculationText } from '@/lib/kpiCalculationText';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function KpiInfoButton({
  kpi,
  value,
  property,
  summary,
  overview,
}: {
  kpi: BenchmarkKpi;
  value: number | null;
  property: PropertyRow;
  summary: PropertySummary;
  overview: OverviewMetrics;
}) {
  const [open, setOpen] = useState(false);
  const info = KPI_INFO[kpi];
  const calculation = kpiCalculationText(kpi, property, summary, overview);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${info.name} — Info`}
        className="text-text-dim hover:text-accent"
      >
        <Info size={13} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={info.name} overlay={false}>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-black/[0.03] p-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-dim">Formel</p>
            <p className="whitespace-pre-line font-mono text-[13px] text-text-secondary">{info.formula}</p>
            {calculation && (
              <div className="mt-2.5 border-t border-dashed border-black/10 pt-2.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-accent">Berechnung</p>
                <p className="whitespace-pre-line font-mono text-[13px] font-semibold text-text-primary">{calculation}</p>
              </div>
            )}
          </div>

          <p className="text-text-primary">
            <span className="font-semibold">Wozu:</span> {info.purpose}
          </p>
          <p className="text-text-primary">
            <span className="font-semibold">Wann gut:</span> {info.goodWhen}
          </p>

          <KpiScale kpi={kpi} value={value} showAxis />

          {info.einordnung && (
            <div className="border-t border-black/[0.06] pt-3">
              <p className="mb-1 text-sm font-bold text-text-primary">Einordnung</p>
              <p className="text-xs text-text-dim">{info.einordnung}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Run the full test suite and typecheck**

Run: `cd web && npm test && npx tsc --noEmit`
Expected: PASS — this closes the type-error gap left open at the end of Task 3 (`ReturnsCard` already passes `value`/`property`/`summary`/`overview`).

- [ ] **Step 3: Commit**

```bash
git add web/components/property/KpiInfoButton.tsx
git commit -m "feat(kpi): redesign KpiInfoButton popup — no overlay, Berechnung, Wozu/Wann gut, scale, Einordnung"
```

---

### Task 10: Itemized "Laufende Kosten" — `runningCostsBreakdown`

**Files:**
- Modify: `lib/data/propertySummary.ts:14–27, 145–156, 171–185`
- Test: `tests/data/propertySummary.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/data/propertySummary.test.ts`, as a new top-level `describe` block after the existing `describe('computePropertySummary — Card 1 breakdown fields', ...)`:

```ts
describe('computePropertySummary — runningCostsBreakdown', () => {
  const statusHistory = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('sums to the same value the old algebraic-inverse formula produced (incomeActualMonthly - monthlyMortgage - cashflowBeforeTaxMonthly)', () => {
    const property = makeProperty();
    const result = computePropertySummary(property, statusHistory, today);
    const expectedTotal = result.incomeActualMonthly - property.monthly_mortgage - result.cashflowBeforeTaxMonthly;
    const actualTotal = result.runningCostsBreakdown.reduce((sum, item) => sum + item.amountMonthly, 0);
    expect(actualTotal).toBeCloseTo(expectedTotal, 2);
  });

  it('omits zero-amount items — base fixture has no parking, no insurance, no other costs', () => {
    const result = computePropertySummary(makeProperty(), statusHistory, today);
    const labels = result.runningCostsBreakdown.map((item) => item.label);
    expect(labels).not.toContain('Stellplatz-Kosten');
    expect(labels).not.toContain('Gebäudeversicherung');
    expect(labels).not.toContain('Sonstige Kosten');
    expect(labels).toContain('Hausgeld (nicht umlagefähig)');
    expect(labels).toContain('Instandhaltungsrücklage');
    expect(labels).toContain('Hausverwaltung');
  });

  it('includes a non-zero Stellplatz-Kosten line when parking HOA costs are set', () => {
    const property = makeProperty({
      parking_type: 'tiefgarage',
      hoa_fee_parking_total_monthly: 40,
      hoa_fee_parking_recoverable_monthly: 0,
      hoa_fee_parking_maintenance_reserve_monthly: 0,
    });
    const result = computePropertySummary(property, statusHistory, today);
    const parkingItem = result.runningCostsBreakdown.find((item) => item.label === 'Stellplatz-Kosten');
    expect(parkingItem?.amountMonthly).toBeCloseTo(40, 2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npm test -- data/propertySummary`
Expected: FAIL — `result.runningCostsBreakdown` is `undefined`.

- [ ] **Step 3: Implement `runningCostsBreakdown`**

In `lib/data/propertySummary.ts`, add to the `PropertySummary` interface (after `taxEffectYearly: number;`):

```ts
  runningCostsBreakdown: RunningCostBreakdownItem[];
```

Add the new type above the interface (after the imports, before `export interface PropertySummary`):

```ts
export interface RunningCostBreakdownItem {
  label: string;
  amountMonthly: number;
}
```

Inside `computePropertySummary`, immediately after the existing `cashflowBeforeTaxThisMonth`/`cashflowAfterTaxMonthly` computation (i.e. after the line `const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowBeforeTaxThisMonth, taxEffectThisMonth);`), add:

```ts
  const runningCostsBreakdown: RunningCostBreakdownItem[] = [
    { label: 'Hausgeld (nicht umlagefähig)', amountMonthly: hoaFeeNonRecoverableMonthly },
    { label: 'Instandhaltungsrücklage', amountMonthly: property.hoa_fee_maintenance_reserve_monthly },
    { label: 'Hausverwaltung', amountMonthly: property.property_management_annual / 12 },
    { label: 'Gebäudeversicherung', amountMonthly: property.property_insurance_annual / 12 },
    { label: 'Sonstige Kosten', amountMonthly: property.other_costs_monthly },
    {
      label: 'Stellplatz-Kosten',
      amountMonthly:
        hoaFeeParkingNonRecoverableMonthly +
        property.hoa_fee_parking_maintenance_reserve_monthly +
        property.hoa_fee_parking_recoverable_monthly +
        property.property_tax_parking_annual / 12,
    },
    { label: 'Umlagefähige Kosten während Leerstand', amountMonthly: ownerBorneRecoverableWEMonthly },
  ].filter((item) => Math.abs(item.amountMonthly) > 0.005);
```

And add `runningCostsBreakdown,` to the function's final `return { ... }` object.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npm test -- data/propertySummary`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertySummary.ts web/tests/data/propertySummary.test.ts
git commit -m "feat(cashflow): expose itemized runningCostsBreakdown on PropertySummary"
```

---

### Task 11: `CurrentStatusCard` — render the itemized breakdown

**Files:**
- Modify: `components/property/overview/CurrentStatusCard.tsx:21–29, 58–61`

- [ ] **Step 1: Replace the full contents of `components/property/overview/CurrentStatusCard.tsx`**

```tsx
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';

export function CurrentStatusCard({
  propertyId,
  summary,
  monthlyMortgage,
  hasStatusHistory,
  latestStatusDate,
}: {
  propertyId: string;
  summary: PropertySummary;
  monthlyMortgage: number;
  hasStatusHistory: boolean;
  latestStatusDate: Date | null;
}) {
  const runningCostsMonthly = summary.runningCostsBreakdown.reduce((sum, item) => sum + item.amountMonthly, 0);
  const cashflowAfterColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <GlassCard>
      <SectionLabel>Aktueller Stand</SectionLabel>

      <div className="flex items-center gap-2">
        <StatusBadge status={summary.currentStatus} />
        {latestStatusDate && <span className="text-xs text-text-dim">seit {formatDate(latestStatusDate)}</span>}
      </div>

      {!hasStatusHistory ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-text-secondary">Noch kein Status vorhanden.</p>
          <Link href={`/properties/${propertyId}/verlauf`} className="text-sm font-semibold text-accent hover:underline">
            + Ersten Status hinzufügen
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Einnahmen</span>
            <span className="text-text-primary">{formatCurrency(summary.incomeActualMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Kreditrate</span>
            <span className="text-text-primary">{formatCurrency(-monthlyMortgage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Laufende Kosten</span>
            <span className="text-text-primary">{formatCurrency(-runningCostsMonthly)}</span>
          </div>
          {summary.runningCostsBreakdown.map((item) => (
            <div key={item.label} className="flex justify-between border-l-2 border-black/[0.06] py-0.5 pl-2.5 text-xs text-text-dim">
              <span>{item.label}</span>
              <span>{formatCurrency(-item.amountMonthly)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-black/[0.06] pt-1.5 font-bold">
            <span className="text-text-primary">Cashflow vor Steuern</span>
            <span className="text-text-primary">{formatCurrency(summary.cashflowBeforeTaxMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Steuereffekt (Ø monatl.)</span>
            <span className="text-accent">{formatCurrency(summary.taxEffectMonthly)}</span>
          </div>
          <div
            className={`flex justify-between border-t border-black/[0.06] pt-1.5 text-[18px] font-extrabold ${cashflowAfterColor}`}
          >
            <span>Cashflow nach Steuern</span>
            <span>{formatCurrency(summary.cashflowAfterTaxMonthly)}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
```

This removes the old fragile algebraic-inverse comment/computation entirely — `runningCostsMonthly` is now a straight sum of the real itemized breakdown from Task 10.

- [ ] **Step 2: Run the full test suite and typecheck**

Run: `cd web && npm test && npx tsc --noEmit`
Expected: PASS (no test file exists for `CurrentStatusCard` — confirmed in exploration — so this is a visual-only change with no test to update)

- [ ] **Step 3: Commit**

```bash
git add web/components/property/overview/CurrentStatusCard.tsx
git commit -m "feat(cashflow): render itemized Laufende Kosten breakdown in CurrentStatusCard"
```

---

### Task 12: `PhotoCarousel` — scrollable square photo widget

**Files:**
- Create: `components/property/overview/PhotoCarousel.tsx`
- Test: `tests/components/PhotoCarousel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/PhotoCarousel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PhotoCarousel } from '@/components/property/overview/PhotoCarousel';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

afterEach(cleanup);

function makePhoto(overrides: Partial<PropertyPhotoWithUrl['photo']> = {}): PropertyPhotoWithUrl {
  return {
    photo: {
      id: 'photo-1',
      property_id: 'prop-1',
      file_path: 'prop-1/photo-1.jpg',
      is_cover_photo: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      ...overrides,
    },
    url: 'https://example.com/photo-1.jpg',
  };
}

describe('PhotoCarousel', () => {
  it('renders the placeholder icon and no counter badge when there are no photos', () => {
    const { container } = render(<PhotoCarousel photos={[]} propertyType="apartment" />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });

  it('renders one image per photo, plus a counter badge and one dot per photo when there are 2+', () => {
    const photos = [makePhoto({ id: 'a', sort_order: 0 }), makePhoto({ id: 'b', sort_order: 1 }), makePhoto({ id: 'c', sort_order: 2 })];
    const { container } = render(<PhotoCarousel photos={photos} propertyType="apartment" />);
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('starts the counter at the cover photo index, not always at 1', () => {
    const photos = [makePhoto({ id: 'a', sort_order: 0 }), makePhoto({ id: 'b', sort_order: 1, is_cover_photo: true })];
    render(<PhotoCarousel photos={photos} propertyType="apartment" />);
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('renders no counter badge for a single photo', () => {
    render(<PhotoCarousel photos={[makePhoto()]} propertyType="apartment" />);
    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- components/PhotoCarousel`
Expected: FAIL — `@/components/property/overview/PhotoCarousel` does not exist yet.

- [ ] **Step 3: Implement `PhotoCarousel.tsx`**

Create `components/property/overview/PhotoCarousel.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { PLACEHOLDER_ICONS } from '@/lib/propertyTypeIcons';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

/**
 * Square, horizontally scrollable photo widget for the property header. Scroll-snap
 * (native, no JS slider) handles the actual swipe/scroll; this component only tracks
 * which photo is active for the dot indicator and counter badge. View-only — editing,
 * deleting, and setting the cover photo stays exclusive to FotosSection.
 */
export function PhotoCarousel({ photos, propertyType }: { photos: PropertyPhotoWithUrl[]; propertyType: PropertyType }) {
  const coverIndex = Math.max(
    0,
    photos.findIndex(({ photo }) => photo.is_cover_photo)
  );
  const [activeIndex, setActiveIndex] = useState(coverIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && coverIndex > 0) {
      el.scrollLeft = coverIndex * el.clientWidth;
    }
    // Only meant to run once on mount, to jump straight to the cover photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (photos.length === 0) {
    const Icon = PLACEHOLDER_ICONS[propertyType];
    return (
      <div className="flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-slate-200 to-slate-300">
        <Icon size={40} className="text-slate-400" />
      </div>
    );
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="relative h-[120px] w-[120px] flex-shrink-0 overflow-hidden rounded-[14px]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map(({ photo, url }) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
          <img key={photo.id} src={url} alt="" className="h-full w-full flex-shrink-0 snap-center object-cover" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
            {activeIndex + 1}/{photos.length}
          </span>
          <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            {photos.map((_, i) => (
              <span key={i} className={`h-1 w-1 rounded-full ${i === activeIndex ? 'bg-white' : 'bg-white/55'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- components/PhotoCarousel`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/components/property/overview/PhotoCarousel.tsx web/tests/components/PhotoCarousel.test.tsx
git commit -m "feat(overview): add PhotoCarousel, a scrollable square photo widget"
```

---

### Task 13: `PropertyHeaderCard` — photo carousel + all object data, replaces `PropertyHeaderPhoto` + `ObjectCard`

**Files:**
- Create: `components/property/overview/PropertyHeaderCard.tsx`
- Test: `tests/components/PropertyHeaderCard.test.tsx`
- Delete: `components/property/PropertyHeaderPhoto.tsx`
- Delete: `components/property/overview/ObjectCard.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/PropertyHeaderCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PropertyHeaderCard } from '@/components/property/overview/PropertyHeaderCard';
import type { Database } from '@/lib/supabase/types';

afterEach(cleanup);

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Johann-Meyer-Straße 7b',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01097',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: 1996,
    notes: '',
    living_area_sqm: 76.41,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 2,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'tiefgarage',
    parking_count: 1,
    heating_type: 'gas',
    energy_efficiency_class: 'd',
    condition: 'gepflegt',
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: 263_600,
    purchase_price_parking: 15_000,
    land_transfer_tax: 15_323,
    notary_costs: 3_631.96,
    land_registry_costs: 1_180,
    agent_fee: 0,
    appraisal_costs: 0,
    renovation_modernization_costs: 0,
    renovation_afa_eligible: 0,
    cold_rent_monthly: 950,
    warmmiete_monthly: null,
    parking_rent_monthly: 48,
    other_income_monthly: 0,
    vacancy_rate_assumption: 0.03,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: 417,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: 292,
    hoa_fee_maintenance_reserve_monthly: 34.76,
    property_tax_annual: 205,
    property_management_annual: 396,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: 230_000,
    interest_rate: 0.043,
    amortization_rate: 0.01,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: 1_242.85,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: 50_600,
    building_value: 228_000,
    depreciation_rate: 0.0384,
    marginal_tax_rate: 0.42,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PropertyHeaderCard', () => {
  it('renders the address and all object data fields', () => {
    render(<PropertyHeaderCard property={makeProperty()} purchasePricePerSqm={3_646.12} photos={[]} />);
    expect(screen.getByText('Johann-Meyer-Straße 7b, 01097 Dresden')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();
    expect(screen.getByText('1996')).toBeInTheDocument();
    expect(screen.getByText('Gepflegt')).toBeInTheDocument();
    expect(screen.getByText('Gas')).toBeInTheDocument();
    expect(screen.getByText('Tiefgarage')).toBeInTheDocument();
  });

  it('renders the photo placeholder (no <img>) when there are no photos', () => {
    const { container } = render(<PropertyHeaderCard property={makeProperty()} purchasePricePerSqm={3_646.12} photos={[]} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- components/PropertyHeaderCard`
Expected: FAIL — `@/components/property/overview/PropertyHeaderCard` does not exist yet.

- [ ] **Step 3: Implement `PropertyHeaderCard.tsx`**

Create `components/property/overview/PropertyHeaderCard.tsx`:

```tsx
import { GlassCard } from '@/components/ui/GlassCard';
import { PhotoCarousel } from '@/components/property/overview/PhotoCarousel';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const PROPERTY_TYPE_LABELS: Record<PropertyRow['property_type'], string> = {
  apartment: 'Apartment',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  gewerbe: 'Gewerbe',
  grundstuck: 'Grundstück',
  sonstiges: 'Sonstiges',
};

const ENERGY_CLASS_LABELS: Record<NonNullable<PropertyRow['energy_efficiency_class']>, string> = {
  a_plus_plus: 'A++',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  h: 'H',
};

const CONDITION_LABELS: Record<NonNullable<PropertyRow['condition']>, string> = {
  neubau: 'Neubau',
  erstbezug: 'Erstbezug',
  gepflegt: 'Gepflegt',
  renovierungsbedurftig: 'Renovierungsbedürftig',
  sanierungsbedurftig: 'Sanierungsbedürftig',
};

const HEATING_LABELS: Record<NonNullable<PropertyRow['heating_type']>, string> = {
  fernwarme: 'Fernwärme',
  gas: 'Gas',
  ol: 'Öl',
  warmepumpe: 'Wärmepumpe',
  pellet: 'Pellet',
  elektro: 'Elektro',
  sonstiges: 'Sonstiges',
};

const PARKING_LABELS: Record<PropertyRow['parking_type'], string> = {
  nicht_vorhanden: '–',
  tiefgarage: 'Tiefgarage',
  aussenstellplatz: 'Außenstellplatz',
  garage: 'Garage',
};

export function PropertyHeaderCard({
  property,
  purchasePricePerSqm,
  photos,
}: {
  property: PropertyRow;
  purchasePricePerSqm: number;
  photos: PropertyPhotoWithUrl[];
}) {
  const coldRentPerSqm = property.living_area_sqm > 0 ? property.cold_rent_monthly / property.living_area_sqm : 0;

  return (
    <GlassCard variant="solid">
      <div className="flex gap-4">
        <PhotoCarousel photos={photos} propertyType={property.property_type} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-text-primary">
            {property.address}, {property.postal_code} {property.city}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
            <span className="text-text-secondary">Typ</span>
            <span className="text-right text-text-primary">{PROPERTY_TYPE_LABELS[property.property_type]}</span>

            <span className="text-text-secondary">Baujahr</span>
            <span className="text-right text-text-primary">{property.year_built ?? '–'}</span>

            <span className="text-text-secondary">Wohnfläche</span>
            <span className="text-right text-text-primary">{property.living_area_sqm.toLocaleString('de-DE')} m²</span>

            <span className="text-text-secondary">Zimmer</span>
            <span className="text-right text-text-primary">{property.rooms ?? '–'}</span>

            <span className="text-text-secondary">Kaltmiete/m²</span>
            <span className="text-right text-text-primary">{formatCurrency(coldRentPerSqm)}</span>

            <span className="text-text-secondary">Kaufpreis/m²</span>
            <span className="text-right text-text-primary">{formatCurrency(purchasePricePerSqm)}</span>

            <span className="text-text-secondary">Energieklasse</span>
            <span className="text-right text-text-primary">
              {property.energy_efficiency_class ? ENERGY_CLASS_LABELS[property.energy_efficiency_class] : '–'}
            </span>

            <span className="text-text-secondary">Zustand</span>
            <span className="text-right text-text-primary">{property.condition ? CONDITION_LABELS[property.condition] : '–'}</span>

            <span className="text-text-secondary">Heizung</span>
            <span className="text-right text-text-primary">{property.heating_type ? HEATING_LABELS[property.heating_type] : '–'}</span>

            <span className="text-text-secondary">Stellplatz</span>
            <span className="text-right text-text-primary">{PARKING_LABELS[property.parking_type]}</span>
          </div>
        </div>
      </div>
      {property.notes && <p className="mt-3 text-sm text-text-secondary">{property.notes}</p>}
    </GlassCard>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- components/PropertyHeaderCard`
Expected: PASS

- [ ] **Step 5: Delete the two replaced components**

```bash
git rm web/components/property/PropertyHeaderPhoto.tsx web/components/property/overview/ObjectCard.tsx
```

- [ ] **Step 6: Commit**

```bash
git add web/components/property/overview/PropertyHeaderCard.tsx web/tests/components/PropertyHeaderCard.test.tsx
git commit -m "feat(overview): add PropertyHeaderCard (photo carousel + object data), remove PropertyHeaderPhoto/ObjectCard"
```

(`page.tsx`, updated in Task 14, is what actually removes the dangling imports of the deleted files — the project won't typecheck between this commit and the next, which is expected mid-refactor.)

---

### Task 14: Wire the new page layout

**Files:**
- Modify: `app/(app)/properties/[id]/page.tsx`

- [ ] **Step 1: Replace the full contents of `app/(app)/properties/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { OverviewKpiBar } from '@/components/property/overview/OverviewKpiBar';
import { PropertyHeaderCard } from '@/components/property/overview/PropertyHeaderCard';
import { CurrentStatusCard } from '@/components/property/overview/CurrentStatusCard';
import { ReturnsCard } from '@/components/property/overview/ReturnsCard';
import { FinancingCard } from '@/components/property/overview/FinancingCard';

export default async function PropertyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  const sortedHistory = [...detail.statusEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  return (
    <div className="space-y-4">
      <PropertyHeaderCard property={detail.property} purchasePricePerSqm={summary.purchasePricePerSqm} photos={detail.photos} />

      <OverviewKpiBar summary={summary} overview={overview} />

      <CurrentStatusCard
        propertyId={id}
        summary={summary}
        monthlyMortgage={detail.property.monthly_mortgage}
        hasStatusHistory={detail.statusEntries.length > 0}
        latestStatusDate={latestEntry ? new Date(latestEntry.date + 'T00:00:00Z') : null}
      />
      <ReturnsCard property={detail.property} summary={summary} overview={overview} />
      <FinancingCard property={detail.property} remainingDebtNow={summary.remainingDebtNow} today={today} />
    </div>
  );
}
```

Changes from the original: `PropertyHeaderCard` (photo carousel + full object data) replaces `PropertyHeaderPhoto`, moves to the very top, and now also takes over what `ObjectCard` used to render at the bottom of the page (so `ObjectCard`'s import and render call are both gone, and `resolveCoverPhoto`/`coverUrl` — no longer needed since `PropertyHeaderCard` takes the full `photos` array — are removed too); `OverviewKpiBar` moves to just below it; `ReturnsCard` gains the `property` prop it now requires (Task 3).

- [ ] **Step 2: Run the full test suite, typecheck, and lint**

Run: `cd web && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS — this is the point where every dangling reference introduced across Tasks 3–13 (the `KpiInfoButton` prop mismatch from Task 3, the deleted `ObjectCard`/`PropertyHeaderPhoto` imports from Task 13) is fully resolved.

- [ ] **Step 3: Commit**

```bash
git add "web/app/(app)/properties/[id]/page.tsx"
git commit -m "feat(overview): reorder page — header card, KPI bar, status, returns, financing"
```

---

### Task 15: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open a property's Übersicht page**

Run the Next.js dev server (`npm run dev` from `web/`) and navigate to `/properties/<an-existing-property-id>`.

- [ ] **Step 2: Check the header**

Confirm: square photo (or placeholder icon if the property has none) top-left, all object data fields to its right, no separate "Objekt" card further down the page. If the property has 2+ photos, confirm swiping/scrolling the square moves to the next photo and the dot indicator + counter badge update.

- [ ] **Step 3: Check the KPI bar and Rendite & Investment card**

Confirm: no colored dot next to any KPI value; each KPI value is colored (red/orange/green) matching its position on the gradient scale beneath it; the "Rendite & Investment" card has a solid white background.

- [ ] **Step 4: Check a KPI info popup**

Click the (i) icon next to any KPI (e.g. Bruttorendite). Confirm: the card behind stays fully visible (no dark overlay); the popup shows "Formel" then "Berechnung" with this property's real numbers; "Wozu"/"Wann gut" text; the gradient scale with axis labels; an "Einordnung" section at the bottom (or no such section/divider if that KPI's `einordnung` were absent).

- [ ] **Step 5: Check "Laufende Kosten"**

In the "Aktueller Stand" card, confirm the itemized cost lines appear indented under "Laufende Kosten" with a thin left border, and that they sum to the "Laufende Kosten" total shown above them.

- [ ] **Step 6: Report back**

Note any visual issue found in Steps 2–5 as a follow-up — this task does not modify code itself, it only confirms Tasks 1–14 render correctly end-to-end.
