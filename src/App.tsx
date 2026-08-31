import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catalogueJson from './generated/lessons.json';
import { FingeringDiagram } from './components/FingeringDiagram.tsx';
import { GardenMark } from './components/GardenMark.tsx';
import { LessonTrail } from './components/LessonTrail.tsx';
import { PatternStrip } from './components/PatternStrip.tsx';
import { useGuideTone } from './hooks/useGuideTone.ts';
import { useMicrophoneScoring } from './hooks/useMicrophoneScoring.ts';
import { useProgress } from './hooks/useProgress.ts';
import { advanceSequence, createSequenceState, sequenceProgress, type SequenceObservation } from './lib/lesson-state.ts';
import type { PitchAssessment } from './lib/pitch.ts';
import { NOTE_NAMES, RECORDER_NOTES, type NoteName } from './lib/recorder.ts';
import type { Lesson } from './types.ts';

const LESSONS = (catalogueJson as { lessons: Lesson[] }).lessons;
const LESSON_IDS = LESSONS.map((lesson) => lesson.id);

function initialLessonId(): string {
  const hash = window.location.hash.slice(1);
  return LESSON_IDS.includes(hash) ? hash : LESSONS[0].id;
}

function observationFrom(assessment: PitchAssessment, atMs: number): SequenceObservation {
  if ('heard' in assessment) return { atMs, kind: assessment.kind, heard: assessment.heard };
  return { atMs, kind: assessment.kind };
}

function microphoneMessage(
  phase: ReturnType<typeof useMicrophoneScoring>['phase'],
  assessment: PitchAssessment | null,
  expected: NoteName,
  awaitingRelease: boolean,
  issue: string | null,
): { heading: string; detail: string; mood: string } {
  const label = RECORDER_NOTES[expected].label;
  if (issue) return { heading: 'Let’s use another way', detail: issue, mood: 'gentle' };
  if (phase === 'requesting') return { heading: 'Ask a grown-up', detail: 'Your browser is asking whether Pip may listen to the microphone.', mood: 'listening' };
  if (phase === 'off') return { heading: `Ready for ${label}?`, detail: 'Tap “Let Pip listen” when the recorder is ready.', mood: 'resting' };
  if (!assessment) return { heading: 'Pip is listening', detail: `Play one gentle ${label}.`, mood: 'listening' };
  if (awaitingRelease && assessment.kind === 'matched') {
    return { heading: 'Make a tiny quiet gap', detail: `Let ${label} rest, then play it again.`, mood: 'near' };
  }
  if (assessment.kind === 'quiet') return { heading: 'Pip is listening', detail: `Play one gentle ${label} when you are ready.`, mood: 'listening' };
  if (assessment.kind === 'uncertain') return { heading: 'I heard a sound', detail: 'Try softer air, seal the holes, or move a little nearer.', mood: 'near' };
  if (assessment.kind === 'matched') return { heading: `Yes — ${label}!`, detail: 'Keep it floating gently until the flower opens.', mood: 'matched' };
  if (assessment.kind === 'near') {
    const direction = assessment.cents > 0 ? 'a little softer' : 'with a touch more steady air';
    return { heading: 'Very close', detail: `Try ${direction}. No rush.`, mood: 'near' };
  }
  const heard = 'heard' in assessment ? assessment.heard : expected;
  return { heading: `I heard ${RECORDER_NOTES[heard].label}`, detail: `We are looking for ${label}. Check the picture and try again.`, mood: 'different' };
}

export default function App() {
  const [selectedId, setSelectedId] = useState(initialLessonId);
  const lesson = useMemo(() => LESSONS.find((item) => item.id === selectedId) ?? LESSONS[0], [selectedId]);
  const [sequence, setSequence] = useState(createSequenceState);
  const [manualDone, setManualDone] = useState(false);
  const [explored, setExplored] = useState<Set<NoteName>>(new Set());
  const [explorerTarget, setExplorerTarget] = useState<NoteName>(lesson.pattern[0].note);
  const sequenceRef = useRef(sequence);
  const exploredRef = useRef(explored);
  const explorerTargetRef = useRef(explorerTarget);
  const { completed, markComplete, resetProgress } = useProgress(LESSON_IDS);
  const tone = useGuideTone();
  const isExplorer = lesson.kind === 'explore';
  const expected = isExplorer ? explorerTarget : lesson.pattern[Math.min(sequence.index, lesson.pattern.length - 1)].note;

  const handleAssessment = useCallback((assessment: PitchAssessment, atMs: number) => {
    const nextSequence = advanceSequence(
      sequenceRef.current,
      observationFrom(assessment, atMs),
      isExplorer ? [{ note: assessment.expected, beats: 1 }] : lesson.pattern,
      lesson.stableMs,
    );
    sequenceRef.current = nextSequence;
    setSequence(nextSequence);
    if (!nextSequence.completed) return false;
    if (!isExplorer) {
      markComplete(lesson.id);
      return true;
    }
    const nextExplored = new Set(exploredRef.current);
    nextExplored.add(assessment.expected);
    exploredRef.current = nextExplored;
    setExplored(nextExplored);
    if (nextExplored.size === NOTE_NAMES.length) {
      markComplete(lesson.id);
      return true;
    }
    const nextTarget = lesson.pattern.find((step) => !nextExplored.has(step.note))?.note ?? lesson.pattern[0].note;
    explorerTargetRef.current = nextTarget;
    setExplorerTarget(nextTarget);
    const resetSequence = createSequenceState();
    sequenceRef.current = resetSequence;
    setSequence(resetSequence);
    return false;
  }, [isExplorer, lesson.id, lesson.pattern, lesson.stableMs, markComplete]);

  const microphone = useMicrophoneScoring({
    expected,
    toleranceCents: lesson.toleranceCents,
    onAssessment: handleAssessment,
  });

  useEffect(() => {
    window.history.replaceState(null, '', `#${lesson.id}`);
  }, [lesson.id]);

  const sessionComplete = manualDone || (!isExplorer && sequence.completed) || (isExplorer && explored.size === NOTE_NAMES.length);
  const currentPatternIndex = isExplorer
    ? Math.max(0, lesson.pattern.findIndex((step) => step.note === explorerTarget))
    : sequence.index;
  const progress = isExplorer
    ? Math.min(1, (explored.size + (sequence.completed ? 1 : sequence.heldMs / lesson.stableMs)) / NOTE_NAMES.length)
    : sequenceProgress(sequence, lesson.pattern.length, lesson.stableMs);
  const currentAssessment = microphone.assessment?.expected === expected ? microphone.assessment : null;
  const feedback = microphoneMessage(microphone.phase, currentAssessment, expected, sequence.awaitingRelease, microphone.issue);

  const chooseLesson = (lessonId: string) => {
    microphone.stop();
    tone.stop();
    const nextLesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0];
    const resetSequence = createSequenceState();
    const resetExplored = new Set<NoteName>();
    sequenceRef.current = resetSequence;
    exploredRef.current = resetExplored;
    explorerTargetRef.current = nextLesson.pattern[0].note;
    setSequence(resetSequence);
    setExplored(resetExplored);
    setExplorerTarget(nextLesson.pattern[0].note);
    setManualDone(false);
    setSelectedId(lessonId);
    document.querySelector<HTMLElement>('#lesson')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseExplorerNote = (note: NoteName) => {
    microphone.stop();
    tone.stop();
    explorerTargetRef.current = note;
    setExplorerTarget(note);
    const resetSequence = createSequenceState();
    sequenceRef.current = resetSequence;
    setSequence(resetSequence);
  };

  const startListening = () => {
    tone.stop();
    void microphone.start();
  };

  const playGuideTone = () => {
    microphone.stop();
    void tone.play(expected).catch(() => undefined);
  };

  const completeWithAdult = () => {
    microphone.stop();
    tone.stop();
    setManualDone(true);
    markComplete(lesson.id);
  };

  const retryLesson = () => {
    microphone.stop();
    tone.stop();
    setManualDone(false);
    const resetSequence = createSequenceState();
    const resetExplored = new Set<NoteName>();
    sequenceRef.current = resetSequence;
    exploredRef.current = resetExplored;
    explorerTargetRef.current = lesson.pattern[0].note;
    setSequence(resetSequence);
    setExplored(resetExplored);
    setExplorerTarget(lesson.pattern[0].note);
  };

  return (
    <>
      <a className="skip-link" href="#lesson">Skip to this lesson</a>
      <header className="site-header">
        <a className="brand" href="#meet-b" onClick={(event) => { event.preventDefault(); chooseLesson('meet-b'); }}>
          <GardenMark />
          <span><strong>Pip’s Recorder Garden</strong><small>small sounds grow here</small></span>
        </a>
        <div className="header-badges" aria-label="Site promises">
          <span>Baroque in C</span>
          <span>sound stays here</span>
        </div>
      </header>

      <main className="page-shell">
        <section className={`lesson-stage accent-${lesson.accent}`} id="lesson" tabIndex={-1}>
          <div className="story-panel">
            <div className="lesson-meta">
              <span className="lesson-number">Lesson {lesson.order} of {LESSONS.length}</span>
              {completed.has(lesson.id) && <span className="complete-chip">saved ✓</span>}
            </div>
            <p className="eyebrow">{lesson.chapter} · level {lesson.difficulty}</p>
            <h1>{lesson.title}</h1>
            <p className="story-copy">{lesson.story}</p>
            <div className="child-cue">
              <span aria-hidden="true">🪶</span>
              <p><strong>Your turn</strong>{lesson.childCue}</p>
            </div>
            <PatternStrip
              pattern={lesson.pattern}
              currentIndex={currentPatternIndex}
              complete={sessionComplete}
              onSelectNote={isExplorer ? chooseExplorerNote : undefined}
              explored={isExplorer ? explored : undefined}
            />
          </div>

          <div className="practice-grid">
            <FingeringDiagram note={expected} />

            <section className={`listening-card listening-card--${feedback.mood}`} aria-labelledby="listen-title">
              <div className="listen-orbit" aria-hidden="true"><span>♪</span><i /><i /><i /></div>
              <p className="eyebrow">Private microphone helper</p>
              <h2 id="listen-title">{feedback.heading}</h2>
              <p className="feedback-detail" aria-live="polite">{feedback.detail}</p>
              <div className="growth-meter" aria-label={`Lesson progress ${Math.round(progress * 100)} percent`}>
                <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
              </div>
              <div className="listen-actions">
                {microphone.phase === 'listening' || microphone.phase === 'requesting' ? (
                  <button className="button button--stop" type="button" onClick={microphone.stop}>Stop listening</button>
                ) : (
                  <button className="button button--primary" type="button" onClick={startListening}>Let Pip listen</button>
                )}
                <button className="button button--tone" type="button" onClick={playGuideTone} aria-label={`Hear a guide tone for ${RECORDER_NOTES[expected].label}`}>
                  {tone.playingNote ? 'Playing…' : `Hear ${RECORDER_NOTES[expected].label}`}
                </button>
              </div>
              <p className="privacy-line"><span aria-hidden="true">◉</span> Listening happens only in this tab. Nothing is recorded or sent.</p>
            </section>
          </div>

          {sessionComplete && (
            <section className="success-card" aria-live="polite">
              <span className="success-flower" aria-hidden="true">✿</span>
              <div><p className="eyebrow">Lesson flower grown</p><h2>{lesson.successCue}</h2></div>
              <button type="button" className="button button--soft" onClick={retryLesson}>Play it again</button>
            </section>
          )}

          <div className="lesson-footer">
            <details className="grown-up-card">
              <summary>Grown-up corner</summary>
              <div>
                <h2>Help without turning it into a test</h2>
                <p>{lesson.adultCue}</p>
                <ul>{lesson.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                <p>The helper estimates pitch, not musical worth. Background noise, device microphones and recorder overtones can confuse it.</p>
                <button type="button" className="text-button" onClick={completeWithAdult}>Mark complete without the microphone</button>
              </div>
            </details>
            <div className="lesson-nav">
              <button type="button" className="text-button" disabled={lesson.order === 1} onClick={() => chooseLesson(LESSONS[lesson.order - 2].id)}>← Previous</button>
              <button type="button" className="text-button" disabled={lesson.order === LESSONS.length} onClick={() => chooseLesson(LESSONS[lesson.order].id)}>Next lesson →</button>
            </div>
          </div>
        </section>

        <LessonTrail lessons={LESSONS} selectedId={lesson.id} completed={completed} onSelect={chooseLesson} />
      </main>

      <footer className="site-footer">
        <div>
          <strong>Made for a soprano recorder in C</strong>
          <p>The fingering pictures use Baroque F. A grown-up should help with microphone permission and volume.</p>
        </div>
        <details>
          <summary>Privacy and saved progress</summary>
          <p>Audio is analysed live in this browser and is never recorded, uploaded or kept. Completed lesson IDs are saved only on this device. No name, score, streak or history is stored.</p>
          <button type="button" className="text-button" onClick={resetProgress}>Forget saved progress on this device</button>
        </details>
      </footer>
    </>
  );
}
