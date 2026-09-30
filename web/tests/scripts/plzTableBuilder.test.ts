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

const HEADER = 'Ort;Plz;Bundesland';
const csvOf = (...rows: string[]) => [HEADER, ...rows].join('\n');

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
    expect([...table.unique.keys(), ...table.ambiguous.keys()].sort()).toEqual([
      '01067',
      '01068',
      '21039',
      '54298',
      '78267',
    ]);
  });

  it('strips a leading BOM from the header', () => {
    const table = parsePostcodeCsv('\uFEFF' + CSV);
    expect(table.unique.get('01067')).toBe('Sachsen');
  });

  it('parses CRLF input identically', () => {
    const lf = parsePostcodeCsv(CSV);
    const crlf = parsePostcodeCsv(CSV.replace(/\n/g, '\r\n'));
    expect(crlf).toEqual(lf);
  });

  it('keeps a PLZ unique when the same PLZ and state appear on two rows', () => {
    const table = parsePostcodeCsv(csvOf('A;1067;Sachsen', 'B;1067;Sachsen'));
    expect(table.unique.get('01067')).toBe('Sachsen');
    expect(table.ambiguous.size).toBe(0);
  });

  it('lists all three states of a PLZ, sorted', () => {
    const table = parsePostcodeCsv(csvOf('A;12345;Sachsen', 'B;12345;Berlin', 'C;12345;Brandenburg'));
    expect(table.ambiguous.get('12345')).toEqual(['Berlin', 'Brandenburg', 'Sachsen']);
  });

  it('throws on an unexpected header', () => {
    expect(() => parsePostcodeCsv('Ort,Plz\nX,1')).toThrow(/header/i);
  });

  it('throws on a header-only CSV', () => {
    expect(() => parsePostcodeCsv(HEADER + '\n')).toThrow(/no data rows/i);
  });

  it('throws on an unknown Bundesland', () => {
    expect(() => parsePostcodeCsv(csvOf('X;12345;Atlantis'))).toThrow(/Atlantis/);
  });

  it('throws on a malformed PLZ', () => {
    expect(() => parsePostcodeCsv(csvOf('X;12a45;Sachsen'))).toThrow(/PLZ/);
  });

  it('throws on a row with the wrong column count', () => {
    expect(() => parsePostcodeCsv(csvOf('X;12345'))).toThrow(/Malformed row.*X;12345/);
    expect(() => parsePostcodeCsv(csvOf('X;12345;Sachsen;extra'))).toThrow(/Malformed row/);
  });
});

describe('renderTableModule', () => {
  it('renders ranges of consecutive PLZ and lists ambiguous PLZ', () => {
    const source = renderTableModule(parsePostcodeCsv(CSV), 'test-source');
    expect(source).toContain('  "Sachsen": [\n    [1067,1068]\n  ],');
    expect(source).toContain('  "Rheinland-Pfalz": [\n    [54298,54298]\n  ],');
    expect(source).toContain('"21039": ["Hamburg","Schleswig-Holstein"]');
    expect(source).toContain('GENERATED');
    expect(source).toContain('test-source');
  });

  it('splits ranges on a gap', () => {
    const source = renderTableModule(
      parsePostcodeCsv(csvOf('A;1067;Sachsen', 'A;1068;Sachsen', 'A;1070;Sachsen')),
      'x',
    );
    expect(source).toContain('  "Sachsen": [\n    [1067,1068],[1070,1070]\n  ],');
  });

  it('sorts ranges numerically regardless of input order', () => {
    const source = renderTableModule(
      parsePostcodeCsv(csvOf('A;99999;Sachsen', 'A;1000;Sachsen', 'A;1001;Sachsen')),
      'x',
    );
    expect(source).toContain('  "Sachsen": [\n    [1000,1001],[99999,99999]\n  ],');
  });

  it('wraps at 8 ranges per line', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `A;${1000 + i * 2};Sachsen`);
    const source = renderTableModule(parsePostcodeCsv(csvOf(...rows)), 'x');
    const first = Array.from({ length: 8 }, (_, i) => `[${1000 + i * 2},${1000 + i * 2}]`).join(',');
    expect(source).toContain(
      `  "Sachsen": [\n    ${first},\n    [1016,1016],[1018,1018]\n  ],`,
    );
  });

  it('emits state blocks and ambiguous keys in sorted order', () => {
    const source = renderTableModule(
      parsePostcodeCsv(
        csvOf(
          'A;1000;Sachsen',
          'A;2000;Berlin',
          'A;3000;Hessen',
          'A;90000;Berlin',
          'A;90000;Sachsen',
          'A;80000;Berlin',
          'A;80000;Sachsen',
        ),
      ),
      'x',
    );
    const at = (s: string) => source.indexOf(s);
    expect(at('"Berlin": [')).toBeLessThan(at('"Hessen": ['));
    expect(at('"Hessen": [')).toBeLessThan(at('"Sachsen": ['));
    expect(at('"80000":')).toBeGreaterThan(-1);
    expect(at('"80000":')).toBeLessThan(at('"90000":'));
  });
});
