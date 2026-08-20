import { Lock, Check } from 'lucide-react';
import { STEPS } from '../lib/guide/script.js';
import { useFlow } from '../lib/flowState.jsx';

/**
 * StepRail -- the flow's spine.
 *
 * Forward-only on the first pass, deliberately. The whole module is built on
 * hooks that only work if you have not already seen the answer: Act 3's
 * boundary test means nothing to a student who skipped ahead and watched the
 * specialist fail before they knew it was a specialist. Once a step is cleared
 * it stays reachable forever, so revisiting is free.
 */
export default function StepRail() {
  const { step, goTo, furthest } = useFlow();

  return (
    <nav className="rail" aria-label="Module steps">
      {STEPS.map((s, i) => {
        const locked = i > furthest;
        const done = i < furthest;
        const on = s.id === step;
        return (
          <button
            key={s.id}
            type="button"
            className={`rail-item${on ? ' on' : ''}${done && !on ? ' done' : ''}`}
            disabled={locked}
            onClick={() => goTo(s.id)}
            title={locked ? 'Finish the step before this one' : s.title}
          >
            <span className="rail-n">
              {locked ? <Lock size={10} /> : (done ? <Check size={11} /> : s.n)}
            </span>
            {s.title}
          </button>
        );
      })}
    </nav>
  );
}
