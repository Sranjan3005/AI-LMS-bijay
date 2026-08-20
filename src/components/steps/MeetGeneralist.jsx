import { useEffect, useState } from 'react';
import { Download, GraduationCap } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate, react } from '../../lib/guide/script.js';
import {
  BASE_MODEL_CARD, MODEL_SIZE_MB, activeBackend, loadBackbone, explainLoadFailure,
} from '../../lib/ml/backbone.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import { Visual } from '../visuals/index.jsx';
import { Gate, Stat, StatRow } from '../ui.jsx';

// The model is served from this project, not a CDN -- so on a school laptop
// this is a copy across localhost rather than a download, and it is cached
// after the first time. The size is still shown, because "press this and wait"
// with no number is how you lose a room of thirteen-year-olds.

/**
 * Step 1 -- the model card, shown BEFORE any weights download.
 *
 * The explicit "Load the model" button is the point of this screen. Knowing
 * what a model is, what it was trained on and where it says it will fail --
 * before running it -- is a habit worth building, and it turns a 14 MB download
 * into a decision the student made rather than a spinner they endured.
 */
export default function MeetGeneralist() {
  const { baseLoaded, setBaseLoaded, next } = useFlow();
  const chiti = useChiti();
  const { beat, done } = useLesson();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // The lesson script in lib/chiti/lesson.js drives the narration now.
  // This step only reports what the student actually did.

  const load = async () => {
    setError(null);
    try {
      await loadBackbone(setStatus);
      setBaseLoaded(true);
      done(TASKS.MODEL_LOADED);
    } catch (e) {
      setStatus(null);
      // Distinguishes "the network failed" from "it downloaded but would not
      // start". Reporting the second as the first sent someone looking at their
      // wifi for a graph-optimiser bug.
      setError(explainLoadFailure(e));
    }
  };

  return (
    <>
      {beat?.show && <div className="card tight"><Visual name={beat.show} /></div>}

      <div className="card">
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <GraduationCap size={20} color="var(--accent)" />
          <h3 style={{ margin: 0 }}>{BASE_MODEL_CARD.label}</h3>
          <span className="tag">{BASE_MODEL_CARD.school}</span>
        </div>
        <p className="muted">{BASE_MODEL_CARD.blurb}</p>

        <StatRow>
          <Stat k="Trained on" v={BASE_MODEL_CARD.trainedOn} />
          <Stat k="Photos studied" v={BASE_MODEL_CARD.trainingImages} />
          <Stat k="Things it can name" v={BASE_MODEL_CARD.classCount.toLocaleString()} />
          <Stat k="Weights" v={`${(BASE_MODEL_CARD.paramCount / 1e6).toFixed(1)}M`} />
          <Stat k="Size on disk" v={`${MODEL_SIZE_MB} MB`} />
        </StatRow>

        <h4 style={{ marginTop: 20 }}>How it is put together</h4>
        <div className="brain">
          {BASE_MODEL_CARD.architecture.map((l, i) => (
            <div key={l.name} className={`layer ${i === BASE_MODEL_CARD.architecture.length - 1 ? 'unlocked' : 'locked'}`}>
              <span className="ico">{i === BASE_MODEL_CARD.architecture.length - 1 ? '🔓' : '🔒'}</span>
              <span className="nm">{l.name}<br /><span className="small muted">{l.note}</span></span>
            </div>
          ))}
        </div>
        <p className="small muted">
          Only the bottom row gets replaced when you fine-tune it. Everything
          above stays exactly as it is — that is the whole idea, and in four
          screens you will do it. Notice the shape of the stack: each layer only
          ever looks at what the layer below it found, which is what lets the
          early ones stay useful for pictures they have never seen.
        </p>

        <h4 style={{ marginTop: 20 }}>Where I will fail</h4>
        <p className="small muted">
          Written by the model, about itself. Treat each one as a prediction you
          are about to test — in two screens you will find out whether it was
          telling the truth.
        </p>
        <ul className="plain">
          {BASE_MODEL_CARD.blindSpots.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>

      <div className="card tight">
        {!baseLoaded ? (
          <>
            <Spot id="load-model" className="btn-row">
              <button type="button" className="btn primary" onClick={load} disabled={!!status}>
                {status ? <span className="spinner" /> : <Download size={15} />}
                {status || `Load the model (${MODEL_SIZE_MB} MB)`}
              </button>
            </Spot>
            <p className="small muted">
              It comes from this project, not the internet — so it loads at the
              same speed with the wifi off. It is a big file because a
              convolutional network this deep is 25.6 million numbers, one for
              every filter weight in every layer.
            </p>
            {error && <div className="banner bad">{error}</div>}
          </>
        ) : (
          <div className="banner good">
            Loaded and running on your machine — ONNX Runtime on{' '}
            <b>{activeBackend || 'wasm'}</b>. Every photo you give it from here
            stays in this tab, and nothing was fetched from the internet to get
            here.
          </div>
        )}
      </div>

      <Gate
        hint="Load the model to continue."
        ready={baseLoaded}
        onNext={next}
        label="Give it a photo"
      />
    </>
  );
}
