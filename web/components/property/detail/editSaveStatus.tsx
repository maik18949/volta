'use client';

import { createContext, useContext } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Lets the Immobiliendaten form (deep inside the tab page) report its autosave state to
 * the detail header (rendered by the layout shell), where the design shows "Gespeichert".
 */
export const EditSaveStatusContext = createContext<((state: SaveState) => void) | null>(null);

export function useReportSaveStatus(): (state: SaveState) => void {
  return useContext(EditSaveStatusContext) ?? noop;
}

function noop() {}
