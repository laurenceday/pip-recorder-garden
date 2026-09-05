import { useCallback, useEffect, useRef } from 'react';
import type { ChildCopyState } from '../lib/child-copy.ts';

const CHILD_VOICE_CLIPS: Readonly<Record<ChildCopyState, string>> = Object.freeze({
  ready: './voice/ready.m4a',
  playing: './voice/playing.m4a',
  tap: './voice/tap.m4a',
  done: './voice/done.m4a',
  more: './voice/more.m4a',
  error: './voice/error.m4a',
});

export function useChildVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cancel = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const speak = useCallback((state: ChildCopyState): boolean => {
    cancel();
    const audio = new Audio(CHILD_VOICE_CLIPS[state]);
    audio.volume = 0.82;
    audioRef.current = audio;
    audio.addEventListener('ended', () => {
      if (audioRef.current === audio) audioRef.current = null;
    }, { once: true });
    void audio.play().catch(() => {
      if (audioRef.current === audio) audioRef.current = null;
    });
    return true;
  }, [cancel]);

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
