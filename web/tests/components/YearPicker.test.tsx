// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { YearPicker } from '@/components/ui/YearPicker';

afterEach(cleanup);

describe('YearPicker', () => {
  it('ohne skipYear: ein Jahr vor und zurück, Grenzen sperren die Pfeile', () => {
    const onChange = vi.fn();
    const { rerender } = render(<YearPicker year={2026} onChange={onChange} minYear={2025} maxYear={2036} />);
    fireEvent.click(screen.getByLabelText('Vorheriges Jahr'));
    fireEvent.click(screen.getByLabelText('Nächstes Jahr'));
    expect(onChange).toHaveBeenNthCalledWith(1, 2025);
    expect(onChange).toHaveBeenNthCalledWith(2, 2027);
    rerender(<YearPicker year={2025} onChange={onChange} minYear={2025} maxYear={2036} />);
    expect(screen.getByLabelText('Vorheriges Jahr')).toBeDisabled();
    rerender(<YearPicker year={2036} onChange={onChange} minYear={2025} maxYear={2036} />);
    expect(screen.getByLabelText('Nächstes Jahr')).toBeDisabled();
  });

  it('mit skipYear: springt über das ausgelassene Jahr', () => {
    const onChange = vi.fn();
    const { rerender } = render(<YearPicker year={2027} onChange={onChange} minYear={2024} maxYear={2036} skipYear={2026} />);
    fireEvent.click(screen.getByLabelText('Vorheriges Jahr'));
    expect(onChange).toHaveBeenLastCalledWith(2025);
    rerender(<YearPicker year={2025} onChange={onChange} minYear={2024} maxYear={2036} skipYear={2026} />);
    fireEvent.click(screen.getByLabelText('Nächstes Jahr'));
    expect(onChange).toHaveBeenLastCalledWith(2027);
  });

  it('mit skipYear: sperrt „zurück", wenn nach dem Überspringen kein früheres Jahr mehr existiert', () => {
    render(<YearPicker year={2027} onChange={() => {}} minYear={2026} maxYear={2036} skipYear={2026} />);
    expect(screen.getByLabelText('Vorheriges Jahr')).toBeDisabled();
  });

  it('mit skipYear: sperrt „weiter", wenn das übersprungene Jahr die Obergrenze wäre', () => {
    render(<YearPicker year={2025} onChange={() => {}} minYear={2024} maxYear={2026} skipYear={2026} />);
    expect(screen.getByLabelText('Nächstes Jahr')).toBeDisabled();
  });
});
