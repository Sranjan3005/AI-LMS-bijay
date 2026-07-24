import React, { Suspense, useEffect, useState } from 'react';
import ChitiSVG from './ChitiSVG';

// Lazy chunk: three.js + drei + the model loader only download on devices that
// passed the capability check. Everyone else never pays for it.
const Chiti3D = React.lazy(() => import('./Chiti3D'));

class GLErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  // Loud on purpose: a silent fallback here looks identical to "3D is off",
  // which makes a broken 3D path very hard to spot.
  componentDidCatch(err, info) { console.error('[Chiti] 3D renderer failed — falling back to the 2D rig.', err, info); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * ChitiCharacter — draws the character with whichever renderer this device can
 * handle. The 2D rig doubles as the loading state and the crash fallback, so
 * Chiti is *always* on screen, never a blank box.
 */
export default function ChitiCharacter({ renderer = 'svg', action, mood, speaking, intensity, big = false }) {
  const [webglLost, setWebglLost] = useState(false);
  const [ready3d, setReady3d] = useState(false);

  // A lost WebGL context (common when a weak GPU is under pressure) should
  // demote to 2D rather than leave a dead canvas.
  useEffect(() => {
    const onLost = () => setWebglLost(true);
    window.addEventListener('webglcontextlost', onLost, true);
    return () => window.removeEventListener('webglcontextlost', onLost, true);
  }, []);

  const svg = <ChitiSVG action={action} mood={mood} speaking={speaking} intensity={intensity} big={big} />;

  if (renderer !== '3d' || webglLost) return svg;

  // The 3D canvas mounts underneath and the 2D rig stays on top until the model
  // reports ready — so the character slot is never an empty box while ~460KB
  // downloads, which matters most on exactly the slow devices we're targeting.
  return (
    <GLErrorBoundary fallback={svg}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Suspense fallback={null}>
          <Chiti3D action={action} mood={mood} speaking={speaking} intensity={intensity}
                   big={big} onReady={() => setReady3d(true)} />
        </Suspense>
        {!ready3d && (
          <div style={{ position: 'absolute', inset: 0 }}>{svg}</div>
        )}
      </div>
    </GLErrorBoundary>
  );
}
