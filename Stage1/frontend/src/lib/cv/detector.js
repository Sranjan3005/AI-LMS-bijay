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

/** Detect objects in a video/image/canvas element. Returns [{bbox:[x,y,w,h], class, score}]. */
export async function detect(el, maxObjects = 20) {
  const model = await loadDetector();
  return model.detect(el, maxObjects);
}

/** The 80 COCO classes coco-ssd can recognise (for the teaching panel). */
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
