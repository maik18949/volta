'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Kleines „i" mit Popover für kurze Hinweise neben einem Feldlabel. Erscheint bei Hover und Fokus,
 * bleibt per Klick/Tippen stehen und schließt mit Escape oder Klick daneben. Bewusst ein <span
 * role="button"> und kein <button>: Das Icon liegt innerhalb des <label>, und ein echter Button wäre
 * dort das erste beschriftbare Element und würde dem Eingabefeld das Label wegnehmen.
 */
export function InfoTip({ children, label = 'Info' }: { children: ReactNode; label?: string }) {
  const [pinned, setPinned] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const open = pinned || peeking;

  useEffect(() => {
    if (!pinned) return undefined;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setPinned(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPinned(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pinned]);

  return (
    <span
      ref={rootRef}
      className="relative ml-1.5 inline-flex align-middle"
      onMouseEnter={() => setPeeking(true)}
      onMouseLeave={() => setPeeking(false)}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={(event) => {
          event.preventDefault();
          setPinned((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setPinned((value) => !value);
          }
        }}
        onFocus={() => setPeeking(true)}
        onBlur={() => setPeeking(false)}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-text-dim text-[11px] font-bold leading-none text-text-dim outline-none hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
      >
        i
      </span>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-60 rounded-[9px] border border-black/[0.12] bg-white px-3 py-2 text-[12px] font-normal leading-snug text-text-secondary shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
