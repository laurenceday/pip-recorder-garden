import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPatternSchedule,
  GUIDE_START_DELAY_MS,
  guidePlaybackAt,
  startGuidePlayback,
  stopGuidePlayback,
  type GuideStopReason,
} from '../lib/mission-loop.ts';
import { RECORDER_NOTES } from '../lib/recorder.ts';
import type { LessonPatternStep } from '../types.ts';

export function useGuideTone() {
  const contextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timersRef = useRef<number[]>([]);
  const runRef = useRef(0);
  const resolveRef = useRef<((finished: boolean) => void) | null>(null);
  const [playback, setPlayback] = useState(() => stopGuidePlayback('stopped'));

  const releaseResources = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    for (const oscillator of oscillatorsRef.current) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* A scheduled oscillator may already have ended. */ }
      oscillator.disconnect();
    }
    oscillatorsRef.current = [];
    const context = contextRef.current;
    contextRef.current = null;
    if (context) void context.close().catch(() => undefined);
  }, []);

  const stop = useCallback((reason: Exclude<GuideStopReason, 'idle' | 'playing' | 'finished'> = 'stopped') => {
    runRef.current += 1;
    releaseResources();
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(false);
    setPlayback(stopGuidePlayback(reason));
  }, [releaseResources]);

  const playPattern = useCallback(async (pattern: readonly LessonPatternStep[]): Promise<boolean> => {
    stop();
    const schedule = createPatternSchedule(pattern);
    const run = runRef.current;
    const context = new AudioContext();
    contextRef.current = context;
    setPlayback(startGuidePlayback(null));
    try {
      await context.resume();
    } catch (error) {
      if (run !== runRef.current) return false;
      releaseResources();
      setPlayback(stopGuidePlayback('stopped'));
      throw error;
    }
    if (run !== runRef.current) return false;

    try {
      const now = context.currentTime + (GUIDE_START_DELAY_MS / 1_000);
      oscillatorsRef.current = [];
      for (const event of schedule) {
        const oscillator = context.createOscillator();
        oscillatorsRef.current.push(oscillator);
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = RECORDER_NOTES[event.note].frequency;
        const onset = now + (event.onsetMs / 1_000);
        const release = now + (event.releaseMs / 1_000);
        gain.gain.setValueAtTime(0.0001, onset);
        gain.gain.exponentialRampToValueAtTime(0.052, onset + 0.035);
        gain.gain.setValueAtTime(0.052, Math.max(onset + 0.035, release - 0.045));
        gain.gain.exponentialRampToValueAtTime(0.0001, release);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(onset);
        oscillator.stop(release + 0.01);
      }
      for (const event of schedule) {
        timersRef.current.push(window.setTimeout(() => {
          if (run === runRef.current) setPlayback(guidePlaybackAt(schedule, event.onsetMs));
        }, event.onsetMs + GUIDE_START_DELAY_MS));
      }

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        const durationMs = schedule.at(-1)!.endMs;
        timersRef.current.push(window.setTimeout(() => {
          if (run !== runRef.current) return;
          releaseResources();
          resolveRef.current = null;
          setPlayback(guidePlaybackAt(schedule, durationMs));
          resolve(true);
        }, durationMs + GUIDE_START_DELAY_MS));
      });
    } catch (error) {
      if (run !== runRef.current) return false;
      releaseResources();
      setPlayback(stopGuidePlayback('stopped'));
      throw error;
    }
  }, [releaseResources, stop]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') stop('hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stop]);

  useEffect(() => () => {
    runRef.current += 1;
    releaseResources();
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, [releaseResources]);

  return {
    playing: playback.running,
    currentStep: playback.currentIndex,
    reason: playback.reason,
    playPattern,
    stop,
  };
}
