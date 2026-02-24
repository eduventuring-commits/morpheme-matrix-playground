import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../context/store';
import type { MorphemeMatrix, Morpheme } from '../../types';

// ─── Category definitions ─────────────────────────────────────────────────────

type CategoryId = 'prefixes-suffixes' | 'latin' | 'greek' | 'character';

interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;       // gradient from
  color2: string;      // gradient to
  textColor: string;
  ringColor: string;
  match: (m: MorphemeMatrix) => boolean;
}

const CATEGORIES: Category[] = [
  {
    id: 'prefixes-suffixes',
    label: 'Prefixes and Suffixes',
    emoji: '🔤',
    color: 'from-emerald-400',
    color2: 'to-teal-500',
    textColor: 'text-emerald-700',
    ringColor: 'ring-emerald-400',
    match: (m) =>
      (m.tags ?? []).some((t) => t.toLowerCase() === 'prefix' || t.toLowerCase() === 'suffix') ||
      ['mat-001', 'mat-003'].includes(m.id),
  },
  {
    id: 'latin',
    label: 'Latin Roots',
    emoji: '🏛️',
    color: 'from-blue-400',
    color2: 'to-indigo-500',
    textColor: 'text-blue-700',
    ringColor: 'ring-blue-400',
    match: (m) =>
      (m.tags ?? []).some((t) => t.toLowerCase().includes('latin')) ||
      ['mat-007','mat-008','mat-009','mat-010',
       'mat-011','mat-012','mat-013','mat-014','mat-015',
       'mat-016','mat-017','mat-018','mat-019','mat-020',
       'mat-031','mat-032','mat-033','mat-034'].includes(m.id),
  },
  {
    id: 'greek',
    label: 'Greek Roots',
    emoji: '⚗️',
    color: 'from-purple-400',
    color2: 'to-violet-500',
    textColor: 'text-purple-700',
    ringColor: 'ring-purple-400',
    // Only show the richest matrix for each root — mat-026..030 supersede mat-002/021-025.
    // mat-005 (number prefixes) is kept because its bases (cycle, gon, pod…) are unique.
    match: (m) =>
      ['mat-005','mat-026','mat-027','mat-028','mat-029','mat-030'].includes(m.id),
  },
  {
    id: 'character',
    label: 'Character and Feelings',
    emoji: '💛',
    color: 'from-amber-400',
    color2: 'to-orange-400',
    textColor: 'text-amber-700',
    ringColor: 'ring-amber-400',
    match: (m) =>
      (m.tags ?? []).some((t) =>
        t.toLowerCase().includes('emotion') ||
        t.toLowerCase().includes('character') ||
        t.toLowerCase().includes('feeling') ||
        t.toLowerCase().includes('trait')
      ) || ['mat-006'].includes(m.id),
  },
];

// ─── Screen 1: Category picker ────────────────────────────────────────────────

const CategoryPicker: React.FC<{
  onSelect: (cat: CategoryId) => void;
}> = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-100
    flex flex-col items-center justify-center px-6 py-12">

    <div className="text-6xl mb-4">👋</div>
    <h1 className="text-4xl sm:text-5xl font-black text-gray-800 mb-2 text-center leading-tight">
      Hello!
    </h1>
    <p className="text-xl sm:text-2xl font-bold text-gray-500 mb-10 text-center">
      What do you want to work on today?
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`
            bg-gradient-to-br ${cat.color} ${cat.color2}
            text-white rounded-3xl p-7 text-center shadow-lg
            hover:shadow-2xl hover:scale-105 active:scale-100
            transition-all duration-200 flex flex-col items-center gap-3
          `}
        >
          <span className="text-6xl">{cat.emoji}</span>
          <span className="font-extrabold text-2xl leading-tight">{cat.label}</span>
        </button>
      ))}
    </div>
  </div>
);

// ─── Prefix/Suffix-first picker for Prefixes and Suffixes category ────────────
//
// Layout:
//  1. User picks whether they want to focus on a PREFIX or SUFFIX
//  2. A big scrollable list of all prefixes (or suffixes) from the matching matrices
//  3. Clicking one launches StudentPlayground with that matrix + pre-selected morpheme

interface PrefixSuffixEntry {
  morpheme: Morpheme;
  matrix: MorphemeMatrix;
  baseIndex: number; // always 0 — playground lets user cycle
}

const PrefixSuffixPicker: React.FC<{
  matrices: MorphemeMatrix[];
  onSelect: (matrixId: string, baseIndex: number) => void;
  onBack: () => void;
}> = ({ matrices, onSelect, onBack }) => {
  const [focusType, setFocusType] = useState<'prefix' | 'suffix' | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  // Gather all prefixes or suffixes across all matching matrices (deduplicated by text)
  const entries: PrefixSuffixEntry[] = React.useMemo(() => {
    const seen = new Set<string>();
    const result: PrefixSuffixEntry[] = [];
    for (const m of matrices) {
      const morphemes = focusType === 'prefix' ? m.prefixes : m.suffixes;
      for (const morph of morphemes) {
        const key = `${morph.text.toLowerCase()}::${m.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ morpheme: morph, matrix: m, baseIndex: 0 });
        }
      }
    }
    return result;
  }, [matrices, focusType]);

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const visible = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!focusType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={onBack}
              className="text-gray-400 hover:text-gray-700 font-bold text-sm flex items-center gap-1 shrink-0">
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔤</span>
              <span className="font-extrabold text-xl text-gray-800">Prefixes and Suffixes</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-10 flex flex-col items-center gap-6">
          <div className="text-5xl">🤔</div>
          <h2 className="text-3xl font-black text-gray-700 text-center">
            What do you want to focus on?
          </h2>
          <p className="text-gray-400 text-center text-lg">
            Pick a prefix or suffix to explore — then build words with it!
          </p>

          <div className="grid grid-cols-2 gap-6 w-full max-w-sm mt-2">
            <button
              onClick={() => { setFocusType('prefix'); setPage(0); }}
              className="bg-gradient-to-br from-sky-400 to-sky-600 text-white
                rounded-3xl p-8 text-center shadow-lg hover:shadow-2xl hover:scale-105
                active:scale-100 transition-all duration-200 flex flex-col items-center gap-3"
            >
              <span className="text-5xl">⬅️</span>
              <span className="font-extrabold text-xl">Prefixes</span>
              <span className="text-sm font-semibold text-sky-100">added to the front</span>
            </button>

            <button
              onClick={() => { setFocusType('suffix'); setPage(0); }}
              className="bg-gradient-to-br from-amber-400 to-amber-600 text-white
                rounded-3xl p-8 text-center shadow-lg hover:shadow-2xl hover:scale-105
                active:scale-100 transition-all duration-200 flex flex-col items-center gap-3"
            >
              <span className="text-5xl">➡️</span>
              <span className="font-extrabold text-xl">Suffixes</span>
              <span className="text-sm font-semibold text-amber-100">added to the end</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPrefix = focusType === 'prefix';
  const accent = isPrefix
    ? { from: 'from-sky-400', to: 'to-sky-600', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', chip: 'bg-sky-100 text-sky-800', dot: 'bg-sky-400' }
    : { from: 'from-amber-400', to: 'to-amber-600', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => setFocusType(null)}
            className="text-gray-400 hover:text-gray-700 font-bold text-sm flex items-center gap-1 shrink-0">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{isPrefix ? '⬅️' : '➡️'}</span>
            <span className={`font-extrabold text-xl ${accent.text}`}>
              Choose a {isPrefix ? 'Prefix' : 'Suffix'}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-gray-400
                  hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 font-bold w-10 text-center">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-gray-400
                  hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        <h2 className="text-2xl font-black text-gray-700 mb-1 text-center">
          Pick a {isPrefix ? 'prefix' : 'suffix'} to explore!
        </h2>
        <p className="text-gray-400 text-center mb-7 text-base">
          {isPrefix
            ? 'Choose a prefix — then build words by adding a base and suffixes.'
            : 'Choose a suffix — then build words by adding a base and prefixes.'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map(({ morpheme, matrix }) => {
            // Show words you can build as examples
            const exampleWords = matrix.wordKey
              .filter((w) =>
                isPrefix
                  ? w.word.toLowerCase().startsWith(morpheme.text.toLowerCase())
                  : w.word.toLowerCase().endsWith(morpheme.text.toLowerCase())
              )
              .slice(0, 3)
              .map((w) => w.word);

            return (
              <button
                key={`${morpheme.id}::${matrix.id}`}
                onClick={() => onSelect(matrix.id, 0)}
                className={`
                  bg-white border-2 ${accent.border} rounded-3xl p-4 text-center
                  shadow hover:shadow-xl hover:scale-105 active:scale-100
                  transition-all duration-200 flex flex-col items-center gap-2
                  hover:${accent.bg}
                `}
              >
                {/* The morpheme — big and bold */}
                <div className={`text-3xl font-black ${accent.text} tracking-wide`}>
                  {isPrefix ? `${morpheme.text}-` : `-${morpheme.text}`}
                </div>
                {/* Meaning */}
                <div className="text-sm font-bold text-gray-600 leading-snug text-center">
                  {morpheme.meaning}
                </div>
                {/* Example words */}
                {exampleWords.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {exampleWords.map((w) => (
                      <span key={w} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.chip}`}>
                        {w}
                      </span>
                    ))}
                  </div>
                )}
                {/* Matrix label */}
                <div className="text-xs text-gray-300 font-medium">{matrix.name}</div>
              </button>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg font-semibold">No {focusType}es found yet!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen 2: Base picker (used for Latin, Greek, Character) ─────────────────

// Each matrix gets shown as a group with its bases as big cards
const BasePicker: React.FC<{
  categoryId: CategoryId;
  onSelect: (matrixId: string, baseIndex: number) => void;
  onBack: () => void;
}> = ({ categoryId, onSelect, onBack }) => {
  const { getAllMatrices } = useStore();
  const allMatrices = getAllMatrices();

  const cat = CATEGORIES.find((c) => c.id === categoryId)!;
  const matrices = allMatrices.filter(cat.match);

  // Flatten all bases with their matrix reference
  type BaseOption = { matrix: MorphemeMatrix; base: Morpheme; baseIndex: number };
  const allBases: BaseOption[] = matrices.flatMap((m) =>
    m.bases.map((base, i) => ({ matrix: m, base, baseIndex: i }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 font-bold text-sm flex items-center gap-1 shrink-0"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{cat.emoji}</span>
            <span className="font-extrabold text-xl text-gray-800">{cat.label}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        <h2 className="text-3xl font-black text-gray-700 mb-2 text-center">
          Where do you want to start?
        </h2>
        <p className="text-gray-400 text-center mb-8 text-lg">
          Pick a root to explore!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {allBases.map(({ matrix, base, baseIndex }) => (
            <button
              key={`${matrix.id}-${base.id}`}
              onClick={() => onSelect(matrix.id, baseIndex)}
              className={`
                bg-white border-2 border-gray-100 rounded-3xl p-5 text-center
                shadow hover:shadow-xl hover:scale-105 active:scale-100
                transition-all duration-200 flex flex-col items-center gap-2
                hover:border-emerald-300
              `}
            >
              {/* Matrix icon */}
              <span className="text-2xl">{matrix.icon ?? '📚'}</span>
              {/* The base word — big and bold */}
              <span className="text-3xl font-black text-gray-800 uppercase tracking-wide">
                {base.text}
              </span>
              {/* Meaning */}
              <span className="text-sm text-gray-500 font-semibold italic leading-tight">
                {base.meaning}
              </span>
              {/* Matrix name — tiny label */}
              <span className="text-xs text-gray-300 font-medium">{matrix.name}</span>
            </button>
          ))}
        </div>

        {allBases.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg font-semibold">No bases found in this category yet!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main StudentSelect ───────────────────────────────────────────────────────

interface StudentSelectProps {
  onSelectStudent: (studentId: string, matrixId: string, startBaseIndex?: number) => void;
  onBack: () => void;
}

export const StudentSelect: React.FC<StudentSelectProps> = ({ onSelectStudent, onBack }) => {
  const { addStudent, students, getAllMatrices } = useStore();
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);

  // We use a single "guest" student so progress can still be tracked
  // without requiring kids to type their name first
  const getOrCreateGuestStudent = () => {
    const existing = students.find((s) => s.id === 'guest');
    if (existing) return existing;
    return addStudent('Guest', '4', undefined, '🧒');
  };

  const handleBaseSelect = (matrixId: string, baseIndex: number) => {
    const student = getOrCreateGuestStudent();
    onSelectStudent(student.id, matrixId, baseIndex);
  };

  if (categoryId === 'prefixes-suffixes') {
    const allMatrices = getAllMatrices();
    const cat = CATEGORIES.find((c) => c.id === 'prefixes-suffixes')!;
    const matrices = allMatrices.filter(cat.match);

    return (
      <PrefixSuffixPicker
        matrices={matrices}
        onSelect={handleBaseSelect}
        onBack={() => setCategoryId(null)}
      />
    );
  }

  if (categoryId) {
    return (
      <BasePicker
        categoryId={categoryId}
        onSelect={handleBaseSelect}
        onBack={() => setCategoryId(null)}
      />
    );
  }

  return <CategoryPicker onSelect={setCategoryId} />;
};
