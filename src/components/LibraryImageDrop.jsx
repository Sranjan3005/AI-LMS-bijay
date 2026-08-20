import { useEffect } from 'react';
import { useFlow } from '../lib/flowState.jsx';
import { ImageDrop } from './ui.jsx';

/**
 * An ImageDrop that also accepts a photo picked from the Data Library.
 *
 * Two routes into the same place:
 *   drag  -- handled inside ImageDrop, which reads the library's image MIME type
 *   click -- the dock parks the loaded image on `pickedImage`, and this adopts it
 *
 * Kept as a wrapper rather than folded into `ImageDrop` so `ui.jsx` stays free
 * of flow state and remains portable into Stage1 unchanged.
 *
 * `clearPicked()` makes the hand-off one-shot: without it, returning to a step
 * would silently re-adopt a photo the student had already replaced.
 */
export default function LibraryImageDrop(props) {
  const { pickedImage, clearPicked } = useFlow();
  const { onImage } = props;

  useEffect(() => {
    if (!pickedImage) return;
    onImage?.(pickedImage.img, pickedImage.name);
    clearPicked();
  }, [pickedImage, onImage, clearPicked]);

  return <ImageDrop {...props} />;
}
