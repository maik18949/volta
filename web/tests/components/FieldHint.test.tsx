// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FieldHint } from '@/components/ui/fieldStyles';

afterEach(cleanup);

describe('FieldHint', () => {
  it('renders its text in a status region with the given id', () => {
    render(<FieldHint id="h">Aus PLZ erkannt</FieldHint>);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Aus PLZ erkannt');
    expect(status).toHaveAttribute('id', 'h');
  });

  it('stays mounted, empty and without margin when there is nothing to say', () => {
    render(<FieldHint id="h" />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(status.className).not.toContain('mt-1.5');
  });

  it('uses different classes for the warn tone', () => {
    const { rerender } = render(<FieldHint id="h">x</FieldHint>);
    const info = screen.getByRole('status').className;
    rerender(<FieldHint id="h" tone="warn">x</FieldHint>);
    const warn = screen.getByRole('status').className;
    expect(warn).not.toBe(info);
    expect(warn).toContain('text-amber-800');
    expect(info).toContain('text-text-dim');
  });
});
