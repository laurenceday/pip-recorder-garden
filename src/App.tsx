import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catalogueJson from './generated/lessons.json';
import { FingeringDiagram } from './components/FingeringDiagram.tsx';
import { FingeringMission } from './components/FingeringMission.tsx';
import { GardenMark } from './components/GardenMark.tsx';
import { LessonTrail } from './components/LessonTrail.tsx';
import { PatternMaker } from './components/PatternMaker.tsx';
import { PatternStrip } from './components/PatternStrip.tsx';
import { RhythmEcho } from './components/RhythmEcho.tsx';
import { useGuideTone } from './hooks/useGuideTone.ts';
import { useMicrophoneScoring } from './hooks/useMicrophoneScoring.ts';
import { useProgress } from './hooks/useProgress.ts';
import { advanceSequence, createSequenceState, sequenceProgress, type SequenceObservation } from './lib/lesson-state.ts';
import { lessonPatternNotes, notesToPattern } from './lib/mission-loop.ts';
import type { PitchAssessment } from './lib/pitch.ts';
import { NOTE_NAMES, RECORDER_NOTES, type NoteName } from './lib/recorder.ts';
import type { Lesson } from './types.ts';

const LESSONS = (catalogueJson as { lessons: Lesson[] }).lessons;
const LESSON_IDS = LESSONS.map((lesson) => lesson.id);

type MissionPhase = 'model' | 'copy' | 'make' | 'complete';
type CopyActivity = 'choose' | 'microphone' | 'fingering' | 'rhythm';

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
  if (assessment.kind === 'matched') return { heading: `Yes, ${label}!`, detail: 'Keep it floating gently until the flower opens.', mood: 'matched' };
  if (assessment.kind === 'near') {
    const direction = assessment.cents > 0 ? 'a little softer' : 'with a touch more steady air';
    return { heading: 'Very close', detail: `Try ${direction}. No rush.`, mood: 'near' };
  }
  const heard = 'heard' in assessment ? assessment.heard : expected;
  return { heading: `I heard ${RECORDER_NOTES[heard].label}`, detail: `We are looking for ${label}. Check the picture and try again.`, mood: 'different' };
}

function MissionMap({ phase }: { phase: MissionPhase }) {
  const phases: Array<{ id: MissionPhase; label: string }> = [
    { id: 'model', label: '1 · Hear it' },
    { id: 'copy', label: '2 · Copy it' },
    { id: 'make', label: '3 · Make it' },
    { id: 'complete', label: '4 · Stop or replay' },
  ];
  const current = phases.findIndex((item) => item.id === phase);
  return (
    <ol className="mission-map" aria-label="This lesson’s four steps">
      {phases.map((item, index) => (
        <li key={item.id} className={index < current ? 'mission-map--done' : ''} aria-current={item.id === phase ? 'step' : undefined}>
          {index < current && <span aria-hidden="true">✓</span>}{item.label}
        </li>
      ))}
    </ol>
  );
}

export default function App() {
  const [selectedId, setSelectedId] = useState(initialLessonId);
  const lesson = useMemo(() => LESSONS.find((item) => item.id === selectedId) ?? LESSONS[0], [selectedId]);
  const [missionPhase, setMissionPhase] = useState<MissionPhase>('model');
  const [copyActivity, setCopyActivity] = useState<CopyActivity>('choose');
  const [guideIssue, setGuideIssue] = useState<string | null>(null);
  const [rested, setRested] = useState(false);
  const [fingeringIndex, setFingeringIndex] = useState(0);
  const [sequence, setSequence] = useState(createSequenceState);
  const [explored, setExplored] = useState<Set<NoteName>>(new Set());
  const [explorerTarget, setExplorerTarget] = useState<NoteName>(lesson.pattern[0].note);
  const sequenceRef = useRef(sequence);
  const exploredRef = useRef(explored);
  const { completed, markComplete, resetProgress } = useProgress(LESSON_IDS);
  const tone = useGuideTone();
  const isExplorer = lesson.kind === 'explore';
  const microphoneExpected = isExplorer ? explorerTarget : lesson.pattern[Math.min(sequence.index, lesson.pattern.length - 1)].note;
  const fingeringExpected = lesson.pattern[Math.min(fingeringIndex, lesson.pattern.length - 1)].note;
  const displayedNote = copyActivity === 'fingering' ? fingeringExpected : microphoneExpected;
  const allowedMakerNotes = useMemo(() => lessonPatternNotes(lesson.pattern), [lesson.pattern]);

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
      setMissionPhase('make');
      return true;
    }
    const nextExplored = new Set(exploredRef.current);
    nextExplored.add(assessment.expected);
    exploredRef.current = nextExplored;
    setExplored(nextExplored);
    if (nextExplored.size === NOTE_NAMES.length) {
      setMissionPhase('make');
      return true;
    }
    const nextTarget = lesson.pattern.find((step) => !nextExplored.has(step.note))?.note ?? lesson.pattern[0].note;
    setExplorerTarget(nextTarget);
    const resetSequence = createSequenceState();
    sequenceRef.current = resetSequence;
    setSequence(resetSequence);
    return false;
  }, [isExplorer, lesson.pattern, lesson.stableMs]);

  const microphone = useMicrophoneScoring({
    expected: microphoneExpected,
    toleranceCents: lesson.toleranceCents,
    onAssessment: handleAssessment,
  });

  useEffect(() => {
    window.history.replaceState(null, '', `#${lesson.id}`);
  }, [lesson.id]);

  const sessionComplete = missionPhase === 'complete';
  const currentPatternIndex = tone.playing && missionPhase === 'model'
    ? (tone.currentStep ?? 0)
    : isExplorer
      ? Math.max(0, lesson.pattern.findIndex((step) => step.note === explorerTarget))
      : sequence.index;
  const copyProgress = isExplorer
    ? Math.min(1, (explored.size + (sequence.completed ? 1 : sequence.heldMs / lesson.stableMs)) / NOTE_NAMES.length)
    : sequenceProgress(sequence, lesson.pattern.length, lesson.stableMs);
  const currentAssessment = microphone.assessment?.expected === microphoneExpected ? microphone.assessment : null;
  const feedback = microphoneMessage(microphone.phase, currentAssessment, microphoneExpected, sequence.awaitingRelease, microphone.issue);

  const resetMission = (nextLesson = lesson) => {
    const resetSequence = createSequenceState();
    const resetExplored = new Set<NoteName>();
    sequenceRef.current = resetSequence;
    exploredRef.current = resetExplored;
    setSequence(resetSequence);
    setExplored(resetExplored);
    setExplorerTarget(nextLesson.pattern[0].note);
    setMissionPhase('model');
    setCopyActivity('choose');
    setFingeringIndex(0);
    setGuideIssue(null);
    setRested(false);
  };

  const chooseLesson = (lessonId: string) => {
    microphone.stop();
    tone.stop('lesson-change');
    const nextLesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0];
    resetMission(nextLesson);
    setSelectedId(lessonId);
    document.querySelector<HTMLElement>('#lesson')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseExplorerNote = (note: NoteName) => {
    microphone.stop();
    tone.stop();
    setExplorerTarget(note);
    const resetSequence = createSequenceState();
    sequenceRef.current = resetSequence;
    setSequence(resetSequence);
  };

  const playModel = async () => {
    microphone.stop();
    setGuideIssue(null);
    try {
      const finished = await tone.playPattern(lesson.pattern);
      if (finished) setMissionPhase('copy');
    } catch {
      setGuideIssue('Guide sound is unavailable here. You can follow the moving note stones or copy with a grown-up.');
    }
  };

  const startListening = () => {
    tone.stop();
    setCopyActivity('microphone');
    void microphone.start();
  };

  const enterMake = () => {
    microphone.stop();
    tone.stop();
    setMissionPhase('make');
  };

  const finishFingeringStep = () => {
    if (fingeringIndex < lesson.pattern.length - 1) {
      setFingeringIndex((index) => index + 1);
      return;
    }
    enterMake();
  };

  const playMadePattern = (notes: readonly NoteName[]) => {
    microphone.stop();
    setGuideIssue(null);
    void tone.playPattern(notesToPattern(notes, allowedMakerNotes)).catch(() => {
      setGuideIssue('Guide sound is unavailable here. You can still play your tune yourself.');
    });
  };

  const completeMission = () => {
    microphone.stop();
    tone.stop('complete');
    markComplete(lesson.id);
    setMissionPhase('complete');
    setRested(false);
  };

  const retryLesson = () => {
    microphone.stop();
    tone.stop();
    resetMission();
    document.querySelector<HTMLElement>('#lesson')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const returnToGarden = () => {
    microphone.stop();
    tone.stop('complete');
    document.querySelector<HTMLElement>('#garden-path')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector<HTMLElement>('#garden-path')?.focus({ preventScroll: true });
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
            <MissionMap phase={missionPhase} />
            <PatternStrip
              pattern={lesson.pattern}
              currentIndex={currentPatternIndex}
              complete={sessionComplete}
              onSelectNote={isExplorer && missionPhase === 'copy' ? chooseExplorerNote : undefined}
              explored={isExplorer && missionPhase === 'copy' ? explored : undefined}
            />
          </div>

          {missionPhase === 'model' && (
            <section className="model-card" aria-labelledby="model-title">
              <div>
                <p className="eyebrow">First, hear the whole pattern</p>
                <h2 id="model-title">Pip plays every note and beat</h2>
                <p>Watch the note stones glow. Sound starts only when you ask and stops after the last beat.</p>
                {guideIssue && <output className="mission-feedback">{guideIssue}</output>}
              </div>
              <div className="mission-actions">
                {tone.playing ? (
                  <button className="button button--stop" type="button" onClick={() => tone.stop()}>Stop the pattern</button>
                ) : (
                  <button className="button button--primary" type="button" onClick={() => { void playModel(); }}>Hear the whole pattern</button>
                )}
                <button className="button button--soft" type="button" disabled={tone.playing} onClick={() => setMissionPhase('copy')}>Copy without sound</button>
              </div>
            </section>
          )}

          {missionPhase === 'copy' && (
            <div className="practice-grid">
              <FingeringDiagram note={displayedNote} />
              {copyActivity === 'choose' && (
                <section className="copy-chooser" aria-labelledby="copy-title">
                  <p className="eyebrow">Now, choose a way to copy</p>
                  <h2 id="copy-title">Recorder, fingers or rhythm?</h2>
                  <p>All three paths reach the same flower. Pip’s microphone helper is optional.</p>
                  <div className="copy-choice-grid">
                    <button className="copy-choice" type="button" onClick={startListening}><span aria-hidden="true">🎵</span><strong>Play to Pip</strong><small>Optional microphone</small></button>
                    <button className="copy-choice" type="button" onClick={() => setCopyActivity('fingering')}><span aria-hidden="true">●</span><strong>Finger puzzle</strong><small>No microphone</small></button>
                    <button className="copy-choice" type="button" onClick={() => setCopyActivity('rhythm')}><span aria-hidden="true">👏</span><strong>Tap the rhythm</strong><small>No microphone</small></button>
                  </div>
                  <div className="co-play-prompt">
                    <strong>Grown-up and child:</strong> echo the pattern together, or sing its note names.
                    <button className="button button--soft" type="button" onClick={enterMake}>We copied it together</button>
                  </div>
                  <button className="text-button" type="button" onClick={() => setMissionPhase('model')}>Hear the model again</button>
                </section>
              )}

              {copyActivity === 'microphone' && (
                <section className={`listening-card listening-card--${feedback.mood}`} aria-labelledby="listen-title">
                  <div className="listen-orbit" aria-hidden="true"><span>♪</span><i /><i /><i /></div>
                  <p className="eyebrow">Private microphone helper</p>
                  <h2 id="listen-title">{feedback.heading}</h2>
                  <p className="feedback-detail" aria-live="polite">{feedback.detail}</p>
                  <progress className="growth-meter" aria-label="Copy progress" max={100} value={Math.round(copyProgress * 100)}>{Math.round(copyProgress * 100)}%</progress>
                  <div className="listen-actions">
                    {microphone.phase === 'listening' || microphone.phase === 'requesting' ? (
                      <button className="button button--stop" type="button" onClick={microphone.stop}>Stop listening</button>
                    ) : (
                      <button className="button button--primary" type="button" onClick={startListening}>Let Pip listen</button>
                    )}
                    <button className="button button--soft" type="button" onClick={() => { microphone.stop(); setCopyActivity('choose'); }}>Choose another way</button>
                  </div>
                  <p className="privacy-line"><span aria-hidden="true">◉</span> Listening happens only in this tab. Nothing is recorded or sent.</p>
                </section>
              )}

              {copyActivity === 'fingering' && (
                <FingeringMission
                  key={`${lesson.id}-${fingeringIndex}`}
                  note={fingeringExpected}
                  isLast={fingeringIndex === lesson.pattern.length - 1}
                  onComplete={finishFingeringStep}
                />
              )}

              {copyActivity === 'rhythm' && <RhythmEcho pattern={lesson.pattern} onComplete={enterMake} />}
            </div>
          )}

          {missionPhase === 'make' && (
            <PatternMaker
              allowedNotes={allowedMakerNotes}
              playing={tone.playing}
              activeIndex={tone.currentStep}
              guideIssue={guideIssue}
              onHear={playMadePattern}
              onStop={() => tone.stop()}
              onComplete={completeMission}
            />
          )}

          {missionPhase === 'complete' && (
            <section className="success-card success-card--mission" aria-live="polite">
              <span className="success-flower" aria-hidden="true">✿</span>
              <div>
                <p className="eyebrow">A lovely place to stop</p>
                <h2>{lesson.successCue}</h2>
                <p>{rested ? 'All sound is off. The garden will be here another day.' : 'Pip saved only this lesson’s flower—not a score, time or number of tries.'}</p>
              </div>
              <div className="mission-actions">
                <button className="button button--stop" type="button" onClick={() => { microphone.stop(); tone.stop('complete'); setRested(true); }}>Stop here for today</button>
                <button className="button button--soft" type="button" onClick={retryLesson}>Play this mission again</button>
                <button className="button button--tone" type="button" onClick={returnToGarden}>Back to the garden path</button>
              </div>
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
                {missionPhase === 'copy' && <button type="button" className="text-button" onClick={enterMake}>We copied it together without the microphone</button>}
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
          <p>Audio is analysed live in this browser and is never recorded, uploaded or kept. Completed lesson IDs are saved only on this device. No tune, tap, name, score, streak or history is stored.</p>
          <button type="button" className="text-button" onClick={resetProgress}>Forget saved progress on this device</button>
        </details>
      </footer>
    </>
  );
}
