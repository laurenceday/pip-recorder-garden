import { useCallback, useEffect } from 'react';
import { childCopyFor, type ChildCopyState } from '../lib/child-copy.ts';

export function useChildVoice() {
  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback((state: ChildCopyState): boolean => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
    const copy = childCopyFor(state);
    const voice = new SpeechSynthesisUtterance(`${copy.title}. ${copy.action}.`);
    voice.lang = 'en-GB';
    voice.rate = 0.78;
    voice.pitch = 1.08;
    voice.volume = 0.82;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(voice);
    return true;
  }, []);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      cancel();
    };
  }, [cancel]);

  return { cancel, speak };
}
