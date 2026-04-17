import { useCallback, useRef } from 'react';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

// Ranked list of preferred voices — best quality first
const PREFERRED_VOICES = [
  'Google US English',
  'Google UK English Female',
  'Samantha',
  'Karen',
  'Moira',
  'Alex',
  'Daniel',
  'Microsoft Zira',
  'Microsoft David',
];

function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const enVoices = voices.filter((v) => v.lang.startsWith('en'));
  for (const name of PREFERRED_VOICES) {
    const match = enVoices.find((v) => v.name.includes(name));
    if (match) return match;
  }
  return enVoices[0] || null;
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate   = options.rate   ?? 0.85;
    utterance.pitch  = options.pitch  ?? 1.0;
    utterance.volume = options.volume ?? 1;

    const voice = options.voice ?? getPreferredVoice();
    if (voice) utterance.voice = voice;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}
