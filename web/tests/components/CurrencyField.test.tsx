// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { CurrencyField } from '@/components/ui/CurrencyField';

afterEach(cleanup);

interface Values {
  amount: number;
}

function Harness({
  onUserEdit,
  setRef,
  describedBy,
}: {
  onUserEdit?: () => void;
  setRef?: (setValue: (v: number) => void) => void;
  describedBy?: string;
}) {
  const { register, setValue } = useForm<Values>({ defaultValues: { amount: 0 } });
  setRef?.((v) => setValue('amount', v));
  return <CurrencyField label="Betrag" name="amount" register={register} onUserEdit={onUserEdit} describedBy={describedBy} />;
}

describe('CurrencyField onUserEdit', () => {
  it('fires when the user types', () => {
    const onUserEdit = vi.fn();
    render(<Harness onUserEdit={onUserEdit} />);
    fireEvent.change(screen.getByLabelText(/^Betrag/), { target: { value: '12' } });
    expect(onUserEdit).toHaveBeenCalledTimes(1);
  });

  it('does not fire for programmatic setValue', () => {
    const onUserEdit = vi.fn();
    let setAmount: (v: number) => void = () => {};
    render(<Harness onUserEdit={onUserEdit} setRef={(fn) => (setAmount = fn)} />);
    act(() => setAmount(99));
    expect(screen.getByLabelText(/^Betrag/)).toHaveValue(99);
    expect(onUserEdit).not.toHaveBeenCalled();
  });

  it('still works without the prop', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/^Betrag/), { target: { value: '5' } });
    expect(screen.getByLabelText(/^Betrag/)).toHaveValue(5);
  });
});

describe('CurrencyField describedBy', () => {
  it('sets aria-describedby on the input when provided', () => {
    render(<Harness describedBy="amount-hint" />);
    expect(screen.getByLabelText(/^Betrag/)).toHaveAttribute('aria-describedby', 'amount-hint');
  });

  it('sets no aria-describedby by default', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/^Betrag/)).not.toHaveAttribute('aria-describedby');
  });
});
