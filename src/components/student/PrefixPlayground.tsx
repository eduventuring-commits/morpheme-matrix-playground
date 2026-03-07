import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, CheckCircle2, AlertCircle, PenLine, BookOpen, XCircle,
} from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';
import { useDictionary } from '../../hooks/useDictionary';
import { useStore } from '../../context/store';
import type { Morpheme, MorphemeMatrix, BuiltWord, SpellingRule } from '../../types';
import { wordSurface, normalizedResult, matchesWordKey } from '../../types';
import { PREFIX_MATRICES } from '../../data/prefixMatrices';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode =
  | 'idle'          // no base selected yet
  | 'judge'         // base chosen, awaiting Real / Made-Up
  | 'judge-retry'   // said Made-Up but it's real — show correction
  | 'meaning-check' // judged real — pick the right definition
  | 'sentence'      // write a sentence
  | 'result';       // finished — ready to try another

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

  const verbHints = /\b(is|are|was|were|has|have|had|will|can|could|should|would|do|does|did|make|makes|made|see|saw|go|goes|went|come|came|think|thought|know|knew|feel|felt|look|looks|looked|want|wanted|need|needs|needed|get|gets|got|use|uses|used|find|finds|found|help|helps|helped|seem|seems|seemed|become|becomes|became|keep|keeps|kept|give|gives|gave|take|takes|took|run|runs|ran|put|puts|set|show|shows|showed|move|moves|moved|live|lives|lived|mean|means|meant|call|calls|called|ask|asks|asked|turn|turns|turned|learn|learns|learned|read|try|tried|tries|write|writes|wrote|work|works|worked|play|plays|played|build|builds|built|carry|carries|carried|bring|brings|brought|start|starts|started|stop|stops|stopped|let|happen|happens|happened|love|loves|loved|like|likes|liked|say|says|said|tell|tells|told|include|includes|included|send|sends|sent|receive|receives|received|cause|causes|caused|allow|allows|allowed|change|changes|changed|create|creates|created|protect|protects|protected|connect|connects|connected|describe|describes|described|explain|explains|explained|prevent|prevents|prevented|support|supports|supported|require|requires|required|contain|contains|contained|affect|affects|affected|provide|provides|provided)\b/i;
  const hasVerb = verbHints.test(trimmed) || trimmed.toLowerCase().includes(word.toLowerCase());
  if (!hasVerb)
    return { ok: false, feedback: 'Great start! Try to include a verb (an action or being word).' };

  return { ok: true, feedback: 'Great sentence! 🌟' };
}

// ─── SpellingTip ──────────────────────────────────────────────────────────────

const SPELLING_TIPS: Record<SpellingRule & string, string> = {
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
      <span className="text-amber-500 font-normal">
        ({base} + {suffix} → {surface})
      </span>
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
          {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
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

  const matrix     = PREFIX_MATRICES.find((m) => m.id === matrixId);
  const fixedPrefix = matrix?.prefixes[0];

  const [selectedBase,   setSelectedBase]   = useState<Morpheme | null>(null);
  const [selectedSuffix, setSelectedSuffix] = useState<Morpheme | null>(null);
  const [mode,           setMode]           = useState<PanelMode>('idle');
  const [revealed,       setRevealed]       = useState(false);
  const [lastResult,     setLastResult]     = useState<ResultData | null>(null);
  const [meaningOpts,    setMeaningOpts]    = useState<{ correct: string; distractor: string } | null>(null);
  const [wordsMade,      setWordsMade]      = useState<{ word: string; sentence?: string }[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  // Rebuild the BuiltWord whenever selection changes
  const built: BuiltWord = {
    prefix: fixedPrefix,
    base:   selectedBase  ?? undefined,
    suffix: selectedSuffix ?? undefined,
  };

  const raw          = wordSurface(built);
  const normResult   = normalizedResult(built);
  const surface      = normResult.surface || raw;
  const spellingRule = normResult.rule;

  const wordKeyEntry = matrix?.wordKey.find((w) => matchesWordKey(built, w.word));
  const isInWordKey  = !!wordKeyEntry;

  // Dict lookup whenever surface changes
  useEffect(() => {
    if (surface && surface.length >= 2 && mode !== 'result') dict.lookup(surface);
  }, [surface, mode]); // eslint-disable-line

  if (!matrix || !fixedPrefix) {
    return <div className="p-8 text-red-500">Prefix matrix not found.</div>;
  }

  // ── Interaction handlers ────────────────────────────────────────────────────

  const resetToIdle = () => {
    setSelectedBase(null);
    setSelectedSuffix(null);
    setMode('idle');
    setRevealed(false);
    setLastResult(null);
    setMeaningOpts(null);
  };

  const handleSelectBase = (base: Morpheme) => {
    if (mode === 'sentence' || mode === 'result') return; // locked
    if (selectedBase?.id === base.id) {
      // deselect
      resetToIdle();
    } else {
      setSelectedBase(base);
      setSelectedSuffix(null);
      setMode('judge');
      setRevealed(false);
      setLastResult(null);
      setMeaningOpts(null);
      startTimeRef.current = Date.now();
    }
  };

  const handleSelectSuffix = (suf: Morpheme) => {
    if (mode === 'sentence' || mode === 'result') return;
    if (selectedSuffix?.id === suf.id) {
      setSelectedSuffix(null);
    } else {
      setSelectedSuffix(suf);
    }
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

  // Track made-up words when landing on result
  useEffect(() => {
    if (mode === 'result' && lastResult && !lastResult.isReal) {
      setWordsMade((prev) => {
        if (prev.some((w) => w.word === surface)) return prev;
        return [...prev, { word: surface }];
      });
    }
  }, [mode]); // eslint-disable-line

  // ── Derived ─────────────────────────────────────────────────────────────────

  // Color theme for the prefix
  const prefixColor = {
    pill:   'bg-sky-500 text-white border-sky-600',
    ring:   'ring-sky-300',
    text:   'text-sky-700',
    light:  'bg-sky-50 border-sky-200',
    chip:   'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200',
    chipSel:'bg-sky-500 text-white border-sky-600 shadow shadow-sky-200',
  };

  const parts = [built.prefix, built.base, built.suffix].filter(Boolean) as Morpheme[];

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
          <div className="flex items-center gap-3 min-w-0">
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

          {/* ══ LEFT: Builder + chip grid ════════════════════════════════════════ */}
          <div className="md:sticky md:top-20 md:w-72 lg:w-80 shrink-0 space-y-4">

            {/* Word builder card */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-4">

              {/* Prefix label */}
              <div className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2 ${prefixColor.light} border`}>
                <span className={`text-2xl font-black ${prefixColor.text}`}>{fixedPrefix.text}-</span>
                <span className="text-sm text-gray-500 font-medium italic">"{fixedPrefix.meaning}"</span>
                <span className="ml-auto text-xs text-sky-400 font-bold uppercase tracking-widest">FIXED</span>
              </div>

              {/* Slot row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Prefix slot (fixed) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-sky-500 uppercase tracking-wider">Prefix</div>
                  <div className={`w-full rounded-2xl border-2 px-2 py-3 text-center
                    font-black text-lg ${prefixColor.pill} select-none`}>
                    {fixedPrefix.text}-
                  </div>
                </div>

                {/* Base slot */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Base</div>
                  <div className={`w-full rounded-2xl border-2 px-2 py-3 text-center font-black text-lg
                    transition-all ${selectedBase
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow shadow-emerald-200'
                      : 'border-dashed border-emerald-300 bg-emerald-50 text-emerald-300 text-sm font-medium'}`}>
                    {selectedBase ? selectedBase.text : '?'}
                  </div>
                </div>

                {/* Suffix slot */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">Suffix</div>
                  <div className={`w-full rounded-2xl border-2 px-2 py-3 text-center font-black text-lg
                    transition-all relative ${selectedSuffix
                      ? 'bg-amber-500 text-white border-amber-600 shadow shadow-amber-200'
                      : 'border-dashed border-amber-200 bg-amber-50 text-amber-200 text-sm font-medium'}`}>
                    {selectedSuffix ? (
                      <>
                        -{selectedSuffix.text}
                        {mode !== 'sentence' && mode !== 'result' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedSuffix(null); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                              bg-amber-700 text-white flex items-center justify-center text-xs leading-none">
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

              {/* Formed word display */}
              {selectedBase ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  {/* Big word */}
                  <div className={`text-4xl font-black tracking-wide leading-none transition-colors duration-300 ${
                    revealed
                      ? lastResult?.isReal ? 'text-emerald-600' : 'text-purple-500'
                      : 'text-gray-800'
                  }`}>
                    {surface}
                  </div>

                  {/* Part breakdown */}
                  {parts.length > 1 && (
                    <div className="flex items-start gap-1 justify-center flex-wrap">
                      {parts.map((part, i) => {
                        const bg   = part.type === 'prefix' ? 'bg-sky-100'     : part.type === 'base' ? 'bg-emerald-100' : 'bg-amber-100';
                        const tc   = part.type === 'prefix' ? 'text-sky-700'   : part.type === 'base' ? 'text-emerald-700' : 'text-amber-700';
                        return (
                          <React.Fragment key={part.id}>
                            {i > 0 && <span className="text-gray-300 font-bold text-lg self-center mx-0.5">+</span>}
                            <div className={`flex flex-col items-center rounded-xl px-3 py-1.5 ${bg} min-w-[48px]`}>
                              <span className={`text-sm font-black ${tc}`}>{part.text}</span>
                              <span className={`text-xs font-semibold ${tc} opacity-70 text-center leading-tight`}>
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

                  {/* Revealed badge */}
                  {revealed && (
                    <div className={`text-sm font-bold px-4 py-1.5 rounded-2xl ${
                      lastResult?.isReal
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {lastResult?.isReal ? '✅ Real word!' : '🔮 Made-up word!'}
                    </div>
                  )}

                  {/* TTS button */}
                  {isSupported && surface.length > 1 && (
                    <button onClick={() => speak(surface)}
                      className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-600 transition-colors">
                      <Volume2 className="w-3 h-3" /> Hear it
                    </button>
                  )}

                  {/* Clear button (only when not locked) */}
                  {mode !== 'sentence' && mode !== 'result' && (
                    <button onClick={resetToIdle}
                      className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 transition-colors">
                      <XCircle className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center gap-2">
                  <div className="text-3xl">👇</div>
                  <p className="text-gray-400 text-sm font-medium leading-snug">
                    Tap a base word below<br />to build a word!
                  </p>
                </div>
              )}
            </div>

            {/* Base word chips */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-2">
              <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1">
                Choose a base word
              </div>
              <div className="flex flex-wrap gap-2">
                {matrix.bases.map((base) => {
                  const isSelected = selectedBase?.id === base.id;
                  const isLocked   = (mode === 'sentence' || mode === 'result') && !isSelected;
                  return (
                    <button
                      key={base.id}
                      onClick={() => handleSelectBase(base)}
                      disabled={isLocked}
                      title={base.meaning}
                      className={`px-3 py-2 rounded-2xl border-2 font-extrabold text-base
                        transition-all active:scale-95 ${
                          isLocked
                            ? 'opacity-30 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                            : isSelected
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow shadow-emerald-200 scale-105'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:scale-105'
                        }`}
                    >
                      {base.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suffix chips (only if matrix has suffixes) */}
            {matrix.suffixes.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4 space-y-2">
                <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1">
                  Add a suffix <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matrix.suffixes.map((suf) => {
                    const isSelected = selectedSuffix?.id === suf.id;
                    const isLocked   = !selectedBase || mode === 'sentence' || mode === 'result';
                    return (
                      <button
                        key={suf.id}
                        onClick={() => handleSelectSuffix(suf)}
                        disabled={isLocked}
                        title={suf.meaning}
                        className={`px-3 py-2 rounded-2xl border-2 font-extrabold text-base
                          transition-all active:scale-95 ${
                            isLocked
                              ? 'opacity-30 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                              : isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow shadow-amber-200 scale-105'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:scale-105'
                          }`}
                      >
                        -{suf.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Words made this session */}
            {wordsMade.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4">
                <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                  Words you've built ✨
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordsMade.map(({ word }, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200
                      rounded-2xl text-sm font-bold text-emerald-700">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT: Judge / Sentence / Result panel ════════════════════════════ */}
          <div className="flex-1 min-w-0">

            {mode === 'idle' && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8
                flex flex-col items-center justify-center gap-4 text-center">
                <div className="text-5xl">👈</div>
                <h2 className="text-xl font-extrabold text-gray-700">Pick a base word!</h2>
                <p className="text-gray-400 text-base leading-relaxed max-w-xs">
                  Tap any base word on the left to build a word with the prefix{' '}
                  <span className="font-black text-sky-600">{fixedPrefix.text}-</span>.
                  Then decide if it's a <span className="font-bold text-emerald-600">real word</span> or{' '}
                  <span className="font-bold text-purple-500">made up</span>!
                </p>
                {/* Quick category hint */}
                <div className={`px-4 py-2 rounded-2xl border text-sm font-semibold ${prefixColor.light} ${prefixColor.text}`}>
                  {fixedPrefix.text}- means "{fixedPrefix.meaning}"
                </div>
              </div>
            )}

            {mode === 'judge' && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 space-y-5">
                <div className="text-center space-y-1">
                  <div className="text-4xl font-black text-gray-800 tracking-wide">{surface}</div>
                  <p className="text-gray-500 text-base font-medium">
                    Is <span className="font-black text-gray-700 italic">{surface}</span> a real English word?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleJudge(true)}
                    className="py-5 rounded-3xl bg-emerald-500 text-white font-extrabold text-xl
                      hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-200
                      flex flex-col items-center gap-1">
                    <span className="text-3xl">✅</span>
                    Real Word!
                  </button>
                  <button onClick={() => handleJudge(false)}
                    className="py-5 rounded-3xl bg-purple-500 text-white font-extrabold text-xl
                      hover:bg-purple-600 active:scale-95 transition-all shadow-lg shadow-purple-200
                      flex flex-col items-center gap-1">
                    <span className="text-3xl">🔮</span>
                    Made Up!
                  </button>
                </div>
                <p className="text-center text-xs text-gray-400 font-medium">
                  Think about the word parts — does {fixedPrefix.text}- + {selectedBase?.text}{selectedSuffix ? ` + -${selectedSuffix.text}` : ''} make sense?
                </p>
              </div>
            )}

            {mode === 'judge-retry' && lastResult && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🤔</div>
                  <h3 className="text-xl font-extrabold text-orange-800">
                    Actually, <span className="italic">{lastResult.word}</span> IS a real word!
                  </h3>
                  {lastResult.definition && (
                    <p className="text-orange-700 text-sm font-medium leading-snug">
                      It means: {lastResult.definition}
                    </p>
                  )}
                </div>
                <button onClick={handleRetryReal}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-lg
                    hover:bg-emerald-600 active:scale-95 transition-all">
                  ✅ You're right, it's Real!
                </button>
              </div>
            )}

            {mode === 'meaning-check' && meaningOpts && (
              <MeaningChecker
                word={surface}
                correct={meaningOpts.correct}
                distractor={meaningOpts.distractor}
                onCorrect={handleMeaningDone}
              />
            )}

            {mode === 'sentence' && (
              <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6">
                <SentenceWriter
                  word={surface}
                  definition={lastResult?.definition}
                  example={lastResult?.example}
                  onDone={(sentence, passed) => handleSentenceDone(sentence)}
                />
              </div>
            )}

            {mode === 'result' && lastResult && (
              <div className={`rounded-3xl border-2 p-6 space-y-4 ${
                lastResult.correct
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="text-4xl">
                    {lastResult.correct ? '🎉' : '💡'}
                  </div>
                  <div className="text-3xl font-black text-gray-800">{lastResult.word}</div>
                  <div className={`text-lg font-extrabold ${
                    lastResult.isReal ? 'text-emerald-700' : 'text-purple-600'
                  }`}>
                    {lastResult.isReal ? '✅ Real word!' : '🔮 Made-up word!'}
                  </div>
                </div>

                {/* Definition */}
                {lastResult.isReal && lastResult.definition && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Meaning</div>
                    <div className="text-gray-700 font-medium leading-snug">{lastResult.definition}</div>
                    {lastResult.example && (
                      <div className="text-sm text-gray-500 italic mt-1">"{lastResult.example}"</div>
                    )}
                  </div>
                )}

                {/* Sentence they wrote */}
                {lastResult.sentence && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your sentence</div>
                    <div className="text-gray-700 font-medium leading-snug italic">"{lastResult.sentence}"</div>
                  </div>
                )}

                {/* Try another */}
                <button onClick={resetToIdle}
                  className="w-full py-4 rounded-2xl bg-sky-500 text-white font-extrabold text-lg
                    hover:bg-sky-600 active:scale-95 transition-all">
                  Try another word! 🔄
                </button>

                {/* Words made */}
                {wordsMade.length > 0 && (
                  <div className="text-center text-sm text-gray-400">
                    You've built <span className="font-bold text-emerald-600">{wordsMade.length}</span> word{wordsMade.length !== 1 ? 's' : ''} so far!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
