// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { formatPercent } from '@/lib/formatters';

afterEach(() => {
  cleanup();
});

describe('QuoteSlider', () => {
  it('renders the current value as a percentage', () => {
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={() => {}} />);
    // formatPercent renders a non-breaking space before the "%" sign, but
    // getByText's default normalizer collapses that to a regular space
    // before comparing — so the normalizer must be disabled to compare the
    // raw (non-breaking-space-containing) string exactly.
    expect(screen.getByText(formatPercent(0.05), { normalizer: (text) => text })).toBeInTheDocument();
  });

  it('calls onChange with the new value when dragged', () => {
    const onChange = vi.fn();
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('shows no reset button when value equals defaultValue', () => {
    render(<QuoteSlider label="Leerstandsquote" value={5} defaultValue={5} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /zurücksetzen/i })).not.toBeInTheDocument();
  });

  it('shows a reset button when value differs from defaultValue, and resets on click', () => {
    const onChange = vi.fn();
    render(<QuoteSlider label="Leerstandsquote" value={20} defaultValue={5} onChange={onChange} />);
    const resetButton = screen.getByRole('button', { name: /zurücksetzen/i });
    fireEvent.click(resetButton);
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
