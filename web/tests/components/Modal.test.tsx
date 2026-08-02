// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

function renderModal() {
  return render(
    <Modal open onClose={() => {}} title="Test modal">
      <button type="button">First action</button>
      <button type="button">Second action</button>
    </Modal>
  );
}

describe('Modal focus trap', () => {
  it('keeps focus inside the modal on Shift+Tab from the initial (panel-focused) state', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    // Initial focus lands on the panel container itself, as set by the
    // "focus on open" effect (panelRef.current?.focus()).
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    // Without the fix, Node.contains() being self-inclusive means the wrap
    // condition never fires here, and focus would escape the dialog via the
    // browser's native Shift+Tab handling. With the fix, focus wraps to the
    // last focusable element inside the panel (the "Second action" button,
    // which is the last element in DOM order within the panel).
    const lastAction = screen.getByRole('button', { name: 'Second action' });
    expect(document.activeElement).toBe(lastAction);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('wraps Tab from the last focusable element back to the first', () => {
    renderModal();

    const closeButton = screen.getByRole('button', { name: 'Schließen' });
    const lastAction = screen.getByRole('button', { name: 'Second action' });
    lastAction.focus();
    expect(document.activeElement).toBe(lastAction);

    fireEvent.keyDown(document, { key: 'Tab' });

    // Close button is the first focusable element in DOM order within the panel.
    expect(document.activeElement).toBe(closeButton);
  });

  it('wraps forward Tab from the panel container itself to the first focusable element', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(dialog.querySelector('button'));
  });

  it('sets document.body.style.overflow to hidden while open and restores it on close', () => {
    document.body.style.overflow = 'auto';

    const { rerender, unmount } = render(
      <Modal open onClose={() => {}} title="Scroll lock test">
        <button type="button">Action</button>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={() => {}} title="Scroll lock test">
        <button type="button">Action</button>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('auto');

    unmount();
  });

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
});
