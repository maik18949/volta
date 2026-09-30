import { describe, it, expect } from 'vitest';
import { stateUpdateForPostalCode, postalCodeHint } from '@/lib/wizard/postalCodeState';

describe('stateUpdateForPostalCode', () => {
  it('sets the state for a unique PLZ', () => {
    expect(stateUpdateForPostalCode('01099')).toEqual({ action: 'set', state: 'Sachsen' });
  });

  it('clears the state for an ambiguous PLZ', () => {
    expect(stateUpdateForPostalCode('65326')).toEqual({ action: 'clear' });
  });

  it('keeps the state for an unknown or incomplete PLZ', () => {
    expect(stateUpdateForPostalCode('00000')).toEqual({ action: 'keep' });
    expect(stateUpdateForPostalCode('0109')).toEqual({ action: 'keep' });
    expect(stateUpdateForPostalCode('')).toEqual({ action: 'keep' });
  });
});

describe('postalCodeHint', () => {
  it('shows nothing while the PLZ is incomplete', () => {
    expect(postalCodeHint('', '')).toBeNull();
    expect(postalCodeHint('0109', 'Sachsen')).toBeNull();
  });

  it('asks for a valid PLZ when a complete PLZ is unknown', () => {
    expect(postalCodeHint('00000', '')).toEqual({ text: 'Gültige Postleitzahl eingeben', tone: 'warn' });
  });

  it('names both candidates for an ambiguous PLZ while no state is chosen', () => {
    expect(postalCodeHint('65326', '')).toEqual({
      text: 'PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen',
      tone: 'warn',
    });
  });

  it('is silent for an ambiguous PLZ once a state is chosen', () => {
    expect(postalCodeHint('65326', 'Hessen')).toBeNull();
  });

  it('confirms detection only while the state still matches the PLZ', () => {
    expect(postalCodeHint('01099', 'Sachsen')).toEqual({ text: 'Aus PLZ erkannt', tone: 'info' });
    expect(postalCodeHint('01099', 'Bayern')).toBeNull();
  });
});
