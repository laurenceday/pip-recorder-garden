export const CHILD_COPY_STATE_IDS = ['ready', 'playing', 'tap', 'done', 'more', 'error'] as const;

export type ChildCopyState = (typeof CHILD_COPY_STATE_IDS)[number];

export const CHILD_NOTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export type ChildNoteLetter = (typeof CHILD_NOTE_LETTERS)[number];

export const CHILD_LEXICON = [
  'a',
  'b',
  'back',
  'c',
  'd',
  'done',
  'e',
  'f',
  'g',
  'more',
  'pip',
  'play',
  'stop',
  'tap',
  'try',
] as const;

const COPY_BY_STATE = Object.freeze({
  ready: Object.freeze({ title: 'Pip', action: 'Play', exit: 'Back' }),
  playing: Object.freeze({ title: 'Pip', action: 'Stop', exit: 'Back' }),
  tap: Object.freeze({ title: 'Tap', action: 'Tap', exit: 'Done' }),
  done: Object.freeze({ title: 'Done', action: 'More', exit: 'Done' }),
  more: Object.freeze({ title: 'More', action: 'Done', exit: 'Back' }),
  error: Object.freeze({ title: 'Try', action: 'Play', exit: 'Back' }),
}) satisfies Readonly<Record<ChildCopyState, Readonly<{ title: string; action: string; exit: string }>>>;

export interface ChildCopyManifestEntry {
  id: string;
  state: ChildCopyState | 'all';
  surface: 'visible-and-accessible';
  text: string;
}

function expectedManifest(): ChildCopyManifestEntry[] {
  const stateEntries = CHILD_COPY_STATE_IDS.flatMap((state) => ([
    { id: `${state}.title`, state, surface: 'visible-and-accessible' as const, text: COPY_BY_STATE[state].title },
    { id: `${state}.action`, state, surface: 'visible-and-accessible' as const, text: COPY_BY_STATE[state].action },
    { id: `${state}.exit`, state, surface: 'visible-and-accessible' as const, text: COPY_BY_STATE[state].exit },
  ]));
  const noteEntries = CHILD_NOTE_LETTERS.map((note) => ({
    id: `all.note.${note.toLowerCase()}`,
    state: 'all' as const,
    surface: 'visible-and-accessible' as const,
    text: note,
  }));
  return [...stateEntries, ...noteEntries];
}

export const CHILD_COPY_MANIFEST = Object.freeze(
  expectedManifest().map((entry) => Object.freeze(entry)),
) as readonly Readonly<ChildCopyManifestEntry>[];

const CHILD_LEXICON_SET = new Set<string>(CHILD_LEXICON);
const CHILD_COPY_STATE_SET = new Set<string>(CHILD_COPY_STATE_IDS);
const CHILD_NOTE_LETTER_SET = new Set<string>(CHILD_NOTE_LETTERS);

export function childCopyFor(state: ChildCopyState): Readonly<{ title: string; action: string; exit: string }> {
  if (!CHILD_COPY_STATE_SET.has(state)) throw new Error(`unknown child state: ${String(state)}`);
  return COPY_BY_STATE[state];
}

export function childNoteLetters(noteNames: readonly string[]): readonly ChildNoteLetter[] {
  return Object.freeze(noteNames.map((noteName) => {
    if (!/^[A-G][0-9]$/.test(noteName)) throw new Error(`unknown child note: ${noteName}`);
    const letter = noteName.slice(0, 1);
    if (!CHILD_NOTE_LETTER_SET.has(letter)) throw new Error(`unknown child note: ${noteName}`);
    return letter as ChildNoteLetter;
  }));
}

export function childCopyTokens(text: unknown): readonly string[] {
  if (typeof text !== 'string' || text.length === 0 || text.length > 32) {
    throw new Error('child copy must be a non-empty string of at most 32 characters');
  }
  if (text !== text.normalize('NFKC') || !/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(text)) {
    throw new Error(`child copy has unsupported characters or spacing: ${JSON.stringify(text)}`);
  }
  return Object.freeze(text.toLowerCase().split(' '));
}

export function rejectedChildCopyTokens(text: unknown): readonly string[] {
  return Object.freeze(childCopyTokens(text).filter((token) => !CHILD_LEXICON_SET.has(token)));
}

export function validateChildCopyManifest(entries: unknown): readonly string[] {
  const findings: string[] = [];
  if (!Array.isArray(entries)) return Object.freeze(['manifest must be an array']);
  if (entries.length > 64) findings.push('manifest has more than 64 entries');

  const seen = new Set<string>();
  for (const [index, value] of entries.entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      findings.push(`entry ${index} must be an object`);
      continue;
    }
    const entry = value as Record<string, unknown>;
    const keys = Object.keys(entry).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['id', 'state', 'surface', 'text'])) {
      findings.push(`entry ${index} has unsupported fields`);
    }
    if (typeof entry.id !== 'string' || !/^(?:all\.note\.[a-g]|(?:ready|playing|tap|done|more|error)\.(?:title|action|exit))$/.test(entry.id)) {
      findings.push(`entry ${index} has an invalid id`);
    } else if (seen.has(entry.id)) {
      findings.push(`entry ${index} duplicates ${entry.id}`);
    } else {
      seen.add(entry.id);
    }
    if (entry.state !== 'all' && (typeof entry.state !== 'string' || !CHILD_COPY_STATE_SET.has(entry.state))) {
      findings.push(`entry ${index} has an unenumerated state`);
    }
    if (entry.surface !== 'visible-and-accessible') findings.push(`entry ${index} has an unsupported surface`);
    try {
      const rejected = rejectedChildCopyTokens(entry.text);
      if (rejected.length > 0) findings.push(`entry ${index} has rejected tokens: ${rejected.join(', ')}`);
    } catch (error) {
      findings.push(`entry ${index} ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const expected = expectedManifest();
  if (JSON.stringify(entries) !== JSON.stringify(expected)) findings.push('manifest does not match the exhaustive declared states');
  return Object.freeze(findings);
}
