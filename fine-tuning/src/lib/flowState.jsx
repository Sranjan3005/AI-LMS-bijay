import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';
import { STEPS, stepIndex } from './guide/script.js';
import { embedAll } from './ml/backbone.js';
import { variantsOf, multiplier } from './ml/augment.js';
import { loadEmbeddingPack, expandPack } from './ml/heads.js';
import { disposeRun } from './ml/head.js';

/**
 * flowState.jsx -- everything the ten steps share.
 *
 * THE EMBEDDING CACHE IS THE WHOLE REASON THIS MODULE IS INTERACTIVE.
 *
 * A ResNet-50 forward pass is ~4.1 GFLOPs, so embedding one image in a browser
 * is around a third of a second. Fitting a head on the resulting vectors is ~1 s for the
 * entire set. That ratio is the design constraint for everything here: the
 * expensive half must never happen more than once per image.
 *
 * Two sources, in order of preference:
 *
 *   INSTALLED SETS   already embedded at build time by scripts/embed_datasets.py,
 *                    including all six augmentation variants. Downloading a few
 *                    MB of vectors is instant next to a thousand forward passes.
 *
 *   THE STUDENT'S    embedded live, here, because no build step could have seen
 *   OWN PHOTOS       them. This is genuinely slow and the UI must say so --
 *                    twenty photos is about twenty seconds.
 *
 * Cache key is `datasetId | augmentationSignature`, because an augmented image
 * is a different image and therefore a different embedding.
 */

const FlowContext = createContext(null);
export const useFlow = () => useContext(FlowContext);

const augKey = (a) => (a ? ['flip', 'rotate', 'brightness'].filter((k) => a[k]).join('+') || 'none' : 'none');

export function FlowProvider({ children }) {
  const [step, setStep] = useState('meet');
  const [furthest, setFurthest] = useState(0);
  const [baseLoaded, setBaseLoaded] = useState(false);

  // The photo carried through Acts 1, 2, 3 and 5. Using one image throughout is
  // what makes "same photo, same eyes, different answer" land.
  const [probe, setProbe] = useState(null);
  const [baseAnswer, setBaseAnswer] = useState(null);

  const [datasets, setDatasets] = useState({});     // id -> Dataset
  const [primaryId, setPrimaryId] = useState(null); // the specialist's subject
  const [secondaryId, setSecondaryId] = useState(null); // the boundary test / domain B

  // A photo picked from the Data Library, waiting to be adopted by whichever
  // step is showing an ImageDrop. One-shot: the consumer clears it.
  const [pickedImage, setPickedImage] = useState(null);

  const [runs, setRuns] = useState([]);             // every finished head run
  const [specialist, setSpecialist] = useState(null);

  const embedCache = useRef(new Map());

  const goTo = useCallback((id) => {
    const i = stepIndex(id);
    if (i < 0) return;
    setStep(id);
    setFurthest((f) => Math.max(f, i));
  }, []);

  const unlock = useCallback((id) => {
    const i = stepIndex(id);
    setFurthest((f) => Math.max(f, i));
  }, []);

  const next = useCallback(() => {
    const i = stepIndex(step);
    if (i < STEPS.length - 1) goTo(STEPS[i + 1].id);
  }, [step, goTo]);

  const addDataset = useCallback((ds) => {
    setDatasets((d) => ({ ...d, [ds.dataset_id]: ds }));
    return ds.dataset_id;
  }, []);

  /**
   * Embeddings for a dataset under an augmentation setting, cached.
   *
   * Returns the augmented arrays *plus* `sourceIndex`, which maps every
   * embedding back to the real photo it came from. The split needs that: if a
   * flipped copy of a test photo ends up in the training set, the "held-out"
   * score is measuring memorisation and the whole lab lies.
   */
  const embeddingsFor = useCallback(async (datasetId, augmentation, onProgress) => {
    const key = `${datasetId}|${augKey(augmentation)}`;
    if (embedCache.current.has(key)) return embedCache.current.get(key);

    const ds = datasets[datasetId];
    if (!ds) throw new Error(`Dataset ${datasetId} is not loaded.`);

    // Installed sets were embedded at build time -- fetch the vectors instead
    // of paying for a thousand CNN forward passes in the tab.
    if (ds.origin === 'installed') {
      const pack = await loadEmbeddingPack(datasetId, onProgress);
      const expanded = expandPack(pack, augmentation || {});
      embedCache.current.set(key, expanded);
      return expanded;
    }

    const canvases = [];
    const labels = [];
    const sourceIndex = [];
    ds.images.forEach((img, i) => {
      variantsOf(img, augmentation || {}).forEach((c) => {
        canvases.push(c);
        labels.push(ds.imageLabels[i]);
        sourceIndex.push(i);
      });
    });

    const vectors = await embedAll(canvases, onProgress);
    const packed = {
      vectors,
      labels,
      sourceIndex,
      labelNames: ds.labels,
      realCount: ds.images.length,
      multiplier: multiplier(augmentation || {}),
      canvases,
      provenance: 'live',
    };
    embedCache.current.set(key, packed);
    return packed;
  }, [datasets]);

  const clearPicked = useCallback(() => setPickedImage(null), []);

  const recordRun = useCallback((run) => {
    if (!run) return;
    setRuns((r) => [...r, run]);
  }, []);

  const setSpecialistRun = useCallback((run) => {
    setSpecialist((prev) => {
      if (prev && prev !== run) disposeRun(prev);
      return run;
    });
  }, []);

  const value = useMemo(() => ({
    step,
    goTo,
    next,
    furthest,
    unlock,
    isUnlocked: (id) => stepIndex(id) <= furthest,
    baseLoaded,
    setBaseLoaded,
    probe,
    setProbe,
    baseAnswer,
    setBaseAnswer,
    datasets,
    addDataset,
    primaryId,
    setPrimaryId,
    secondaryId,
    setSecondaryId,
    embeddingsFor,
    runs,
    recordRun,
    specialist,
    setSpecialistRun,
    pickedImage,
    setPickedImage,
    clearPicked,
  }), [step, goTo, next, furthest, unlock, baseLoaded, probe, baseAnswer,
    datasets, addDataset, primaryId, secondaryId, embeddingsFor, runs,
    recordRun, specialist, setSpecialistRun, pickedImage, clearPicked]);

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
