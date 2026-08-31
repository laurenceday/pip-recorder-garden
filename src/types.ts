import type { NoteName } from './lib/recorder.ts';

export type LessonKind = 'hold' | 'sequence' | 'explore';
export type LessonAccent = 'periwinkle' | 'sky' | 'marigold' | 'leaf' | 'coral';

export interface LessonPatternStep {
  note: NoteName;
  beats: 0.5 | 1 | 2 | 4;
}

export interface Lesson {
  schemaVersion: 1;
  id: string;
  sourceIdeaId: string;
  order: number;
  title: string;
  shortTitle: string;
  chapter: string;
  kind: LessonKind;
  difficulty: number;
  story: string;
  childCue: string;
  adultCue: string;
  successCue: string;
  pattern: LessonPatternStep[];
  stableMs: number;
  toleranceCents: number;
  tips: string[];
  accent: LessonAccent;
}

