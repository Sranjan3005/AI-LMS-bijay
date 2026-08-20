import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useChiti } from './ChitiProvider.jsx';
import { useSpotlight } from './Spotlight.jsx';
import { beatsFor, resolve } from './lesson.js';

/**
 * LessonProvider -- runs Chiti's script and, crucially, waits.
 *
 * The engine is four lines of logic and the rest is plumbing:
 *
 *   1. show the current beat (speak it, spotlight its target)
 *   2. if the beat has `waitFor`, stop
 *   3. a step calls `done('model_loaded')` when the student does the thing
 *   4. if that matches, advance
 *
 * The waiting is the point. A guide that keeps talking while the student is
 * still working has stopped teaching and gone back to narrating.
 *
 * Steps report progress with `useLesson().done(TASKS.X)` and can supply facts
 * for interpolation with `fact('top', 'Monarch butterfly')`. A step that
 * reports nothing simply never advances past its first gate, which is loud and
 * obvious rather than silently skipping the lesson.
 */

const LessonContext = createContext(null);

export const useLesson = () => useContext(LessonContext) || {
  beat: null, index: 0, total: 0, advance: () => {}, done: () => {},
  fact: () => {}, waiting: null, skip: () => {},
};

export function LessonProvider({ step, children }) {
  const chiti = useChiti();
  const { spotlight, clear } = useSpotlight();

  const beats = useMemo(() => beatsFor(step), [step]);
  const [index, setIndex] = useState(0);
  const facts = useRef({});
  const satisfied = useRef(new Set());

  // A new step restarts the script. Facts do not carry across, because a line
  // interpolating last step's prediction would be worse than saying nothing.
  useEffect(() => {
    setIndex(0);
    facts.current = {};
    satisfied.current = new Set();
  }, [step]);

  const beat = beats[index] || null;

  /** Speak + spotlight the current beat. */
  useEffect(() => {
    if (!beat) { clear(); return undefined; }

    const line = resolve(beat.say, facts.current);
    const full = beat.ask ? `${line} ${resolve(beat.ask, facts.current)}` : line;
    chiti.say(full, { key: `${step}:${beat.id}` });

    if (beat.point) spotlight(beat.point[0], beat.point[1]);
    else clear();

    return undefined;
  }, [beat, step, chiti, spotlight, clear]);

  const advance = useCallback(() => {
    setIndex((i) => Math.min(i + 1, beats.length));
  }, [beats.length]);

  /**
   * A step reports that the student did something.
   *
   * Idempotent -- components fire these from effects and will repeat them on
   * re-render, and a double-fire must not skip a beat.
   */
  const done = useCallback((task) => {
    if (!task || satisfied.current.has(task)) return;
    satisfied.current.add(task);
    setIndex((i) => {
      const current = beats[i];
      return current?.waitFor === task ? Math.min(i + 1, beats.length) : i;
    });
  }, [beats]);

  /** Supply a value for `{placeholder}` interpolation. */
  const fact = useCallback((key, value) => {
    facts.current = { ...facts.current, [key]: value };
  }, []);

  // If a task was already reported before its gate arrived -- a student who
  // works ahead of the narration -- do not make them redo it.
  useEffect(() => {
    if (beat?.waitFor && satisfied.current.has(beat.waitFor)) advance();
  }, [beat, advance]);

  const skip = useCallback(() => setIndex(beats.length), [beats.length]);

  const value = useMemo(() => ({
    beat,
    index,
    total: beats.length,
    advance,
    done,
    fact,
    skip,
    waiting: beat?.waitFor ? (beat.waiting || 'Waiting for you…') : null,
  }), [beat, index, beats.length, advance, done, fact, skip]);

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
