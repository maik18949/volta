import { describe, it, expect } from 'vitest';
import { parsePostcodeCsv, renderTableModule } from '@/scripts/plzTableBuilder';

const CSV = [
  'Ort;Plz;Bundesland',
  'Dresden;1067;Sachsen',
  'Dresden;1068;Sachsen',
  'Aach;54298;Rheinland-Pfalz',
  'Aach;78267;Baden-Württemberg',
  'Hamburg;21039;Hamburg',
  'Börnsen;21039;Schlewig-Holstein',
  ';;',
  '',
].join('\n');

describe('parsePostcodeCsv', () => {
  it('pads PLZ to 5 digits and fixes the Schleswig-Holstein typo', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.unique.get('01067')).toBe('Sachsen');
    expect(table.unique.get('01068')).toBe('Sachsen');
    expect(table.unique.get('54298')).toBe('Rheinland-Pfalz');
    expect(table.unique.get('78267')).toBe('Baden-Württemberg');
  });

  it('puts PLZ in two Bundesländer into ambiguous, sorted alphabetically, and not into unique', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.ambiguous.get('21039')).toEqual(['Hamburg', 'Schleswig-Holstein']);
    expect(table.unique.has('21039')).toBe(false);
  });

  it('skips empty rows', () => {
    const table = parsePostcodeCsv(CSV);
    expect(table.unique.size + table.ambiguous.size).toBe(5);
  });

  it('throws on an unexpected header', () => {
    expect(() => parsePostcodeCsv('Ort,Plz\nX,1')).toThrow(/header/i);
  });

  it('throws on an unknown Bundesland', () => {
    expect(() => parsePostcodeCsv('Ort;Plz;Bundesland\nX;12345;Atlantis')).toThrow(/Atlantis/);
  });

  it('throws on a malformed PLZ', () => {
    expect(() => parsePostcodeCsv('Ort;Plz;Bundesland\nX;12a45;Sachsen')).toThrow(/PLZ/);
  });
});

describe('renderTableModule', () => {
  it('merges consecutive PLZ of the same state into ranges and lists ambiguous PLZ', () => {
    const source = renderTableModule(parsePostcodeCsv(CSV), 'test-source');
    expect(source).toContain('"Sachsen": [[1067,1068]]');
    expect(source).toContain('"Rheinland-Pfalz": [[54298,54298]]');
    expect(source).toContain('"21039": ["Hamburg","Schleswig-Holstein"]');
    expect(source).toContain('GENERATED');
    expect(source).toContain('test-source');
  });
});
