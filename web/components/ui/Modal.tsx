'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-text-dim hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
