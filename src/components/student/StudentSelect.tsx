import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../context/store';
import type { MorphemeMatrix, Morpheme } from '../../types';
import { PREFIX_MATRICES, PREFIX_CATEGORIES, type PrefixCategory } from '../../data/prefixMatrices';

// ─── Category definitions (for Latin / Greek / Character section) ─────────────

type CategoryId = 'prefixes-suffixes' | 'latin' | 'greek' | 'character';

interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
  color2: string;
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
    match: () => false, // handled separately via PREFIX_MATRICES
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

// ─── Prefix & Suffix flow: sub-category picker ───────────────────────────────

const PrefixCategoryPicker: React.FC<{
  onSelect: (cat: PrefixCategory) => void;
  onBack: () => void;
}> = ({ onSelect, onBack }) => (
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
      <div className="text-5xl">🧩</div>
      <h2 className="text-3xl font-black text-gray-700 text-center">Pick a prefix category!</h2>
      <p className="text-gray-400 text-center text-lg max-w-sm">
        Choose a group of prefixes to explore. Each one has a different meaning!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mt-2">
        {PREFIX_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className={`
              bg-gradient-to-br ${cat.color} ${cat.color2}
              text-white rounded-3xl p-6 text-left shadow-lg
              hover:shadow-2xl hover:scale-105 active:scale-100
              transition-all duration-200 flex flex-col gap-2
            `}
          >
            <span className="text-4xl">{cat.emoji}</span>
            <span className="font-extrabold text-xl leading-tight">{cat.label}</span>
            <span className="text-sm font-medium opacity-80 leading-snug">{cat.description}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Prefix & Suffix flow: prefix picker within a category ───────────────────

const PrefixSelector: React.FC<{
  category: PrefixCategory;
  onSelect: (matrixId: string) => void;
  onBack: () => void;
}> = ({ category, onSelect, onBack }) => {
  const matrices = PREFIX_MATRICES.filter((m) => category.matrixIds.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack}
            className="text-gray-400 hover:text-gray-700 font-bold text-sm flex items-center gap-1 shrink-0">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{category.emoji}</span>
            <span className="font-extrabold text-xl text-gray-800">{category.label}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        <h2 className="text-2xl font-black text-gray-700 mb-1 text-center">
          Which prefix do you want to explore?
        </h2>
        <p className="text-gray-400 text-center mb-8 text-base">
          {category.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {matrices.map((matrix) => {
            // Show a few example words from the word key
            const examples = matrix.wordKey.slice(0, 3).map((w) => w.word);
            return (
              <button
                key={matrix.id}
                onClick={() => onSelect(matrix.id)}
                className="bg-white border-2 border-gray-100 rounded-3xl p-5 text-center
                  shadow hover:shadow-xl hover:scale-105 active:scale-100
                  transition-all duration-200 flex flex-col items-center gap-2
                  hover:border-sky-300"
              >
                <span className="text-3xl">{matrix.icon ?? '🔤'}</span>
                {/* Big prefix text */}
                <span className="text-3xl font-black text-sky-700 tracking-wide">
                  {matrix.name}
                </span>
                {/* Meaning */}
                <span className="text-sm font-bold text-gray-600 leading-snug text-center italic">
                  "{matrix.description}"
                </span>
                {/* Example words */}
                {examples.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {examples.map((w) => (
                      <span key={w}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Base picker (used for Latin, Greek, Character) ───────────────────────────

const BasePicker: React.FC<{
  categoryId: CategoryId;
  onSelect: (matrixId: string, baseIndex: number) => void;
  onBack: () => void;
}> = ({ categoryId, onSelect, onBack }) => {
  const { getAllMatrices } = useStore();
  const allMatrices = getAllMatrices();

  const cat = CATEGORIES.find((c) => c.id === categoryId)!;
  const matrices = allMatrices.filter(cat.match);

  type BaseOption = { matrix: MorphemeMatrix; base: Morpheme; baseIndex: number };
  const allBases: BaseOption[] = matrices.flatMap((m) =>
    m.bases.map((base, i) => ({ matrix: m, base, baseIndex: i }))
  );

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 18;
  const totalPages = Math.ceil(allBases.length / PAGE_SIZE);
  const visible = allBases.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack}
            className="text-gray-400 hover:text-gray-700 font-bold text-sm flex items-center gap-1 shrink-0">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{cat.emoji}</span>
            <span className="font-extrabold text-xl text-gray-800">{cat.label}</span>
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
        <h2 className="text-3xl font-black text-gray-700 mb-2 text-center">
          Where do you want to start?
        </h2>
        <p className="text-gray-400 text-center mb-8 text-lg">Pick a root to explore!</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visible.map(({ matrix, base, baseIndex }) => (
            <button
              key={`${matrix.id}-${base.id}`}
              onClick={() => onSelect(matrix.id, baseIndex)}
              className="bg-white border-2 border-gray-100 rounded-3xl p-5 text-center
                shadow hover:shadow-xl hover:scale-105 active:scale-100
                transition-all duration-200 flex flex-col items-center gap-2
                hover:border-emerald-300"
            >
              <span className="text-2xl">{matrix.icon ?? '📚'}</span>
              <span className="text-3xl font-black text-gray-800 uppercase tracking-wide">
                {base.text}
              </span>
              <span className="text-sm text-gray-500 font-semibold italic leading-tight">
                {base.meaning}
              </span>
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
  onSelectPrefixMatrix: (matrixId: string) => void;
  onBack: () => void;
}

export const StudentSelect: React.FC<StudentSelectProps> = ({
  onSelectStudent, onSelectPrefixMatrix, onBack,
}) => {
  const { addStudent, students, getAllMatrices } = useStore();
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [prefixCategory, setPrefixCategory] = useState<PrefixCategory | null>(null);

  const getOrCreateGuestStudent = () => {
    const existing = students.find((s) => s.id === 'guest');
    if (existing) return existing;
    return addStudent('Guest', '4', undefined, '🧒');
  };

  const handleBaseSelect = (matrixId: string, baseIndex: number) => {
    const student = getOrCreateGuestStudent();
    onSelectStudent(student.id, matrixId, baseIndex);
  };

  // ── Prefixes & Suffixes flow ──────────────────────────────────────────────
  if (categoryId === 'prefixes-suffixes') {
    if (prefixCategory) {
      return (
        <PrefixSelector
          category={prefixCategory}
          onSelect={(matrixId) => onSelectPrefixMatrix(matrixId)}
          onBack={() => setPrefixCategory(null)}
        />
      );
    }
    return (
      <PrefixCategoryPicker
        onSelect={(cat) => setPrefixCategory(cat)}
        onBack={() => setCategoryId(null)}
      />
    );
  }

  // ── Latin / Greek / Character flow ───────────────────────────────────────
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
