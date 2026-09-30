import { lookupState } from '@/lib/data/plzLookup';

export type PostalCodeStateUpdate = { action: 'set'; state: string } | { action: 'clear' } | { action: 'keep' };

export type PostalCodeHintTone = 'info' | 'warn';

export interface PostalCodeHint {
  text: string;
  tone: PostalCodeHintTone;
}

function isCompletePostalCode(postalCode: string): boolean {
  return /^\d{5}$/.test(postalCode.trim());
}

/** Was das Bundesland-Dropdown tun soll, wenn sich die PLZ zu `postalCode` geändert hat. */
export function stateUpdateForPostalCode(postalCode: string): PostalCodeStateUpdate {
  const result = lookupState(postalCode);
  switch (result.kind) {
    case 'unique':
      return { action: 'set', state: result.state };
    case 'ambiguous':
      return { action: 'clear' };
    case 'unknown':
      return { action: 'keep' };
  }
}

/** Hinweis unter dem Bundesland-Dropdown; null, wenn nichts anzuzeigen ist. */
export function postalCodeHint(postalCode: string, state: string): PostalCodeHint | null {
  if (!isCompletePostalCode(postalCode)) return null;
  const result = lookupState(postalCode);
  switch (result.kind) {
    case 'unknown':
      return { text: 'Gültige Postleitzahl eingeben', tone: 'warn' };
    case 'ambiguous':
      if (state) return null;
      return { text: `PLZ liegt in ${result.states.join(' und ')} – bitte wählen`, tone: 'warn' };
    case 'unique':
      return state === result.state ? { text: 'Aus PLZ erkannt', tone: 'info' } : null;
  }
}
