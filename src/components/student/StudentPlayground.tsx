import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Volume2, RefreshCw, ChevronLeft, ChevronRight,
  XCircle, Loader2, GripVertical, BookOpen,
  PenLine, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Button } from '../shared/UI';
import { useSpeech } from '../../hooks/useSpeech';
import { useDictionary } from '../../hooks/useDictionary';
import { useStore } from '../../context/store';
import type { Morpheme, MorphemeMatrix, BuiltWord, SpellingRule } from '../../types';
import { wordSurface, normalizedSurface, normalizedResult, matchesWordKey } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relevantMorphemes(
  base: Morpheme,
  matrix: MorphemeMatrix,
): { prefixes: Morpheme[]; suffixes: Morpheme[] } {
  if (matrix.wordKey.length === 0) {
    return { prefixes: matrix.prefixes, suffixes: matrix.suffixes };
  }
  const baseText = base.text.toLowerCase();
  const wordsWithBase = matrix.wordKey.filter((w) => {
    const word = w.word.toLowerCase();
    if (word.includes(baseText)) return true;
    // Also match words containing the stem without a trailing silent-e
    // (e.g. base 'scribe' → stem 'scrib' matches 'describing', 'describable')
    if (baseText.endsWith('e') && baseText.length > 2) {
      const stem = baseText.slice(0, -1);
      if (word.includes(stem)) return true;
    }
    return false;
  });
  if (wordsWithBase.length === 0) {
    return { prefixes: matrix.prefixes, suffixes: matrix.suffixes };
  }
  const relevantPrefixes = matrix.prefixes.filter((p) =>
    wordsWithBase.some((w) => w.word.toLowerCase().startsWith(p.text.toLowerCase()))
  );
  const relevantSuffixes = matrix.suffixes.filter((s) =>
    wordsWithBase.some((w) => w.word.toLowerCase().endsWith(s.text.toLowerCase()))
  );
  return {
    prefixes: relevantPrefixes.length > 0 ? relevantPrefixes : matrix.prefixes,
    suffixes: relevantSuffixes.length > 0 ? relevantSuffixes : matrix.suffixes,
  };
}

const chipId = (m: Morpheme) => `chip::${m.id}`;
const slotId = (t: 'prefix' | 'suffix') => `slot::${t}`;

function pickDistractor(correctDef: string, allMatrices: MorphemeMatrix[]): string {
  const pool = allMatrices
    .flatMap((m) => m.wordKey.map((w) => w.definition))
    .filter((def) => def !== correctDef && def.length > 0);
  if (pool.length === 0) return 'to change something into a different form';
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Sentence quality check ───────────────────────────────────────────────────
// Returns { ok, feedback } — no network calls, just local heuristics.

interface SentenceCheck {
  ok: boolean;
  feedback: string;
}

function checkSentence(sentence: string, word: string): SentenceCheck {
  const trimmed = sentence.trim();

  // Must contain the target word (case-insensitive)
  if (!trimmed.toLowerCase().includes(word.toLowerCase())) {
    return {
      ok: false,
      feedback: `Make sure to use the word "${word}" in your sentence!`,
    };
  }

  // Too short — fewer than 4 words is likely not a sentence
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    return {
      ok: false,
      feedback: 'Your sentence is too short. Try writing a longer, complete sentence!',
    };
  }

  // Must start with a capital letter
  if (trimmed[0] !== trimmed[0].toUpperCase() || trimmed[0] === trimmed[0].toLowerCase()) {
    return {
      ok: false,
      feedback: 'Start your sentence with a capital letter!',
    };
  }

  // Must end with punctuation
  if (!/[.!?]$/.test(trimmed)) {
    return {
      ok: false,
      feedback: 'End your sentence with a period, exclamation mark, or question mark!',
    };
  }

  // Must contain at least one verb-like word.
  // IMPORTANT: morpheme-built words (import, disrupt, inspect, transport, construct…)
  // are frequently the main verb of the sentence, so the target word itself always
  // satisfies this check. We also test a broad auxiliary/common-verb list so that
  // noun-form words (transportation, inspection) work when paired with other verbs.
  const verbHints = /\b(is|are|was|were|has|have|had|will|can|could|should|would|do|does|did|make|makes|made|see|saw|go|goes|went|come|came|think|thought|know|knew|feel|felt|look|looks|looked|want|wanted|need|needs|needed|get|gets|got|use|uses|used|find|finds|found|help|helps|helped|seem|seems|seemed|became|become|becomes|keep|keeps|kept|give|gives|gave|take|takes|took|run|runs|ran|put|puts|set|show|shows|showed|move|moves|moved|live|lives|lived|mean|means|meant|call|calls|called|ask|asks|asked|turn|turns|turned|learn|learns|learned|read|try|tried|tries|write|writes|wrote|work|works|worked|play|plays|played|build|builds|built|carry|carries|carried|bring|brings|brought|start|starts|started|stop|stops|stopped|let|happen|happens|happened|love|loves|loved|like|likes|liked|said|say|says|told|tell|tells|include|includes|included|send|sends|sent|receive|receives|received|cause|causes|caused|allow|allows|allowed|change|changes|changed|create|creates|created|hold|holds|held|protect|protects|protected|connect|connects|connected|describe|describes|described|explain|explains|explained|prevent|prevents|prevented|support|supports|supported|require|requires|required|contain|contains|contained|affect|affects|affected|provide|provides|provided)\b/i;
  // The target word is already confirmed present in the sentence (first check above),
  // and morpheme words are almost always the verb — so it always satisfies this check.
  const hasVerb = verbHints.test(trimmed) || trimmed.toLowerCase().includes(word.toLowerCase());
  if (!hasVerb) {
    return {
      ok: false,
      feedback: 'Great start! Try to write a complete sentence with a verb (an action or being word).',
    };
  }

  return { ok: true, feedback: 'Great sentence! 🌟' };
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const TYPE_STYLE = {
  prefix: {
    idle:      'bg-sky-100 text-sky-800 border-sky-300',
    selected:  'bg-sky-500 text-white border-sky-600 shadow-sky-200',
    ghost:     'bg-sky-400 text-white border-sky-500',
    slot:      'bg-sky-500 border-sky-600 text-white',
    slotEmpty: 'border-sky-200 bg-sky-50',
    dot:       'bg-sky-400',
    label:     'text-sky-700',
  },
  base: {
    idle:      'bg-emerald-100 text-emerald-800 border-emerald-300',
    selected:  'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200',
    ghost:     'bg-emerald-400 text-white border-emerald-500',
    slot:      'bg-emerald-500 border-emerald-600 text-white',
    slotEmpty: 'border-emerald-200 bg-emerald-50',
    dot:       'bg-emerald-400',
    label:     'text-emerald-700',
  },
  suffix: {
    idle:      'bg-amber-100 text-amber-800 border-amber-300',
    selected:  'bg-amber-500 text-white border-amber-600 shadow-amber-200',
    ghost:     'bg-amber-400 text-white border-amber-500',
    slot:      'bg-amber-500 border-amber-600 text-white',
    slotEmpty: 'border-amber-200 bg-amber-50',
    dot:       'bg-amber-400',
    label:     'text-amber-700',
  },
};

// ─── Draggable Chip ───────────────────────────────────────────────────────────

const DraggableChip: React.FC<{
  morpheme: Morpheme;
  selected: boolean;
  onClick: () => void;
  isOverlay?: boolean;
}> = ({ morpheme, selected, onClick, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: chipId(morpheme), data: { morpheme } });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const s = TYPE_STYLE[morpheme.type];

  const cls = [
    'relative border-2 font-extrabold transition-all duration-150',
    'inline-flex flex-col items-center justify-center select-none rounded-2xl',
    'px-3 py-2.5 min-w-[64px] gap-0.5',
    isOverlay
      ? `${s.ghost} shadow-2xl scale-110 rotate-2 cursor-grabbing`
      : isDragging
      ? 'opacity-30 border-dashed scale-95'
      : selected
      ? `${s.selected} shadow-lg scale-105 cursor-grab`
      : `${s.idle} hover:scale-105 hover:shadow-md cursor-grab active:cursor-grabbing`,
  ].join(' ');

  if (isOverlay) {
    return (
      <div className={cls}>
        <span className="text-lg font-black">{morpheme.text}</span>
        <span className="text-xs font-semibold text-white/80 text-center leading-tight">
          {morpheme.meaning}
        </span>
      </div>
    );
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      title={`${morpheme.text}: ${morpheme.meaning} — drag or click`}
      className={cls}
    >
      <GripVertical className="absolute top-1 right-1 w-3 h-3 opacity-20" />
      <span className="text-lg font-black">{morpheme.text}</span>
      <span className={`text-xs font-semibold text-center leading-tight ${
        selected ? 'text-white/80' : 'text-gray-500'
      }`}>
        {morpheme.meaning}
      </span>
    </button>
  );
};

// ─── Drop Slot ────────────────────────────────────────────────────────────────

const DropSlot: React.FC<{
  type: 'prefix' | 'suffix';
  morpheme: Morpheme | undefined;
  onRemove: () => void;
  label: string;
  emptyLabel: string;
}> = ({ type, morpheme, onRemove, label, emptyLabel }) => {
  const { isOver, setNodeRef } = useDroppable({ id: slotId(type) });
  const s = TYPE_STYLE[type];

  if (morpheme) {
    return (
      <div
        ref={setNodeRef}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2
          min-h-[76px] px-3 py-2.5 transition-all duration-150 shadow-md
          ${isOver ? 'scale-[1.04] border-dashed border-gray-400 bg-gray-100' : s.slot}`}
      >
        <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">{label}</div>
        <div className="text-xl font-black">{morpheme.text}</div>
        <div className="text-xs font-semibold opacity-75 text-center leading-tight mt-0.5">
          {morpheme.meaning}
        </div>
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 opacity-60 hover:opacity-100 transition"
        >
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
        min-h-[76px] px-3 py-2.5 transition-all duration-150
        ${isOver ? `${s.slotEmpty} scale-[1.04] shadow-inner border-solid` : 'border-gray-200 bg-gray-50'}`}
    >
      <div className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${
        isOver ? s.label : 'text-gray-400'
      }`}>{label}</div>
      <div className={`text-xs font-semibold ${isOver ? s.label : 'text-gray-300'}`}>
        {isOver ? '✦ Drop here' : emptyLabel}
      </div>
      <div className="text-xs text-gray-300 mt-0.5">optional</div>
    </div>
  );
};

// ─── Morpheme Carousel ────────────────────────────────────────────────────────

const MorphemeCarousel: React.FC<{
  morphemes: Morpheme[];
  selected: Morpheme | undefined;
  onToggle: (m: Morpheme) => void;
  label: string;
  type: 'prefix' | 'suffix';
  pageSize?: number;
}> = ({ morphemes, selected, onToggle, label, type, pageSize = 6 }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(morphemes.length / pageSize);
  const visible = morphemes.slice(page * pageSize, (page + 1) * pageSize);
  const s = TYPE_STYLE[type];

  useEffect(() => { setPage(0); }, [morphemes]);

  if (morphemes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className={`text-xs font-extrabold uppercase tracking-widest ${s.label}`}>
            {label}
          </span>
          <span className="text-xs text-gray-400">({morphemes.length})</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400
                hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-400 font-bold w-7 text-center">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400
                hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((m) => (
          <DraggableChip
            key={m.id}
            morpheme={m}
            selected={selected?.id === m.id}
            onClick={() => onToggle(m)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Spelling Rule Tip ───────────────────────────────────────────────────────

const SPELLING_TIPS: Record<NonNullable<SpellingRule>, { headline: string; explanation: string }> = {
  'drop-e': {
    headline: 'Drop the silent e!',
    explanation: 'When a word ends in a silent e (like write or hope), we drop the e before adding -ing, -ed, or -er. So write + ing = writing, not writeing!',
  },
  'double-consonant': {
    headline: 'Double the last letter!',
    explanation: 'When a short word ends with one vowel + one consonant (like run or sit), we double the last letter before adding -ing or -ed. So run + ing = running, not runing!',
  },
  'y-to-i-cons': {
    headline: 'Change y to i!',
    explanation: 'When a word ends in y after a consonant (like happy or tidy), we change the y to i before adding -ness, -ful, or -ly. So happy + ness = happiness!',
  },
  'y-to-i-es': {
    headline: 'Change y to i before -es!',
    explanation: 'When a word ends in y after a consonant (like story or baby), we change the y to i before adding -es. So story + es = stories, not storyes!',
  },
  'merge-t-tion': {
    headline: 'The t blends into -tion!',
    explanation: 'When a root ends in t (like rupt or struct) and we add -tion, the t at the end of the root merges into the suffix. So rupt + tion = ruption, not rupttion!',
  },
};

const SpellingTip: React.FC<{ rule: SpellingRule; base: string; suffix: string; surface: string }> = ({
  rule, base, suffix, surface,
}) => {
  if (!rule) return null;
  const tip = SPELLING_TIPS[rule];
  return (
    <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-4 py-3 flex items-start gap-2">
      <span className="text-xl shrink-0">✨</span>
      <div>
        <p className="font-extrabold text-yellow-800 text-sm">
          Spell check! {tip.headline}
        </p>
        <p className="text-yellow-700 text-sm leading-snug mt-0.5">
          {tip.explanation}
        </p>
        <p className="text-yellow-600 text-xs mt-1 font-semibold">
          👉 <span className="font-black">{base}</span> + <span className="font-black">{suffix}</span> = <span className="font-black text-emerald-700">{surface}</span>
        </p>
      </div>
    </div>
  );
};

// ─── Word Display (right panel top) ──────────────────────────────────────────

const WordDisplay: React.FC<{
  built: BuiltWord;
  surface: string;
  spellingRule: SpellingRule;
  revealed: boolean;
  isInWordKey: boolean;
  dictIsReal: boolean | null;
}> = ({ built, surface, spellingRule, revealed, isInWordKey, dictIsReal }) => {
  const parts = [built.prefix, built.base, built.suffix].filter(Boolean) as Morpheme[];

  if (parts.length === 0 || !built.base) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-4xl mb-2">👆</div>
        <p className="text-gray-400 text-sm font-medium">
          Drag or click a prefix or suffix<br />to build a word!
        </p>
      </div>
    );
  }

  const isReal = isInWordKey || dictIsReal === true;
  const wordColor = revealed
    ? isReal ? 'text-emerald-600' : 'text-purple-500'
    : 'text-gray-800';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Big assembled word */}
      <div className={`text-5xl font-black tracking-wide leading-none ${wordColor} transition-colors duration-300`}>
        {surface}
      </div>

      {/* Stacked part breakdown: each morpheme as a colored tile with text + meaning */}
      {parts.length > 1 && (
        <div className="flex items-start gap-1 justify-center flex-wrap">
          {parts.map((p, i) => {
            const bg   = p.type === 'prefix' ? 'bg-sky-100'     : p.type === 'base' ? 'bg-emerald-100' : 'bg-amber-100';
            const text = p.type === 'prefix' ? 'text-sky-700'   : p.type === 'base' ? 'text-emerald-700' : 'text-amber-700';
            return (
              <React.Fragment key={p.id}>
                {i > 0 && (
                  <span className="text-gray-300 font-bold text-xl self-center mx-0.5">+</span>
                )}
                <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${bg} min-w-[52px]`}>
                  <span className={`text-base font-black ${text}`}>{p.text}</span>
                  <span className={`text-sm font-semibold ${text} opacity-80 text-center leading-tight mt-0.5`}>
                    {p.meaning}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Spelling rule tip — shown whenever a rule fires, even before judging */}
      {spellingRule && built.suffix && (
        <SpellingTip
          rule={spellingRule}
          base={built.base?.text ?? ''}
          suffix={built.suffix.text}
          surface={surface}
        />
      )}

      {/* Reveal badge */}
      {revealed && (
        <div className={`text-sm font-bold px-4 py-1.5 rounded-2xl ${
          isReal ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {isReal ? '✅ Real word!' : '🔮 Made-up word!'}
        </div>
      )}
    </div>
  );
};

// ─── Meaning Checker ──────────────────────────────────────────────────────────

const MeaningChecker: React.FC<{
  word: string;
  correct: string;
  distractor: string;
  onCorrect: () => void;
}> = ({ word, correct, distractor, onCorrect }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [options] = useState(() =>
    [{ text: correct, isCorrect: true }, { text: distractor, isCorrect: false }]
      .sort(() => Math.random() - 0.5)
  );

  const isRight = selected === correct;
  const isWrong = selected !== null && !isRight;

  useEffect(() => {
    if (!isRight) return;
    const t = setTimeout(onCorrect, 800);
    return () => clearTimeout(t);
  }, [isRight, onCorrect]);

  return (
    <div className="bg-violet-50 border-2 border-violet-200 rounded-3xl p-5 space-y-4">
      <p className="text-center text-lg font-extrabold text-gray-700">
        Based on the word parts, what does{' '}
        <span className="italic text-violet-700">{word}</span> mean?
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.text;
          const btnColor = !isSelected
            ? 'bg-white border-gray-200 hover:border-violet-300 text-gray-700'
            : opt.isCorrect
            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
            : 'bg-red-100 border-red-400 text-red-800';
          return (
            <button
              key={opt.text}
              disabled={isRight}
              onClick={() => setSelected(opt.text)}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 font-medium
                transition-colors leading-snug ${btnColor}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {isWrong && (
        <div className="text-center space-y-2">
          <p className="text-orange-600 font-semibold text-sm">
            Look again at the word parts and try again.
          </p>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-violet-600 underline hover:text-violet-800 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
      {isRight && (
        <p className="text-center text-emerald-600 font-bold text-sm">
          That's right! ✅
        </p>
      )}
    </div>
  );
};

// ─── Sentence Writer ──────────────────────────────────────────────────────────

const SentenceWriter: React.FC<{
  word: string;
  definition?: string;
  example?: string;
  onDone: (sentence: string, passed: boolean) => void;
}> = ({ word, definition, example, onDone }) => {
  const [sentence, setSentence]   = useState('');
  const [result, setResult]       = useState<SentenceCheck | null>(null);
  const [attempts, setAttempts]   = useState(0);
  const [showExample, setShowExample] = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = () => {
    const check = checkSentence(sentence, word);
    setResult(check);
    setAttempts((a) => a + 1);
    if (check.ok) {
      // small delay so they see the success message before parent moves on
      setTimeout(() => onDone(sentence, true), 1400);
    }
  };

  const handleSkip = () => onDone('', false);

  const maxAttempts = 3;
  const tooManyTries = attempts >= maxAttempts && !result?.ok;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="font-extrabold text-gray-700 text-base">
          Use <span className="italic text-blue-600">{word}</span> in a sentence!
        </p>
      </div>

      {definition && (
        <p className="text-xs text-gray-400 italic leading-snug">{definition}</p>
      )}

      {example && (
        <div>
          {showExample ? (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 italic leading-snug">
                <span className="font-semibold not-italic">Example: </span>{example}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowExample(true)}
              className="text-xs text-blue-400 hover:text-blue-600 underline transition-colors"
            >
              💡 Give me an example
            </button>
          )}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={sentence}
        onChange={(e) => { setSentence(e.target.value); setResult(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        placeholder={`Write a sentence using "${word}"…`}
        rows={3}
        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base
          font-medium text-gray-800 focus:border-blue-400 focus:outline-none
          resize-none leading-relaxed"
      />

      {/* Feedback */}
      {result && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
          result.ok
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200'
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle  className="w-4 h-4 shrink-0 mt-0.5" />
          }
          <span>{result.feedback}</span>
        </div>
      )}

      {/* Too many tries — offer to move on */}
      {tooManyTries && (
        <p className="text-xs text-gray-400 text-center">
          That's tricky! You can skip for now.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={sentence.trim().length < 3}
          className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-extrabold text-base
            hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit ✏️
        </button>
        {(attempts > 0) && (
          <button
            onClick={handleSkip}
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-400
              font-bold text-sm hover:border-gray-400 hover:text-gray-600 transition-all"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Playground ──────────────────────────────────────────────────────────

type RightPanelMode =
  | 'idle'           // just the base — no prefix/suffix chosen yet
  | 'judge'          // word built, awaiting Real/Made-Up
  | 'judge-retry'    // user said Made-Up but word is real — show correction + retry
  | 'meaning-check'  // word judged real — pick the correct definition
  | 'sentence'       // meaning confirmed — write a sentence
  | 'result';        // feedback shown, ready to continue

export const StudentPlayground: React.FC<{
  matrixId: string;
  studentId: string;
  startBaseIndex?: number;
  onBack: () => void;
}> = ({ matrixId, studentId, startBaseIndex = 0, onBack }) => {
  const { getMatrixById, getAllMatrices, addProgressEntry, getStudentProgress } = useStore();
  const { speak, isSupported } = useSpeech();
  const dict = useDictionary();

  const matrix      = getMatrixById(matrixId);
  const allProgress = getStudentProgress(studentId).filter((p) => p.matrixId === matrixId);

  const [baseIndex, setBaseIndex]   = useState(startBaseIndex);
  const [built, setBuilt]           = useState<BuiltWord>({});
  const [revealed, setRevealed]     = useState(false);
  const [mode, setMode]             = useState<RightPanelMode>('idle');
  const [lastResult, setLastResult] = useState<{
    word: string; correct: boolean; isReal: boolean;
    definition?: string; example?: string; sentence?: string;
  } | null>(null);
  const [meaningOptions, setMeaningOptions] = useState<{ correct: string; distractor: string } | null>(null);
  const [activeDrag, setActiveDrag] = useState<Morpheme | null>(null);
  const [wordsMade, setWordsMade]   = useState<{ word: string; sentence?: string }[]>([]);

  const startTimeRef = useRef<number>(Date.now());
  useEffect(() => { startTimeRef.current = Date.now(); }, [built]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  if (!matrix) return <div className="p-8 text-red-500">Matrix not found.</div>;

  const currentBase = matrix.bases[baseIndex] ?? matrix.bases[0];

  const handleBaseChange = (i: number) => {
    setBaseIndex(i);
    setBuilt({ base: matrix.bases[i] });
    setLastResult(null);
    setMeaningOptions(null);
    setRevealed(false);
    setMode('idle');
  };

  const { prefixes: relevantPrefixes, suffixes: relevantSuffixes } = useMemo(
    () => relevantMorphemes(currentBase, matrix),
    [currentBase.id, matrix.id], // eslint-disable-line
  );

  useEffect(() => {
    setBuilt((prev) => ({ ...prev, base: currentBase }));
  }, [currentBase.id]); // eslint-disable-line

  useEffect(() => {
    dict.prefetchAll(matrix.wordKey.map((w) => w.word));
  }, [matrixId]); // eslint-disable-line

  const raw              = wordSurface(built);
  const normResult       = normalizedResult(built);
  const surface          = normResult.surface || raw;
  const spellingRule     = normResult.rule;

  const wordKeyEntry = matrix.wordKey.find((w) => matchesWordKey(built, w.word));
  const isInWordKey  = !!wordKeyEntry;

  useEffect(() => {
    if (surface && surface.length >= 2 && mode !== 'result') dict.lookup(surface);
  }, [surface, mode]); // eslint-disable-line

  // Update mode when a morpheme is added/removed
  const parts = [built.prefix, built.base, built.suffix].filter(Boolean) as Morpheme[];
  useEffect(() => {
    if (parts.length > 1 && mode === 'idle') setMode('judge');
    if (parts.length <= 1 && (mode === 'judge')) setMode('idle');
  }, [parts.length]); // eslint-disable-line

  // ── DnD ────────────────────────────────────────────────────────────────────

  const handleDragStart = (e: DragStartEvent) => {
    const m = (e.active.data.current as { morpheme: Morpheme } | undefined)?.morpheme;
    if (m) setActiveDrag(m);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const m = (e.active.data.current as { morpheme: Morpheme } | undefined)?.morpheme;
    if (!m || !e.over) return;
    const overId = e.over.id as string;
    if (!overId.startsWith('slot::')) return;
    const slot = overId.replace('slot::', '') as 'prefix' | 'suffix';
    if (m.type !== slot) return;
    setLastResult(null);
    setRevealed(false);
    setBuilt((prev) => ({
      ...prev,
      [slot]: prev[slot]?.id === m.id ? undefined : m,
    }));
  };

  const toggleMorpheme = (m: Morpheme) => {
    if (m.type === 'base') return;
    if (mode === 'sentence' || mode === 'result') return; // locked during sentence/result
    setLastResult(null);
    setRevealed(false);
    setBuilt((prev) => ({
      ...prev,
      [m.type]: prev[m.type]?.id === m.id ? undefined : m,
    }));
  };

  const clearBuilt = () => {
    setBuilt({ base: currentBase });
    setLastResult(null);
    setMeaningOptions(null);
    setRevealed(false);
    setMode('idle');
  };

  const handleJudge = (guessedReal: boolean) => {
    const actuallyReal = isInWordKey || dict.isRealWord === true;
    const correct      = guessedReal === actuallyReal;
    addProgressEntry({
      studentId, matrixId, word: surface,
      isRealWord: guessedReal, actuallyReal, correct,
      timeSpentMs: Date.now() - startTimeRef.current,
    });
    setRevealed(true);
    setLastResult({
      word: surface, correct, isReal: actuallyReal,
      definition: wordKeyEntry?.definition ?? dict.definition?.definition,
      example:    wordKeyEntry?.example    ?? dict.definition?.example,
    });

    // If the word is real but the student said Made-Up → show correction card
    if (actuallyReal && !guessedReal) {
      setMode('judge-retry');
      return;
    }

    // If it's a real word (and they guessed real), go to meaning-check then sentence
    if (actuallyReal) {
      const correctDef = wordKeyEntry?.definition ?? dict.definition?.definition ?? '';
      if (correctDef) {
        const distractor = pickDistractor(correctDef, getAllMatrices());
        setMeaningOptions({ correct: correctDef, distractor });
        setMode('meaning-check');
      } else {
        setMode('sentence');
      }
    } else {
      setMode('result');
    }
  };

  // Called when student corrects their guess after seeing the judge-retry card
  const handleRetryReal = () => {
    const correctDef = wordKeyEntry?.definition ?? dict.definition?.definition ?? '';
    if (correctDef) {
      const distractor = pickDistractor(correctDef, getAllMatrices());
      setMeaningOptions({ correct: correctDef, distractor });
      setMode('meaning-check');
    } else {
      setMode('sentence');
    }
  };

  const handleMeaningDone = () => {
    setMode('sentence');
  };

  const handleSentenceDone = (sentence: string, _passed: boolean) => {
    setWordsMade((prev) => [
      ...prev,
      { word: surface, sentence: sentence || undefined },
    ]);
    setLastResult((prev) => prev ? { ...prev, sentence } : prev);
    setMode('result');
  };

  // When finishing a made-up word result without sentence step
  useEffect(() => {
    if (mode === 'result' && lastResult && !lastResult.isReal) {
      setWordsMade((prev) => {
        if (prev.some((w) => w.word === surface)) return prev;
        return [...prev, { word: surface }];
      });
    }
  }, [mode]); // eslint-disable-line

  const score = {
    tried:   allProgress.length,
    correct: allProgress.filter((p) => p.correct).length,
  };

  const hasWord = !!built.base;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-700 font-bold flex items-center gap-1 text-sm shrink-0"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{matrix.icon ?? '📚'}</span>
              <span className="font-extrabold text-gray-800 truncate">{matrix.name}</span>
            </div>
            {score.tried > 0 && (
              <div className="shrink-0 text-right text-sm">
                <span className="font-extrabold text-emerald-600">{score.correct}</span>
                <span className="text-gray-400">/{score.tried}</span>
                <span className="text-xs text-gray-400 ml-1">correct</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Three-column layout ──────────────────────────────────────────── */}
        <div className="flex-1 max-w-6xl mx-auto w-full px-3 py-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-start">

            {/* ══ LEFT: Prefix panel (sticky) ═══════════════════════════════ */}
            <div className="md:sticky md:top-20 md:w-52 lg:w-60 shrink-0 space-y-4">

              {/* Base navigator */}
              {matrix.bases.length > 1 && (
                <div className="flex items-center justify-between bg-emerald-50
                  border-2 border-emerald-200 rounded-2xl px-3 py-2">
                  <button
                    onClick={() => handleBaseChange(Math.max(0, baseIndex - 1))}
                    disabled={baseIndex === 0}
                    className="w-7 h-7 rounded-xl flex items-center justify-center
                      text-emerald-600 hover:bg-emerald-200 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                      Base {baseIndex + 1} / {matrix.bases.length}
                    </div>
                    <div className="text-lg font-black text-emerald-700">{currentBase.text}</div>
                  </div>
                  <button
                    onClick={() => handleBaseChange(Math.min(matrix.bases.length - 1, baseIndex + 1))}
                    disabled={baseIndex === matrix.bases.length - 1}
                    className="w-7 h-7 rounded-xl flex items-center justify-center
                      text-emerald-600 hover:bg-emerald-200 disabled:opacity-30 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Prefix carousel */}
              {relevantPrefixes.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4">
                  <MorphemeCarousel
                    morphemes={relevantPrefixes}
                    selected={built.prefix}
                    onToggle={toggleMorpheme}
                    label="Prefixes"
                    type="prefix"
                    pageSize={6}
                  />
                </div>
              )}

              {/* Words you've built */}
              {wordsMade.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-extrabold text-amber-800 uppercase tracking-wide text-xs">
                      Words You've Built
                    </span>
                    <span className="ml-auto text-xs font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                      {wordsMade.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordsMade.map(({ word, sentence }, i) => (
                      <div
                        key={`${word}-${i}`}
                        className="bg-white border border-amber-200 rounded-xl px-2.5 py-1 text-xs"
                        title={sentence ?? ''}
                      >
                        <span className="font-bold text-gray-800">{word}</span>
                        {sentence && (
                          <span className="text-gray-400 ml-1 italic">✏️</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ══ CENTER: Slots + word display + action panels ══════════════ */}
            <div className="flex-1 space-y-4">

              {/* Slot row */}
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <DropSlot
                    type="prefix"
                    morpheme={built.prefix}
                    onRemove={() => { setBuilt((p) => ({ ...p, prefix: undefined })); setLastResult(null); setRevealed(false); setMode(parts.length > 2 ? 'judge' : 'idle'); }}
                    label="Prefix"
                    emptyLabel="prefix"
                  />

                  {/* Base — locked */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2
                    bg-emerald-500 border-emerald-600 text-white min-h-[76px] px-1 py-2 shadow-md">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">Base ★</div>
                    <div className="text-xl font-black">{currentBase.text}</div>
                    <div className="text-xs font-semibold opacity-75 text-center leading-tight mt-0.5">
                      {currentBase.meaning}
                    </div>
                  </div>

                  <DropSlot
                    type="suffix"
                    morpheme={built.suffix}
                    onRemove={() => { setBuilt((p) => ({ ...p, suffix: undefined })); setLastResult(null); setRevealed(false); setMode(parts.length > 2 ? 'judge' : 'idle'); }}
                    label="Suffix"
                    emptyLabel="suffix"
                  />
                </div>

                {/* Clear */}
                {hasWord && (built.prefix || built.suffix) && mode !== 'sentence' && (
                  <div className="text-center pt-1">
                    <button
                      onClick={clearBuilt}
                      className="text-xs text-gray-300 hover:text-gray-500 transition"
                    >
                      <XCircle className="w-3 h-3 inline mr-1" />clear
                    </button>
                  </div>
                )}
              </div>

              {/* Word display card */}
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-6">
                <WordDisplay
                  built={built}
                  surface={surface}
                  spellingRule={spellingRule}
                  revealed={revealed}
                  isInWordKey={isInWordKey}
                  dictIsReal={dict.isRealWord}
                />

                {/* Speak button */}
                {isSupported && hasWord && parts.length > 0 && (
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={() => speak(surface)}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition"
                    >
                      <Volume2 className="w-4 h-4" /> Hear it
                    </button>
                  </div>
                )}
              </div>

              {/* ── Judge buttons ── */}
              {mode === 'judge' && (
                <div className="space-y-3">
                  {dict.isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-gray-400 py-4 bg-white rounded-3xl border-2 border-gray-100">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Looking it up…</span>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-5 space-y-3">
                      <p className="text-center text-lg font-extrabold text-gray-600">
                        Is <span className="text-gray-800 italic">{surface}</span> a real word?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleJudge(true)}
                          className="flex-1 py-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50
                            text-emerald-700 font-extrabold text-lg hover:bg-emerald-500 hover:text-white
                            hover:border-emerald-500 transition-all active:scale-95"
                        >
                          ✅ Real!
                        </button>
                        <button
                          onClick={() => handleJudge(false)}
                          className="flex-1 py-4 rounded-2xl border-2 border-purple-200 bg-purple-50
                            text-purple-700 font-extrabold text-lg hover:bg-purple-500 hover:text-white
                            hover:border-purple-500 transition-all active:scale-95"
                        >
                          🔮 Made-Up!
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Judge retry (guessed Made-Up but word is real) ── */}
              {mode === 'judge-retry' && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-5 space-y-4">
                  <div className="text-center space-y-1">
                    <div className="text-3xl">🧐</div>
                    <p className="text-lg font-extrabold text-orange-700">
                      Actually, <span className="italic">{surface}</span> is a real word!
                    </p>
                    <p className="text-sm text-orange-600">
                      Look at the word parts — they add up to a real meaning.
                    </p>
                  </div>
                  <button
                    onClick={handleRetryReal}
                    className="w-full py-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50
                      text-emerald-700 font-extrabold text-lg hover:bg-emerald-500 hover:text-white
                      hover:border-emerald-500 transition-all active:scale-95"
                  >
                    ✅ You're right, it's Real!
                  </button>
                </div>
              )}

              {/* ── Meaning check step ── */}
              {mode === 'meaning-check' && meaningOptions && (
                <MeaningChecker
                  word={surface}
                  correct={meaningOptions.correct}
                  distractor={meaningOptions.distractor}
                  onCorrect={handleMeaningDone}
                />
              )}

              {/* ── Sentence writing step (only for real words) ── */}
              {mode === 'sentence' && lastResult && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-5">
                  <SentenceWriter
                    word={lastResult.word}
                    definition={lastResult.definition}
                    example={lastResult.example}
                    onDone={handleSentenceDone}
                  />
                </div>
              )}

              {/* ── Result feedback ── */}
              {mode === 'result' && lastResult && (
                <div className={`rounded-3xl border-2 p-5 text-center space-y-2 ${
                  lastResult.correct
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="text-4xl">{lastResult.correct ? '🎉' : '🧠'}</div>
                  <div className={`font-extrabold text-xl ${
                    lastResult.correct ? 'text-emerald-700' : 'text-orange-600'
                  }`}>
                    {lastResult.correct ? 'Great thinking!' : 'Good try!'}
                  </div>
                  <p className="text-base text-gray-600">
                    <strong>{lastResult.word}</strong>{' '}
                    {lastResult.isReal ? 'is a real word! ✅' : 'is not in the dictionary.'}
                  </p>
                  {lastResult.definition && (
                    <p className="text-sm text-gray-500 italic border-t border-gray-200 pt-2">
                      {lastResult.definition}
                    </p>
                  )}
                  {lastResult.sentence && (
                    <div className="bg-white rounded-2xl border border-blue-200 px-4 py-2 text-left">
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">
                        Your sentence ✏️
                      </p>
                      <p className="text-sm text-gray-700 italic">"{lastResult.sentence}"</p>
                    </div>
                  )}
                  <Button
                    onClick={clearBuilt}
                    size="md"
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Try Another
                  </Button>
                </div>
              )}

            </div>

            {/* ══ RIGHT: Suffix panel (sticky) ══════════════════════════════ */}
            <div className="md:sticky md:top-20 md:w-52 lg:w-60 shrink-0">
              {relevantSuffixes.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4">
                  <MorphemeCarousel
                    morphemes={relevantSuffixes}
                    selected={built.suffix}
                    onToggle={toggleMorpheme}
                    label="Suffixes"
                    type="suffix"
                    pageSize={6}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeDrag && (
          <DraggableChip
            morpheme={activeDrag}
            selected={false}
            onClick={() => {}}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
