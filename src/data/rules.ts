import type { SpellingRule } from '../types';

// ─── Rule layer ────────────────────────────────────────────────────────────────
// Matrix-owned "capstone" spelling rules. One rule drives the per-matrix popup
// (see getMatrixRuleId). This is additive to the existing per-combination engine
// (normalizedResult / SpellingTip) — it does not replace it.

export type RuleId =
  | 'simple-add'
  | 'consonant-doubling'
  | 'drop-e'
  | 'bound-root-shift'
  | 'tion-family'
  | 'greek-form';

export interface RuleInfo {
  name: string;
  text: string;
  trigger: string;
  examples: string[];
  note?: string;
  placeholder?: boolean;
}

export const RULES: Record<RuleId, RuleInfo> = {
  'simple-add': {
    name: 'Simple suffix add',
    text: 'Most suffixes just attach — nothing in the root changes. form → forms, formed, forming.',
    trigger: 'A suffix attaches and the root spelling stays the same.',
    examples: ['form+s = forms', 'inform+ed = informed', 'report+ing = reporting'],
  },
  'consonant-doubling': {
    name: 'Consonant doubling (1-1-1)',
    text: 'When a vowel suffix (-ed, -ing, -er) meets a STRESSED syllable ending in one vowel + one consonant, double the consonant so the vowel stays short.',
    trigger: 'A vowel suffix meets a stressed 1-vowel-1-consonant syllable.',
    examples: ['submit+ed = submitted', 'transmit+er = transmitter', 'refer+al = referral'],
    note: 'Stress test: offer+ed = offered (no doubling — stress not on last syllable).',
  },
  'drop-e': {
    name: 'Drop silent e',
    text: 'Drop silent e before a vowel suffix (inscribe → inscribing). With -ion the root shifts further: scribe → scription, /b/ becomes /p/.',
    trigger: 'A vowel suffix meets a root ending in silent e.',
    examples: ['inscribe+ing = inscribing', 'describe+ion = description', 'compose+ed = composed'],
  },
  'bound-root-shift': {
    name: 'Bound-root shift',
    text: "The root itself changes spelling with the suffix — it's not an add-on, the root wears a different coat. ceive → cept, duce → duct, tain → ten.",
    trigger: 'The bound root itself changes spelling when the suffix joins.',
    examples: ['receive → reception', 'reduce → reduction', 'retain → retention'],
  },
  'tion-family': {
    name: '-tion / -sion / -ation family',
    text: 'Drops the final e, adds the syllable, AND moves the stress. The vowel that loses the stress often reduces to a schwa — the hidden reason these are hard to spell.',
    trigger: 'A -tion/-sion/-ation suffix joins, dropping e and shifting stress.',
    examples: ['compose → composition', 'submit → submission', 'inform → information'],
    note: 'Capstone rule — assumes drop-e and bound-root-shift already taught.',
  },
  'greek-form': {
    name: 'Greek combining forms',
    text: 'TODO: pending connecting-vowel design pass. Covers ph=/f/, ch=/k/, y=/i/, and how forms join (the -o- connector).',
    trigger: 'Greek combining forms join, often with an -o- connector.',
    examples: ['photo+graph = photograph', 'bio+logy = biology'],
    placeholder: true,
  },
};

// Maps the REAL matrix ids to the single rule that drives the per-matrix popup.
export const MATRIX_RULE: Record<string, RuleId> = {
  // simple-add
  'mat-007': 'simple-add',
  'mat-008': 'simple-add',
  'mat-009': 'simple-add',
  'mat-010': 'simple-add',
  'mat-013': 'simple-add',
  'mat-015': 'simple-add',
  // drop-e
  'mat-011': 'drop-e',
  'mat-012': 'drop-e',
  // consonant-doubling
  'mat-016': 'consonant-doubling',
  'mat-017': 'consonant-doubling',
  // bound-root-shift
  'mat-014': 'bound-root-shift',
  'mat-018': 'bound-root-shift',
  'mat-019': 'bound-root-shift',
  'mat-031': 'bound-root-shift',
  'mat-032': 'bound-root-shift',
  'mat-033': 'bound-root-shift',
  'mat-034': 'bound-root-shift',
  // tion-family
  'mat-020': 'tion-family',
  // greek-form
  'mat-026': 'greek-form',
  'mat-027': 'greek-form',
  'mat-028': 'greek-form',
  'mat-029': 'greek-form',
  'mat-030': 'greek-form',
  // theme matrices
  'mat-001': 'simple-add',
  'mat-003': 'simple-add',
  'mat-005': 'simple-add',
  'mat-006': 'simple-add',
};

export function getMatrixRuleId(matrixId: string): RuleId {
  return MATRIX_RULE[matrixId] ?? 'simple-add';
}

// ─── Diff helper ────────────────────────────────────────────────────────────────
// Returns segments of `actual`, marking which characters differ from `naive`.
// Finds the longest common prefix + common suffix; the middle of `actual` is the
// "changed" region. Empty segments are dropped.

export function diffWord(
  naive: string,
  actual: string,
): { text: string; changed: boolean }[] {
  // Longest common prefix
  let prefixLen = 0;
  const maxPrefix = Math.min(naive.length, actual.length);
  while (prefixLen < maxPrefix && naive[prefixLen] === actual[prefixLen]) {
    prefixLen++;
  }

  // Longest common suffix (not overlapping the prefix region)
  let suffixLen = 0;
  const maxSuffix = Math.min(naive.length, actual.length) - prefixLen;
  while (
    suffixLen < maxSuffix &&
    naive[naive.length - 1 - suffixLen] === actual[actual.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const prefix = actual.slice(0, prefixLen);
  const middle = actual.slice(prefixLen, actual.length - suffixLen);
  const suffix = actual.slice(actual.length - suffixLen);

  const segments: { text: string; changed: boolean }[] = [];
  if (prefix) segments.push({ text: prefix, changed: false });
  if (middle) segments.push({ text: middle, changed: true });
  if (suffix) segments.push({ text: suffix, changed: false });
  return segments;
}

// ─── Engine rule → display rule mapping ──────────────────────────────────────────
// Maps the existing per-combination engine's SpellingRule to a RuleId for display.
// y-to-i rules stay with the existing SpellingTip (return null here).

export function engineRuleToRuleId(r: SpellingRule): RuleId | null {
  switch (r) {
    case 'drop-e':
      return 'drop-e';
    case 'double-consonant':
      return 'consonant-doubling';
    case 'merge-t-tion':
      return 'tion-family';
    case 'y-to-i-cons':
    case 'y-to-i-es':
      return null;
    default:
      return null;
  }
}
