import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORDER_NOTES, type NoteName } from '../lib/recorder.ts';

export function useGuideTone() {
  const contextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const [playingNote, setPlayingNote] = useState<NoteName | null>(null);

  const stop = useCallback(() => {
    const oscillator = oscillatorRef.current;
    oscillatorRef.current = null;
    if (oscillator) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* The oscillator may already have ended. */ }
      oscillator.disconnect();
    }
    const context = contextRef.current;
    contextRef.current = null;
    if (context) void context.close().catch(() => undefined);
    setPlayingNote(null);
  }, []);

  const play = useCallback(async (note: NoteName) => {
    stop();
    const context = new AudioContext();
    contextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillatorRef.current = oscillator;
    oscillator.type = 'sine';
    oscillator.frequency.value = RECORDER_NOTES[note].frequency;
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.04);
    gain.gain.setValueAtTime(0.055, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillatorRef.current = null;
      contextRef.current = null;
      void context.close().catch(() => undefined);
      setPlayingNote(null);
    };
    setPlayingNote(note);
    oscillator.start(now);
    oscillator.stop(now + 0.92);
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { playingNote, play, stop };
}

