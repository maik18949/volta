import { lookupState } from '@/lib/data/plzLookup';

export type PostalCodeStateUpdate = { action: 'set'; state: string } | { action: 'clear' } | { action: 'keep' };

export interface PostalCodeHint {
  text: string;
  tone: 'info' | 'warn';
}

function isCompletePostalCode(postalCode: string): boolean {
  return /^\d{5}$/.test(postalCode.trim());
}

/** Was das Bundesland-Dropdown tun soll, wenn sich die PLZ zu `postalCode` geändert hat. */
export function stateUpdateForPostalCode(postalCode: string): PostalCodeStateUpdate {
  if (!isCompletePostalCode(postalCode)) return { action: 'keep' };
  const result = lookupState(postalCode);
  if (result.kind === 'unique') return { action: 'set', state: result.state };
  if (result.kind === 'ambiguous') return { action: 'clear' };
  return { action: 'keep' };
}

/** Hinweis unter dem Bundesland-Dropdown; null, wenn nichts anzuzeigen ist. */
export function postalCodeHint(postalCode: string, state: string): PostalCodeHint | null {
  if (!isCompletePostalCode(postalCode)) return null;
  const result = lookupState(postalCode);
  if (result.kind === 'unknown') return { text: 'Gültige Postleitzahl eingeben', tone: 'warn' };
  if (result.kind === 'ambiguous') {
    if (state) return null;
    return { text: `PLZ liegt in ${result.states.join(' und ')} – bitte wählen`, tone: 'warn' };
  }
  return state === result.state ? { text: 'Aus PLZ erkannt', tone: 'info' } : null;
}
