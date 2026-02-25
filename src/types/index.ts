// ─── Morpheme / Matrix types ─────────────────────────────────────────────────

export interface Morpheme {
  id: string;
  text: string;           // e.g. "un", "play", "ful"
  type: 'prefix' | 'base' | 'suffix';
  meaning: string;        // short gloss, e.g. "not"
  origin?: string;        // e.g. "Latin", "Greek", "Old English"
  examples?: string[];    // example words using this morpheme
}

export interface MorphemeMatrix {
  id: string;
  name: string;
  description?: string;
  gradeLevel: string[];   // e.g. ["3", "4", "5"]
  prefixes: Morpheme[];
  bases: Morpheme[];
  suffixes: Morpheme[];
  wordKey: WordKeyEntry[];  // known real words in this matrix
  color: string;            // tailwind color key for UI theming
  icon?: string;            // emoji icon
  createdBy?: string;       // 'system' | teacherId
  createdAt?: string;
  tags?: string[];
}

export interface WordKeyEntry {
  word: string;             // full word e.g. "replay"
  definition: string;
  partOfSpeech?: string;
  example?: string;         // example sentence
}

// ─── Built word (what student constructs) ────────────────────────────────────

export interface BuiltWord {
  prefix?: Morpheme;
  base?: Morpheme;
  suffix?: Morpheme;
}

export function wordSurface(w: BuiltWord): string {
  return [w.prefix?.text, w.base?.text, w.suffix?.text]
    .filter(Boolean)
    .join('');
}

// ─── Spelling normalization ───────────────────────────────────────────────────
// Applies common English spelling rules when morphemes are combined.
//
// Rules:
//  1. Drop silent-e before a vowel suffix  (hope + ing → hoping)
//  2. Double final consonant before vowel suffix when base ends CVC (run + ing → running)
//  3. y → i before a consonant suffix      (happy + ness → happiness)
//  4. y → i before -es suffix              (story + es → stories)
//  5. Collapse accidental triple-consonant runs to two (miss + s → miss)

const _VOWELS = new Set(['a','e','i','o','u']);
// All suffixes that start with a vowel sound
const _VOWEL_SUFFIXES = new Set([
  'ing','ed','er','able','ible','ation','ion','ance','ence',
  'ous','al','ar','es','en','ent','ence','ish','ive','ize',
]);
// All suffixes that start with a consonant sound
const _CONSONANT_SUFFIXES = new Set([
  'ness','ful','less','ly','ment','ward','ty','tion','sion',
  'th','ship','dom','hood','s',
]);

export type SpellingRule =
  | 'drop-e'          // Rule 1: drop silent-e (write+ing → writing)
  | 'double-consonant'// Rule 2: double final consonant (run+ing → running)
  | 'y-to-i-cons'     // Rule 3: y→i before consonant suffix (happy+ness → happiness)
  | 'y-to-i-es'       // Rule 4: y→i before -es (story+es → stories)
  | 'merge-t-tion'    // Rule 6: base ends in t + suffix tion → drop junction t (rupt+tion → ruption)
  | null;             // No rule applied

export interface NormalizedResult {
  surface: string;
  rule: SpellingRule;
}

function _isVowel(ch: string) { return _VOWELS.has(ch.toLowerCase()); }
function _isCons(ch: string)  { return /[a-z]/i.test(ch) && !_VOWELS.has(ch.toLowerCase()); }

/** Returns both the normalized word surface AND which spelling rule fired. */
export function normalizedResult(w: BuiltWord): NormalizedResult {
  const pre  = w.prefix?.text ?? '';
  const base = w.base?.text   ?? '';
  const suf  = w.suffix?.text ?? '';
  if (!base) return { surface: wordSurface(w), rule: null };

  const sufIsVowel = suf.length > 0 && _isVowel(suf[0]);
  let stem = base;
  let rule: SpellingRule = null;

  // Rule 1: drop silent-e before vowel suffix  (write→writ, hope→hop)
  if (
    suf.length > 0 &&
    sufIsVowel && _VOWEL_SUFFIXES.has(suf) &&
    base.length > 2 &&
    base.slice(-1).toLowerCase() === 'e' &&
    _isCons(base.slice(-2, -1))
  ) {
    stem = base.slice(0, -1);
    rule = 'drop-e';
  }
  // Rule 2: double final consonant in CVC base before vowel suffix  (run→runn, sit→sitt)
  else if (
    suf.length > 0 &&
    sufIsVowel && _VOWEL_SUFFIXES.has(suf) &&
    base.length >= 3 &&
    _isCons(base.slice(-1)) &&
    _isVowel(base.slice(-2, -1)) &&
    _isCons(base.slice(-3, -2)) &&
    !['x', 'y', 'w'].includes(base.slice(-1).toLowerCase())
  ) {
    stem = base + base.slice(-1);
    rule = 'double-consonant';
  }
  // Rule 4: y → i before -es  (story+es → stories, baby+es → babies)
  else if (
    suf === 'es' &&
    base.length > 2 &&
    base.slice(-1).toLowerCase() === 'y' &&
    _isCons(base.slice(-2, -1))
  ) {
    stem = base.slice(0, -1) + 'i';
    rule = 'y-to-i-es';
  }
  // Rule 3: y → i before consonant suffix  (happy→happi before ness/ly/ful)
  else if (
    suf.length > 0 &&
    !sufIsVowel && _CONSONANT_SUFFIXES.has(suf) &&
    base.length > 2 &&
    base.slice(-1).toLowerCase() === 'y' &&
    _isCons(base.slice(-2, -1))
  ) {
    stem = base.slice(0, -1) + 'i';
    rule = 'y-to-i-cons';
  }
  // Rule 6: base ending in 't' + suffix 'tion' → drop junction 't' to avoid *rupttion
  //         (rupt+tion → rup·tion = ruption, struct+tion → struction, dict+tion → diction)
  else if (
    suf === 'tion' &&
    base.length > 2 &&
    base.slice(-1).toLowerCase() === 't'
  ) {
    stem = base.slice(0, -1);
    rule = 'merge-t-tion';
  }

  // Rule 5: collapse triple+ identical consonant runs to two
  const joined = (pre + stem + suf).replace(/([bcdfghjklmnpqrstvwxyz])\1{2,}/gi, '$1$1');
  return { surface: joined, rule };
}

/** Backwards-compatible: just return the surface string. */
export function normalizedSurface(w: BuiltWord): string {
  return normalizedResult(w).surface;
}

/** Check whether a built word matches a word-key entry,
 *  comparing both raw and spelling-normalized forms. */
export function matchesWordKey(built: BuiltWord, word: string): boolean {
  const w = word.toLowerCase();
  return (
    wordSurface(built).toLowerCase()       === w ||
    normalizedSurface(built).toLowerCase() === w
  );
}

// ─── Student / Progress types ─────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  grade: string;
  classId?: string;
  createdAt: string;
  avatar?: string;  // emoji
}

export interface ProgressEntry {
  id: string;
  studentId: string;
  matrixId: string;
  word: string;
  isRealWord: boolean;       // student's guess
  actuallyReal: boolean;     // ground truth from word key
  correct: boolean;
  studentJustification?: string;
  studentSentence?: string;
  timestamp: string;
  timeSpentMs?: number;
}

export interface StudentStats {
  studentId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;           // 0–1
  wordsExplored: string[];
  matricesUsed: string[];
  streakDays: number;
  lastActive: string;
}

// ─── Class / Teacher types ────────────────────────────────────────────────────

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  gradeLevel: string;
  studentIds: string[];
  assignedMatrixIds: string[];
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  classIds: string[];
  createdAt: string;
}

// ─── App modes ────────────────────────────────────────────────────────────────

export type AppView =
  | 'landing'
  | 'student-select'
  | 'student-play'
  | 'teacher-dashboard'
  | 'teacher-matrix-editor'
  | 'teacher-progress'
  | 'teacher-classes';

export type ThemeColor =
  | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | 'red' | 'yellow';
