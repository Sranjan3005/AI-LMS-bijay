import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Spotlight -- Chiti points at the thing it is talking about.
 *
 * The problem this solves: a guide that narrates from a fixed dock at the
 * bottom of the screen is just a subtitle track. The student reads "drag a
 * dataset in" and then has to go find what that means. Every sentence costs
 * them a scan of the page.
 *
 * So a step declares `spotlight('drop-zone')` and this dims everything else and
 * rings the element registered under that name. The ring follows the element on
 * scroll and resize, because a highlight that drifts off its target is worse
 * than none.
 *
 * Deliberately NOT a modal: `pointer-events: none` on the overlay, so the
 * student can still interact with anything, including the thing being pointed
 * at. It guides; it never traps.
 */

const SpotlightContext = createContext(null);
export const useSpotlight = () => useContext(SpotlightContext) || {
  register: () => () => {}, spotlight: () => {}, clear: () => {}, target: null,
};

export function SpotlightProvider({ children }) {
  const targets = useRef(new Map());
  const [target, setTarget] = useState(null);   // { id, label }
  const [rect, setRect] = useState(null);

  /** Steps call this via ref callback to say "this node is `id`". */
  const register = useCallback((id, node) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
    return () => targets.current.delete(id);
  }, []);

  const spotlight = useCallback((id, label = null) => {
    setTarget(id ? { id, label } : null);
  }, []);

  const clear = useCallback(() => setTarget(null), []);

  // Track the element. rAF rather than a resize/scroll listener alone, because
  // the target often appears or moves as a result of the very state change that
  // requested the spotlight, so a one-shot measure lands on the wrong box.
  useEffect(() => {
    if (!target) { setRect(null); return undefined; }
    let raf = 0;
    let misses = 0;

    const tick = () => {
      const node = targets.current.get(target.id);
      if (node && node.isConnected) {
        misses = 0;
        const r = node.getBoundingClientRect();
        setRect((prev) => {
          if (prev && Math.abs(prev.top - r.top) < 0.5
              && Math.abs(prev.left - r.left) < 0.5
              && Math.abs(prev.width - r.width) < 0.5
              && Math.abs(prev.height - r.height) < 0.5) return prev;
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        });
      } else if (++misses > 60) {
        // The target never appeared -- drop the spotlight rather than dimming
        // the whole page around nothing.
        setRect(null);
        setTarget(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const value = useMemo(
    () => ({ register, spotlight, clear, target: target?.id ?? null }),
    [register, spotlight, clear, target],
  );

  const pad = 8;
  const overlay = rect ? createPortal(
    <>
      <div
        className="spot-ring"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
      />
      {target?.label && (
        <div
          className="spot-tag"
          style={{
            top: Math.max(6, rect.top - pad - 28),
            left: rect.left - pad,
          }}
        >
          {target.label}
        </div>
      )}
    </>,
    document.body,
  ) : null;

  return (
    <SpotlightContext.Provider value={value}>
      {children}
      {overlay}
    </SpotlightContext.Provider>
  );
}

/**
 * Mark a region as spotlightable.
 *
 *   <Spot id="drop-zone"><DatasetPicker /></Spot>
 */
export function Spot({ id, children, as: Tag = 'div', ...rest }) {
  const { register } = useSpotlight();
  const ref = useRef(null);

  useEffect(() => {
    register(id, ref.current);
    return () => register(id, null);
  }, [id, register]);

  return <Tag ref={ref} {...rest}>{children}</Tag>;
}
