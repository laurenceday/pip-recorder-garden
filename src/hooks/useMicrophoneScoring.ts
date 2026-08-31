import { useCallback, useEffect, useRef, useState } from 'react';
import { analysePitch, assessPitch, type PitchAssessment } from '../lib/pitch.ts';
import type { NoteName } from '../lib/recorder.ts';

export type MicrophonePhase = 'off' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'error';

interface MicrophoneScoringOptions {
  expected: NoteName;
  toleranceCents: number;
  onAssessment: (assessment: PitchAssessment, atMs: number) => boolean | void;
}

export function useMicrophoneScoring({ expected, toleranceCents, onAssessment }: MicrophoneScoringOptions) {
  const [phase, setPhase] = useState<MicrophonePhase>('off');
  const [assessment, setAssessment] = useState<PitchAssessment | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const expectedRef = useRef(expected);
  const toleranceRef = useRef(toleranceCents);
  const callbackRef = useRef(onAssessment);

  useEffect(() => {
    expectedRef.current = expected;
    toleranceRef.current = toleranceCents;
    callbackRef.current = onAssessment;
  }, [expected, onAssessment, toleranceCents]);

  const releaseResources = useCallback(() => {
    runRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context) void context.close().catch(() => undefined);
  }, []);

  const stop = useCallback(() => {
    releaseResources();
    setAssessment(null);
    setIssue(null);
    setPhase('off');
  }, [releaseResources]);

  const start = useCallback(async () => {
    releaseResources();
    setAssessment(null);
    setIssue(null);
    if (!window.isSecureContext) {
      setPhase('unavailable');
      setIssue('Microphone listening needs HTTPS or localhost.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('unavailable');
      setIssue('This browser does not offer microphone listening.');
      return;
    }

    const run = runRef.current;
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          channelCount: 1,
        },
        video: false,
      });
      if (run !== runRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (run !== runRef.current) return;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      sourceRef.current = source;
      const samples = new Float32Array(analyser.fftSize);
      let lastProcessedAt = -Infinity;
      setPhase('listening');

      const listen = (atMs: number) => {
        if (run !== runRef.current) return;
        frameRef.current = requestAnimationFrame(listen);
        if (atMs - lastProcessedAt < 65) return;
        lastProcessedAt = atMs;
        analyser.getFloatTimeDomainData(samples);
        const nextAssessment = assessPitch(
          analysePitch(samples, context.sampleRate),
          expectedRef.current,
          toleranceRef.current,
        );
        setAssessment(nextAssessment);
        if (callbackRef.current(nextAssessment, atMs)) {
          releaseResources();
          setPhase('off');
        }
      };
      frameRef.current = requestAnimationFrame(listen);
    } catch (error) {
      if (run !== runRef.current) return;
      releaseResources();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase('denied');
        setIssue('Microphone access was not allowed. An adult can use the no-microphone option instead.');
      } else if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'AbortError') {
        setPhase('unavailable');
        setIssue('No available microphone could be opened on this device.');
      } else {
        setPhase('error');
        setIssue('The microphone stopped unexpectedly. You can try again.');
      }
    }
  }, [releaseResources]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stop]);

  useEffect(() => releaseResources, [releaseResources]);
  return { phase, assessment, issue, start, stop };
}
