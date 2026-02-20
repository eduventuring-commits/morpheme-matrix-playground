import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Info } from 'lucide-react';
import { Card, Button, Badge, SectionHeader } from '../shared/UI';
import { useStore } from '../../context/store';
import type { Morpheme, MorphemeMatrix, WordKeyEntry } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const COLOR_OPTIONS = [
  { key: 'blue',   label: 'Blue',   class: 'bg-blue-500' },
  { key: 'green',  label: 'Green',  class: 'bg-green-500' },
  { key: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { key: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { key: 'pink',   label: 'Pink',   class: 'bg-pink-500' },
  { key: 'teal',   label: 'Teal',   class: 'bg-teal-500' },
];

const ICONS = ['📚','🧠','🌟','🎯','🔬','🏛️','🌍','💡','🔢','🎨','🌈','🦋','🚀','⚡','🎵'];

type MorphemeField = { text: string; meaning: string; origin: string };

interface MorphemeListEditorProps {
  label: string;
  type: 'prefix' | 'base' | 'suffix';
  morphemes: Morpheme[];
  onChange: (morphemes: Morpheme[]) => void;
  dotColor: string;
}

const MorphemeListEditor: React.FC<MorphemeListEditorProps> = ({ label, type, morphemes, onChange, dotColor }) => {
  const [newItem, setNewItem] = useState<MorphemeField>({ text: '', meaning: '', origin: '' });

  const add = () => {
    if (!newItem.text.trim() || !newItem.meaning.trim()) return;
    onChange([...morphemes, {
      id: uuidv4(),
      text: newItem.text.trim().toLowerCase(),
      meaning: newItem.meaning.trim(),
      origin: newItem.origin.trim() || undefined,
      type,
    } as Morpheme]);
    setNewItem({ text: '', meaning: '', origin: '' });
  };

  const remove = (id: string) => onChange(morphemes.filter((m) => m.id !== id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">{label}</h4>
        <Badge color="gray">{morphemes.length}</Badge>
      </div>

      {/* Existing */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        {morphemes.map((m) => (
          <div key={m.id} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-sm group">
            <span className="font-bold">{m.text}</span>
            <span className="text-gray-400 text-xs">({m.meaning})</span>
            <button
              onClick={() => remove(m.id)}
              className="text-gray-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {morphemes.length === 0 && (
          <span className="text-gray-300 text-sm italic">None yet — add some below</span>
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder={type === 'prefix' ? 'e.g. re' : type === 'base' ? 'e.g. play' : 'e.g. ing'}
          value={newItem.text}
          onChange={(e) => setNewItem((p) => ({ ...p, text: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="w-24 border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none font-mono font-bold"
        />
        <input
          type="text"
          placeholder="meaning (e.g. again)"
          value={newItem.meaning}
          onChange={(e) => setNewItem((p) => ({ ...p, meaning: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 min-w-[120px] border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="origin (Latin, Greek…)"
          value={newItem.origin}
          onChange={(e) => setNewItem((p) => ({ ...p, origin: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="w-28 border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
        />
        <Button size="sm" onClick={add} icon={<Plus className="w-3 h-3" />}>
          Add
        </Button>
      </div>
    </div>
  );
};

// ─── Word Key Editor ──────────────────────────────────────────────────────────

interface WordKeyEditorProps {
  entries: WordKeyEntry[];
  onChange: (entries: WordKeyEntry[]) => void;
}

const WordKeyEditor: React.FC<WordKeyEditorProps> = ({ entries, onChange }) => {
  const [newWord, setNewWord]       = useState('');
  const [newDef, setNewDef]         = useState('');
  const [newPos, setNewPos]         = useState('');
  const [newExample, setNewExample] = useState('');

  const add = () => {
    if (!newWord.trim() || !newDef.trim()) return;
    onChange([...entries, {
      word: newWord.trim().toLowerCase(),
      definition: newDef.trim(),
      partOfSpeech: newPos.trim() || undefined,
      example: newExample.trim() || undefined,
    }]);
    setNewWord(''); setNewDef(''); setNewPos(''); setNewExample('');
  };

  const remove = (word: string) => onChange(entries.filter((e) => e.word !== word));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-amber-500" />
        <p className="text-sm text-gray-500">
          These are the <strong>real words</strong> students can make with your matrix. Students' guesses are checked against this list.
        </p>
      </div>

      {entries.length > 0 && (
        <div className="border rounded-xl overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Word</th>
                <th className="px-3 py-2 text-left">Part of Speech</th>
                <th className="px-3 py-2 text-left">Definition</th>
                <th className="px-3 py-2 text-left">Example</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.word} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-bold font-mono">{e.word}</td>
                  <td className="px-3 py-2 text-gray-500 italic text-xs">{e.partOfSpeech ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{e.definition}</td>
                  <td className="px-3 py-2 text-gray-400 italic text-xs">{e.example ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => remove(e.word)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input type="text" placeholder="Word *" value={newWord} onChange={(e) => setNewWord(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-primary-400 focus:outline-none font-mono font-bold" />
        <input type="text" placeholder="noun / verb / adj" value={newPos} onChange={(e) => setNewPos(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-primary-400 focus:outline-none" />
        <input type="text" placeholder="Definition *" value={newDef} onChange={(e) => setNewDef(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-primary-400 focus:outline-none col-span-2 sm:col-span-1" />
        <input type="text" placeholder="Example sentence" value={newExample} onChange={(e) => setNewExample(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-primary-400 focus:outline-none col-span-2 sm:col-span-1" />
        <Button onClick={add} className="col-span-2 sm:col-span-4" fullWidth icon={<Plus className="w-4 h-4" />}>
          Add Word to Key
        </Button>
      </div>
    </div>
  );
};

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface MatrixEditorProps {
  matrixId: string | null;  // null = create new
  onSave: () => void;
  onCancel: () => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({ matrixId, onSave, onCancel }) => {
  const { getMatrixById, addMatrix, updateMatrix } = useStore();

  const existing = matrixId ? getMatrixById(matrixId) : null;

  const [name, setName]           = useState(existing?.name ?? '');
  const [description, setDesc]    = useState(existing?.description ?? '');
  const [gradeLevel, setGrade]    = useState<string[]>(existing?.gradeLevel ?? ['3']);
  const [prefixes, setPrefixes]   = useState<Morpheme[]>(existing?.prefixes ?? []);
  const [bases, setBases]         = useState<Morpheme[]>(existing?.bases ?? []);
  const [suffixes, setSuffixes]   = useState<Morpheme[]>(existing?.suffixes ?? []);
  const [wordKey, setWordKey]     = useState<WordKeyEntry[]>(existing?.wordKey ?? []);
  const [color, setColor]         = useState(existing?.color ?? 'blue');
  const [icon, setIcon]           = useState(existing?.icon ?? '📚');
  const [tags, setTags]           = useState((existing?.tags ?? []).join(', '));

  const toggleGrade = (g: string) => {
    setGrade((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (bases.length === 0) { alert('Please add at least one base word.'); return; }

    const matrix = {
      name: name.trim(),
      description: description.trim(),
      gradeLevel,
      prefixes,
      bases,
      suffixes,
      wordKey,
      color,
      icon,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdBy: 'teacher',
    };

    if (matrixId && existing && !existing.createdBy?.startsWith('system')) {
      updateMatrix(matrixId, matrix);
    } else {
      addMatrix(matrix);
    }
    onSave();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-xl text-gray-800">
              {matrixId ? '✏️ Edit Matrix' : '✨ Create New Matrix'}
            </h1>
            <p className="text-gray-500 text-sm">Design a set of morphemes for your students</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} icon={<X className="w-4 h-4" />}>Cancel</Button>
            <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>Save Matrix</Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Basic info */}
        <Card padding="lg">
          <SectionHeader title="Matrix Info" icon="📋" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Matrix Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Action Words with Re- and Un-"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-primary-400 focus:outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. prefix, verbs, science"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What will students explore with this matrix?"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-primary-400 focus:outline-none resize-none"
                rows={2}
              />
            </div>

            {/* Grade, color, icon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Grade Levels</label>
                <div className="flex gap-1 flex-wrap">
                  {['2','3','4','5','6'].map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleGrade(g)}
                      className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                        gradeLevel.includes(g) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Color Theme</label>
                <div className="flex gap-1 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setColor(c.key)}
                      title={c.label}
                      className={`w-8 h-8 rounded-lg ${c.class} transition-all ${
                        color === c.key ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Icon</label>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`text-xl p-1 rounded-lg transition-all ${
                        icon === ic ? 'bg-primary-100 ring-2 ring-primary-400' : 'hover:bg-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Morpheme editors */}
        <Card padding="lg">
          <SectionHeader title="Morphemes" icon="🧩" subtitle="Add your prefixes, base words, and suffixes" />
          <div className="space-y-6">
            <MorphemeListEditor label="Prefixes (Beginning)" type="prefix" morphemes={prefixes} onChange={setPrefixes} dotColor="bg-sky-400" />
            <hr className="border-gray-100" />
            <MorphemeListEditor label="Base Words (Core) *" type="base" morphemes={bases} onChange={setBases} dotColor="bg-emerald-400" />
            <hr className="border-gray-100" />
            <MorphemeListEditor label="Suffixes (Ending)" type="suffix" morphemes={suffixes} onChange={setSuffixes} dotColor="bg-amber-400" />
          </div>
        </Card>

        {/* Word key */}
        <Card padding="lg">
          <SectionHeader title="Word Key" icon="📖" subtitle="Real words students can discover in this matrix" />
          <WordKeyEditor entries={wordKey} onChange={setWordKey} />
        </Card>

        {/* Save */}
        <div className="flex gap-3 pb-8">
          <Button fullWidth size="lg" onClick={handleSave} icon={<Save className="w-5 h-5" />}>
            Save Matrix
          </Button>
          <Button variant="secondary" size="lg" onClick={onCancel} icon={<X className="w-5 h-5" />}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
