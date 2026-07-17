/**
 * detector.js — browser object detection (YOLO-style single-shot) via TensorFlow.js
 * COCO-SSD. Detects 80 everyday objects. Model weights are fetched from Google's
 * CDN on first load and cached by the browser afterwards.
 *
 * tfjs + coco-ssd are imported dynamically so they only load inside the CV lab,
 * keeping them out of the main app bundle.
 */

let _modelPromise = null;

export async function loadDetector(onProgress) {
  if (!_modelPromise) {
    _modelPromise = (async () => {
      onProgress?.('Loading TensorFlow…');
      await import('@tensorflow/tfjs');
      onProgress?.('Loading the detection model…');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      // 'lite_mobilenet_v2' is the fastest variant — best for smooth webcam.
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      onProgress?.('Ready');
      return model;
    })();
  }
  return _modelPromise;
}

/** The 80 COCO classes coco-ssd can recognise. */
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

/**
 * The practical classroom/household subset of COCO we surface to students —
 * things actually likely to appear on a webcam at a desk or at home. We drop
 * vehicles (bus/train/truck…), outdoor/traffic objects, big animals and sports
 * gear. NOTE: coco-ssd is fixed to the 80 COCO classes, so we can only *filter*
 * this list — items outside COCO (e.g. "pen", "eraser") can't be added without
 * swapping in a different model.
 */
export const HOUSEHOLD_CLASSES = [
  'person', 'backpack', 'umbrella', 'handbag', 'tie', 'bottle', 'cup', 'fork', 'knife',
  'spoon', 'bowl', 'banana', 'apple', 'orange', 'chair', 'couch', 'potted plant',
  'dining table', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'toothbrush', 'cat', 'dog',
];
const HOUSEHOLD_SET = new Set(HOUSEHOLD_CLASSES);

/**
 * Detect objects in a video/image/canvas element.
 * Returns [{bbox:[x,y,w,h], class, score}], filtered to `allowed` classes
 * (defaults to the classroom/household set; pass null to get all 80).
 */
export async function detect(el, maxObjects = 20, allowed = HOUSEHOLD_SET) {
  const model = await loadDetector();
  const preds = await model.detect(el, maxObjects);
  return allowed ? preds.filter((p) => allowed.has(p.class)) : preds;
}
