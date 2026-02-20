import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  source: 'api' | 'wordkey' | 'cache';
}

interface DictionaryCache {
  [word: string]: DictionaryDefinition | null;  // null = known non-word
}

// ─── Module-level cache (survives component re-renders) ───────────────────────

const globalCache: DictionaryCache = {};

// ─── Free Dictionary API fetcher ──────────────────────────────────────────────

async function fetchFromApi(word: string): Promise<DictionaryDefinition | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
    );
    if (!res.ok) return null;      // 404 = not a word

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    // Walk through meanings to find the first definition
    for (const meaning of (entry.meanings ?? [])) {
      const def = meaning.definitions?.[0];
      if (def?.definition) {
        return {
          word,
          phonetic: entry.phonetic ?? entry.phonetics?.[0]?.text,
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          example: def.example,
          synonyms: [...(meaning.synonyms ?? []), ...(def.synonyms ?? [])].slice(0, 4),
          antonyms: [...(meaning.antonyms ?? []), ...(def.antonyms ?? [])].slice(0, 4),
          source: 'api',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDictionaryReturn {
  definition: DictionaryDefinition | null;
  isRealWord: boolean | null;   // null = still loading / unknown
  isLoading: boolean;
  lookup: (word: string) => void;
  prefetchAll: (words: string[]) => void;
}

export function useDictionary(): UseDictionaryReturn {
  const [definition, setDefinition] = useState<DictionaryDefinition | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const lookup = useCallback((word: string) => {
    if (!word) { setDefinition(null); return; }

    const w = word.toLowerCase();

    // Hit the module-level cache first
    if (w in globalCache) {
      setDefinition(globalCache[w]);
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setDefinition(null);

    fetchFromApi(w).then((result) => {
      globalCache[w] = result;
      setDefinition(result);
      setIsLoading(false);
    });
  }, []);

  const prefetchAll = useCallback((words: string[]) => {
    for (const word of words) {
      const w = word.toLowerCase();
      if (!(w in globalCache)) {
        fetchFromApi(w).then((result) => {
          globalCache[w] = result;
        });
      }
    }
  }, []);

  const isRealWord: boolean | null =
    isLoading ? null : definition !== null ? true : false;

  return { definition, isRealWord, isLoading, lookup, prefetchAll };
}

// ─── Standalone cache accessor (for Teacher export) ───────────────────────────

export function getCachedDefinition(word: string): DictionaryDefinition | null | undefined {
  return globalCache[word.toLowerCase()];
}

export function getGlobalCache(): DictionaryCache {
  return globalCache;
}

/** Pre-warm the cache for a list of words without needing the hook */
export async function prefetchWords(words: string[]): Promise<void> {
  await Promise.all(
    words.map(async (w) => {
      const lower = w.toLowerCase();
      if (!(lower in globalCache)) {
        const result = await fetchFromApi(lower);
        globalCache[lower] = result;
      }
    })
  );
}
