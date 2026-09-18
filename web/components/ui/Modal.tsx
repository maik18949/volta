'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || active === panel || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  // Rendered via a portal into document.body — not just a style choice.
  // Any ancestor with backdrop-filter/filter/transform/will-change (e.g. the
  // .glass-card class GlassCard uses) creates a new containing block for
  // position:fixed descendants per spec, which traps this modal's overlay
  // inside that ancestor's box instead of covering the viewport. Portaling
  // to body sidesteps that entirely, so this works correctly regardless of
  // which component tree renders <Modal>.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5 ${overlay ? 'bg-black/40' : ''}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white px-6 py-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] outline-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-[18px] font-extrabold tracking-[-0.3px] text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-[#f5f7fa] text-text-secondary hover:text-text-primary"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
