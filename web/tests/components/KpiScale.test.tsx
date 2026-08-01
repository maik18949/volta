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
    // Intl.NumberFormat('de-DE', { style: 'percent' }) inserts a non-breaking space ( )
    // before the '%' sign, matching the convention in tests/formatters.test.ts.
    expect(labels[0]).toBe('110,0 %');
    expect(labels[labels.length - 1]).toBe('0,0 %');
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
