import { useRef, useLayoutEffect } from 'react';

/**
 * AutoGrowTextarea — a textarea that grows to fit its content so a node card
 * sizes itself instead of trapping the text in a fixed 2-line box with a tiny
 * inner scrollbar. Grows up to `maxHeight`, then scrolls.
 *
 * `nodrag nowheel` keep typing/scrolling from dragging the node or zooming the
 * React Flow canvas.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  className = '',
  minHeight = 44,
  maxHeight = 260,
  style,
  ...rest
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';                                   // reset so shrink works too
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value, maxHeight]);

  return (
    <textarea
      ref={ref}
      className={`${className} nodrag nowheel`.trim()}
      value={value}
      onChange={onChange}
      style={{ minHeight, maxHeight, overflowY: 'auto', resize: 'none', ...style }}
      {...rest}
    />
  );
}
