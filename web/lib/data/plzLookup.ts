import { AMBIGUOUS_PLZ, PLZ_RANGES } from './plzToState';

export type PlzLookup =
  | { kind: 'unique'; state: string }
  | { kind: 'ambiguous'; states: readonly string[] }
  | { kind: 'unknown' };

let index: Map<number, string> | null = null;

function getIndex(): Map<number, string> {
  if (index) return index;
  const built = new Map<number, string>();
  for (const [state, ranges] of Object.entries(PLZ_RANGES)) {
    for (const [from, to] of ranges) {
      for (let plz = from; plz <= to; plz++) built.set(plz, state);
    }
  }
  index = built;
  return built;
}

/** Ordnet eine 5-stellige PLZ einem Bundesland zu (offline, aus der generierten Tabelle). */
export function lookupState(plz: string): PlzLookup {
  const trimmed = plz.trim();
  if (!/^\d{5}$/.test(trimmed)) return { kind: 'unknown' };
  const ambiguousStates = AMBIGUOUS_PLZ[trimmed];
  if (ambiguousStates) return { kind: 'ambiguous', states: ambiguousStates };
  const state = getIndex().get(Number(trimmed));
  return state ? { kind: 'unique', state } : { kind: 'unknown' };
}
