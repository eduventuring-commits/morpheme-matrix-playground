import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, CheckCircle2, AlertCircle, PenLine, BookOpen, XCircle, RefreshCw,
} from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';
import { useDictionary } from '../../hooks/useDictionary';
import { useStore } from '../../context/store';
import type { Morpheme, MorphemeMatrix, BuiltWord, SpellingRule } from '../../types';
import { wordSurface, normalizedResult, matchesWordKey } from '../../types';
import { PREFIX_MATRICES } from '../../data/prefixMatrices';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode =
  | 'idle'
  | 'judge'
  | 'judge-retry'
  | 'meaning-check'
  | 'sentence'
  | 'result';

interface ResultData {
  word: string;
  correct: boolean;
  isReal: boolean;
  definition?: string;
  example?: string;
  sentence?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickDistractor(correctDef: string, allMatrices: MorphemeMatrix[]): string {
  const pool = allMatrices
    .flatMap((m) => m.wordKey.map((w) => w.definition))
    .filter((def) => def !== correctDef && def.length > 0);
  if (pool.length === 0) return 'to change something into a different form';
  return pool[Math.floor(Math.random() * pool.length)];
}

interface SentenceCheck { ok: boolean; feedback: string; }

function checkSentence(sentence: string, word: string): SentenceCheck {
  const trimmed = sentence.trim();
  if (!trimmed.toLowerCase().includes(word.toLowerCase()))
    return { ok: false, feedback: `Make sure to use the word "${word}" in your sentence!` };
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4)
    return { ok: false, feedback: 'Your sentence is too short. Try writing a longer, complete sentence!' };
  if (trimmed[0] !== trimmed[0].toUpperCase() || trimmed[0] === trimmed[0].toLowerCase())
    return { ok: false, feedback: 'Start your sentence with a capital letter!' };
  if (!/[.!?]$/.test(trimmed))
    return { ok: false, feedback: 'End your sentence with a period, exclamation mark, or question mark!' };
  const verbHints = /\b(is|are|was|were|has|have|had|will|can|could|should|would|do|does|did|make|makes|made|see|saw|go|goes|went|come|came|think|thought|know|knew|feel|felt|look|looks|looked|want|wanted|need|needs|get|gets|got|use|uses|used|find|finds|found|help|helps|helped|seem|seems|became|become|becomes|keep|keeps|kept|give|gives|gave|take|takes|took|run|runs|ran|put|puts|set|show|shows|showed|move|moves|moved|live|lives|lived|mean|means|meant|call|calls|asked|turn|turns|turned|learn|learns|learned|try|tried|tries|write|writes|wrote|work|works|worked|play|plays|played|build|builds|built|carry|carries|carried|bring|brings|brought|start|starts|started|stop|stops|stopped|let|happen|happens|happened|love|loves|loved|like|likes|liked|say|says|said|tell|tells|told|include|includes|included|send|sends|sent|change|changes|changed|create|creates|created|protect|protects|protected|connect|connects|connected|describe|describes|described|prevent|prevents|prevented|support|supports|supported|contain|contains|contained|affect|affects|affected|provide|provides|provided)\b/i;
  const hasVerb = verbHints.test(trimmed) || trimmed.toLowerCase().includes(word.toLowerCase());
  if (!hasVerb)
    return { ok: false, feedback: 'Great start! Try to include a verb (an action or being word).' };
  return { ok: true, feedback: 'Great sentence! 🌟' };
}

// ─── SpellingTip ──────────────────────────────────────────────────────────────

const SPELLING_TIPS: Partial<Record<string, string>> = {
  'drop-e':           '✏️ Drop the silent e before a vowel suffix',
  'double-consonant': '✏️ Double the last consonant before a vowel suffix',
  'y-to-i-cons':      '✏️ Change y to i before a consonant suffix',
  'y-to-i-es':        '✏️ Change y to i before -es',
  'merge-t-tion':     '✏️ The t at the end of the base merges with -tion',
};

const SpellingTip: React.FC<{ rule: SpellingRule; base: string; suffix: string; surface: string }> = (
  { rule, base, suffix, surface },
) => {
  if (!rule) return null;
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
      <span className="shrink-0">{SPELLING_TIPS[rule] ?? '✏️ Spelling rule applied'}</span>
      <span className="text-amber-500 font-normal">({base} + {suffix} → {surface})</span>
    </div>
  );
};

// ─── MeaningChecker ───────────────────────────────────────────────────────────

const MeaningChecker: React.FC<{
  word: string; correct: string; distractor: string; onCorrect: () => void;
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
            <button key={opt.text} disabled={isRight}
              onClick={() => setSelected(opt.text)}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 font-medium
                transition-colors leading-snug ${btnColor}`}>
              {opt.text}
            </button>
          );
        })}
      </div>
      {isWrong && (
        <div className="text-center space-y-2">
          <p className="text-orange-600 font-semibold text-sm">Look at the word parts and try again.</p>
          <button onClick={() => setSelected(null)}
            className="text-sm text-violet-600 underline hover:text-violet-800 transition-colors">
            Try again
          </button>
        </div>
      )}
      {isRight && <p className="text-center text-emerald-600 font-bold text-sm">That's right! ✅</p>}
    </div>
  );
};

// ─── SentenceWriter ───────────────────────────────────────────────────────────

const SentenceWriter: React.FC<{
  word: string; definition?: string; example?: string;
  onDone: (sentence: string, passed: boolean) => void;
}> = ({ word, definition, example, onDone }) => {
  const [sentence, setSentence] = useState('');
  const [result, setResult]     = useState<SentenceCheck | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showExample, setShowExample] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleSubmit = () => {
    const check = checkSentence(sentence, word);
    setResult(check);
    setAttempts((a) => a + 1);
    if (check.ok) setTimeout(() => onDone(sentence, true), 1400);
  };

  const tooManyTries = attempts >= 3 && !result?.ok;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="font-extrabold text-gray-700 text-base">
          Use <span className="italic text-blue-600">{word}</span> in a sentence!
        </p>
      </div>
      {definition && <p className="text-xs text-gray-400 italic leading-snug">{definition}</p>}
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
            <button onClick={() => setShowExample(true)}
              className="text-xs text-blue-400 hover:text-blue-600 underline transition-colors">
              💡 Give me an example
            </button>
          )}
        </div>
      )}
      <textarea ref={ref} value={sentence}
        onChange={(e) => { setSentence(e.target.value); setResult(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        placeholder={`Write a sentence using "${word}"…`}
        rows={3}
        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base
          font-medium text-gray-800 focus:border-blue-400 focus:outline-none
          resize-none leading-relaxed"
      />
      {result && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
          result.ok
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200'
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle  className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{result.feedback}</span>
        </div>
      )}
      {tooManyTries && <p className="text-xs text-gray-400 text-center">That's tricky! You can skip for now.</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={sentence.trim().length < 3}
          className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-extrabold text-base
            hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          Submit ✏️
        </button>
        {attempts > 0 && (
          <button onClick={() => onDone('', false)}
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-400
              font-bold text-sm hover:border-gray-400 hover:text-gray-600 transition-all">
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Playground ──────────────────────────────────────────────────────────

export const PrefixPlayground: React.FC<{
  matrixId: string;
  onBack: () => void;
}> = ({ matrixId, onBack }) => {
  const { addProgressEntry, getAllMatrices } = useStore();
  const { speak, isSupported } = useSpeech();
  const dict = useDictionary();

  const matrix      = PREFIX_MATRICES.find((m) => m.id === matrixId);
  const fixedPrefix = matrix?.prefixes[0];

  const [selectedBase,   setSelectedBase]   = useState<Morpheme | null>(null);
  const [selectedSuffix, setSelectedSuffix] = useState<Morpheme | null>(null);
  const [mode,           setMode]           = useState<PanelMode>('idle');
  const [revealed,       setRevealed]       = useState(false);
  const [lastResult,     setLastResult]     = useState<ResultData | null>(null);
  const [meaningOpts,    setMeaningOpts]    = useState<{ correct: string; distractor: string } | null>(null);
  const [wordsMade,      setWordsMade]      = useState<{ word: string; sentence?: string }[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  const built: BuiltWord = {
    prefix: fixedPrefix,
    base:   selectedBase  ?? undefined,
    suffix: selectedSuffix ?? undefined,
  };

  const raw          = wordSurface(built);
  const normResult   = normalizedResult(built);
  const surface      = normResult.surface || raw;
  const spellingRule = normResult.rule;
  const parts        = [built.prefix, built.base, built.suffix].filter(Boolean) as Morpheme[];

  const wordKeyEntry = matrix?.wordKey.find((w) => matchesWordKey(built, w.word));
  const isInWordKey  = !!wordKeyEntry;

  useEffect(() => {
    if (surface && surface.length >= 2 && mode !== 'result') dict.lookup(surface);
  }, [surface, mode]); // eslint-disable-line

  if (!matrix || !fixedPrefix) {
    return <div className="p-8 text-red-500">Prefix matrix not found.</div>;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToIdle = () => {
    setSelectedBase(null);
    setSelectedSuffix(null);
    setMode('idle');
    setRevealed(false);
    setLastResult(null);
    setMeaningOpts(null);
  };

  const handleSelectBase = (base: Morpheme) => {
    if (mode === 'sentence' || mode === 'result') return;
    if (selectedBase?.id === base.id) { resetToIdle(); return; }
    setSelectedBase(base);
    setSelectedSuffix(null);
    setMode('judge');
    setRevealed(false);
    setLastResult(null);
    setMeaningOpts(null);
    startTimeRef.current = Date.now();
  };

  const handleSelectSuffix = (suf: Morpheme) => {
    if (mode === 'sentence' || mode === 'result') return;
    setSelectedSuffix(selectedSuffix?.id === suf.id ? null : suf);
  };

  const handleJudge = (guessedReal: boolean) => {
    const actuallyReal = isInWordKey || dict.isRealWord === true;
    const correct      = guessedReal === actuallyReal;
    addProgressEntry({
      studentId: 'guest', matrixId, word: surface,
      isRealWord: guessedReal, actuallyReal, correct,
      timeSpentMs: Date.now() - startTimeRef.current,
    });
    setRevealed(true);
    setLastResult({
      word: surface, correct, isReal: actuallyReal,
      definition: wordKeyEntry?.definition ?? dict.definition?.definition,
      example:    wordKeyEntry?.example    ?? dict.definition?.example,
    });
    if (actuallyReal && !guessedReal) { setMode('judge-retry'); return; }
    if (actuallyReal) {
      const correctDef = wordKeyEntry?.definition ?? dict.definition?.definition ?? '';
      if (correctDef) {
        setMeaningOpts({ correct: correctDef, distractor: pickDistractor(correctDef, getAllMatrices()) });
        setMode('meaning-check');
      } else {
        setMode('sentence');
      }
    } else {
      setMode('result');
    }
  };

  const handleRetryReal = () => {
    const correctDef = wordKeyEntry?.definition ?? dict.definition?.definition ?? '';
    if (correctDef) {
      setMeaningOpts({ correct: correctDef, distractor: pickDistractor(correctDef, getAllMatrices()) });
      setMode('meaning-check');
    } else {
      setMode('sentence');
    }
  };

  const handleMeaningDone = () => setMode('sentence');

  const handleSentenceDone = (sentence: string) => {
    setWordsMade((prev) => [...prev, { word: surface, sentence: sentence || undefined }]);
    setLastResult((prev) => prev ? { ...prev, sentence } : prev);
    setMode('result');
  };

  useEffect(() => {
    if (mode === 'result' && lastResult && !lastResult.isReal) {
      setWordsMade((prev) => {
        if (prev.some((w) => w.word === surface)) return prev;
        return [...prev, { word: surface }];
      });
    }
  }, [mode]); // eslint-disable-line

  const hasWord = !!selectedBase;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button onClick={onBack}
            className="text-gray-400 hover:text-gray-700 font-bold flex items-center gap-1 text-sm shrink-0">
            ← Back
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{matrix.icon ?? '🔤'}</span>
            <div className="min-w-0">
              <div className="font-extrabold text-gray-800 text-lg leading-none">{matrix.name}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5 truncate">
                means "{matrix.description}"
              </div>
            </div>
          </div>
          {wordsMade.length > 0 && (
            <div className="shrink-0 text-right text-sm">
              <span className="font-extrabold text-emerald-600">{wordsMade.length}</span>
              <span className="text-gray-400 ml-1">word{wordsMade.length !== 1 ? 's' : ''} built</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-3 py-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-start">

          {/* ══ LEFT: Slots + chip grid (sticky) ═══════════════════════════════ */}
          <div className="md:sticky md:top-20 md:w-64 lg:w-72 shrink-0 space-y-4">

            {/* Slots card */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-4">

              {/* Prefix meaning badge */}
              <div className="flex items-center justify-center gap-2 bg-sky-50 border border-sky-200 rounded-2xl px-3 py-2">
                <span className="text-xl font-black text-sky-700">{fixedPrefix.text}-</span>
                <span className="text-sm text-gray-500 font-medium italic">"{fixedPrefix.meaning}"</span>
              </div>

              {/* Slot row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Prefix slot — fixed / locked */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-sky-500 uppercase tracking-wider">Prefix ★</div>
                  <div className="w-full rounded-2xl border-2 px-2 py-3 text-center font-black text-lg
                    bg-sky-500 text-white border-sky-600 shadow shadow-sky-200 select-none">
                    {fixedPrefix.text}-
                  </div>
                </div>

                {/* Base slot */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Base</div>
                  <div className={`w-full rounded-2xl border-2 px-2 py-3 text-center font-black
                    transition-all min-h-[52px] flex items-center justify-center ${
                      selectedBase
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow shadow-emerald-200 text-lg'
                        : 'border-dashed border-emerald-300 bg-emerald-50 text-emerald-300 text-sm'
                    }`}>
                    {selectedBase ? selectedBase.text : '?'}
                  </div>
                </div>

                {/* Suffix slot */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">Suffix</div>
                  <div className={`w-full rounded-2xl border-2 px-2 py-3 text-center font-black
                    transition-all min-h-[52px] flex items-center justify-center relative ${
                      selectedSuffix
                        ? 'bg-amber-500 text-white border-amber-600 shadow shadow-amber-200 text-lg'
                        : 'border-dashed border-amber-200 bg-amber-50 text-amber-200 text-sm'
                    }`}>
                    {selectedSuffix ? (
                      <>
                        -{selectedSuffix.text}
                        {mode !== 'sentence' && mode !== 'result' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedSuffix(null); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                              bg-amber-700 text-white flex items-center justify-center text-xs">
                            ×
                          </button>
                        )}
                      </>
                    ) : (
                      matrix.suffixes.length > 0 ? 'opt.' : '—'
                    )}
                  </div>
                </div>
              </div>

              {/* Clear */}
              {hasWord && mode !== 'sentence' && mode !== 'result' && (
                <div className="text-center pt-1">
                  <button onClick={resetToIdle}
                    className="text-xs text-gray-300 hover:text-gray-500 transition flex items-center gap-1 mx-auto">
                    <XCircle className="w-3 h-3" /> clear
                  </button>
                </div>
              )}
            </div>

            {/* Base chips */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-2">
              <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                Choose a base word
              </div>
              <div className="flex flex-wrap gap-2">
                {matrix.bases.map((base) => {
                  const isSel    = selectedBase?.id === base.id;
                  const isLocked = (mode === 'sentence' || mode === 'result') && !isSel;
                  return (
                    <button key={base.id} onClick={() => handleSelectBase(base)}
                      disabled={isLocked} title={base.meaning}
                      className={`px-3 py-2 rounded-2xl border-2 font-extrabold text-sm
                        transition-all active:scale-95 ${
                          isLocked
                            ? 'opacity-30 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                            : isSel
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow shadow-emerald-200 scale-105'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:scale-105'
                        }`}>
                      {base.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suffix chips */}
            {matrix.suffixes.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-2">
                <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                  Add a suffix{' '}
                  <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matrix.suffixes.map((suf) => {
                    const isSel    = selectedSuffix?.id === suf.id;
                    const isLocked = !selectedBase || mode === 'sentence' || mode === 'result';
                    return (
                      <button key={suf.id} onClick={() => handleSelectSuffix(suf)}
                        disabled={isLocked} title={suf.meaning}
                        className={`px-3 py-2 rounded-2xl border-2 font-extrabold text-sm
                          transition-all active:scale-95 ${
                            isLocked
                              ? 'opacity-30 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                              : isSel
                              ? 'bg-amber-500 text-white border-amber-600 shadow shadow-amber-200 scale-105'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:scale-105'
                          }`}>
                        -{suf.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Words made this session */}
            {wordsMade.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-extrabold text-amber-800 uppercase tracking-wide text-xs">
                    Words You've Built
                  </span>
                  <span className="ml-auto text-xs font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                    {wordsMade.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wordsMade.map(({ word, sentence }, i) => (
                    <div key={`${word}-${i}`}
                      className="bg-white border border-amber-200 rounded-xl px-2.5 py-1 text-xs"
                      title={sentence ?? ''}>
                      <span className="font-bold text-gray-800">{word}</span>
                      {sentence && <span className="text-gray-400 ml-1 italic">✏️</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT: Word display + action panel (mirrors StudentPlayground) ══ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Word display card — shown whenever a base is selected ── */}
            {hasWord && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-6">
                {parts.length === 0 || !selectedBase ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-2">👆</div>
                    <p className="text-gray-400 text-sm font-medium">
                      Tap a base word to build!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {/* Big assembled word */}
                    <div className={`text-5xl font-black tracking-wide leading-none transition-colors duration-300 ${
                      revealed
                        ? lastResult?.isReal ? 'text-emerald-600' : 'text-purple-500'
                        : 'text-gray-800'
                    }`}>
                      {surface}
                    </div>

                    {/* Morpheme breakdown */}
                    {parts.length > 1 && (
                      <div className="flex items-start gap-1 justify-center flex-wrap">
                        {parts.map((part, i) => {
                          const bg = part.type === 'prefix' ? 'bg-sky-100'     : part.type === 'base' ? 'bg-emerald-100' : 'bg-amber-100';
                          const tc = part.type === 'prefix' ? 'text-sky-700'   : part.type === 'base' ? 'text-emerald-700' : 'text-amber-700';
                          return (
                            <React.Fragment key={part.id}>
                              {i > 0 && <span className="text-gray-300 font-bold text-xl self-center mx-0.5">+</span>}
                              <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${bg} min-w-[52px]`}>
                                <span className={`text-base font-black ${tc}`}>{part.text}</span>
                                <span className={`text-sm font-semibold ${tc} opacity-80 text-center leading-tight mt-0.5`}>
                                  {part.meaning}
                                </span>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {/* Spelling tip */}
                    {spellingRule && selectedSuffix && (
                      <SpellingTip rule={spellingRule} base={selectedBase.text}
                        suffix={selectedSuffix.text} surface={surface} />
                    )}

                    {/* Reveal badge */}
                    {revealed && (
                      <div className={`text-sm font-bold px-4 py-1.5 rounded-2xl ${
                        lastResult?.isReal
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {lastResult?.isReal ? '✅ Real word!' : '🔮 Made-up word!'}
                      </div>
                    )}
                  </div>
                )}

                {/* Speak button */}
                {isSupported && surface.length > 1 && (
                  <div className="flex justify-center mt-3">
                    <button onClick={() => speak(surface)}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition">
                      <Volume2 className="w-4 h-4" /> Hear it
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Idle prompt — no base selected yet ── */}
            {mode === 'idle' && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8
                flex flex-col items-center justify-center gap-4 text-center">
                <div className="text-5xl">👈</div>
                <h2 className="text-xl font-extrabold text-gray-700">Pick a base word!</h2>
                <p className="text-gray-400 text-base leading-relaxed max-w-xs">
                  Tap any base word on the left to build a word with{' '}
                  <span className="font-black text-sky-600">{fixedPrefix.text}-</span>.
                  Then decide if it's a{' '}
                  <span className="font-bold text-emerald-600">real word</span> or{' '}
                  <span className="font-bold text-purple-500">made up</span>!
                </p>
                <div className="px-4 py-2 rounded-2xl border bg-sky-50 border-sky-200
                  text-sm font-semibold text-sky-700">
                  {fixedPrefix.text}- means "{fixedPrefix.meaning}"
                </div>
              </div>
            )}

            {/* ── Judge buttons ── */}
            {mode === 'judge' && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-center text-lg font-extrabold text-gray-600">
                  Is <span className="text-gray-800 italic">{surface}</span> a real word?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleJudge(true)}
                    className="flex-1 py-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50
                      text-emerald-700 font-extrabold text-lg hover:bg-emerald-500 hover:text-white
                      hover:border-emerald-500 transition-all active:scale-95">
                    ✅ Real!
                  </button>
                  <button onClick={() => handleJudge(false)}
                    className="flex-1 py-4 rounded-2xl border-2 border-purple-200 bg-purple-50
                      text-purple-700 font-extrabold text-lg hover:bg-purple-500 hover:text-white
                      hover:border-purple-500 transition-all active:scale-95">
                    🔮 Made-Up!
                  </button>
                </div>
              </div>
            )}

            {/* ── Judge retry ── */}
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
                <button onClick={handleRetryReal}
                  className="w-full py-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50
                    text-emerald-700 font-extrabold text-lg hover:bg-emerald-500 hover:text-white
                    hover:border-emerald-500 transition-all active:scale-95">
                  ✅ You're right, it's Real!
                </button>
              </div>
            )}

            {/* ── Meaning check ── */}
            {mode === 'meaning-check' && meaningOpts && (
              <MeaningChecker
                word={surface}
                correct={meaningOpts.correct}
                distractor={meaningOpts.distractor}
                onCorrect={handleMeaningDone}
              />
            )}

            {/* ── Sentence writing ── */}
            {mode === 'sentence' && lastResult && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-5">
                <SentenceWriter
                  word={lastResult.word}
                  definition={lastResult.definition}
                  example={lastResult.example}
                  onDone={(sentence, passed) => handleSentenceDone(sentence)}
                />
              </div>
            )}

            {/* ── Result ── */}
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
                <button onClick={resetToIdle}
                  className="inline-flex items-center gap-2 px-6 py-3 mt-1 rounded-2xl
                    bg-sky-500 text-white font-extrabold text-base hover:bg-sky-600
                    active:scale-95 transition-all">
                  <RefreshCw className="w-4 h-4" /> Try Another
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
