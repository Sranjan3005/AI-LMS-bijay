import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { DPR_CAP } from './capability';

// Chiti3D — the 3D character. Loaded lazily so three.js never lands in the
// main bundle; the whole module is a separate chunk fetched only on capable
// devices.
//
// The model ships 14 clips; we map our semantic action names onto them.
const MODEL = '/models/chiti.glb';

const CLIP = {
  idle: 'Idle',
  walking: 'Walking',
  running: 'Running',
  dance: 'Dance',
  jump: 'Jump',
  wave: 'Wave',
  thumbsup: 'ThumbsUp',
  yes: 'Yes',
  no: 'No',
  point: 'Wave',        // no dedicated point clip — a wave reads as "look here"
  think: 'Standing',
  sitting: 'Sitting',
};

// Face morph targets on the Head mesh: Angry / Surprised / Sad.
const MORPH = {
  neutral:   {},
  happy:     {},                       // neutral face + posture carries the joy
  sad:       { Sad: 1 },
  surprised: { Surprised: 1 },
  angry:     { Angry: 1 },
};

function Model({ action, mood, speaking, intensity, onReady }) {
  const group = useRef();
  // Plain GLTFLoader rather than drei's useGLTF: the latter wires up DRACO /
  // meshopt decoders this model doesn't need, and never resolved here.
  const { scene, animations } = useLoader(GLTFLoader, MODEL);
  const { actions } = useAnimations(animations, group);
  const head = useRef(null);
  const morphRef = useRef({});          // smoothed morph influences
  const current = useRef(null);
  const talkPhase = useRef(0);

  // Find the head mesh once so we can drive expressions + talking motion.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh && o.morphTargetDictionary && o.name === 'Head') head.current = o;
      if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = true; }
    });
    onReady?.();
  }, [scene, onReady]);

  // Cross-fade between clips whenever the action changes.
  useEffect(() => {
    const name = CLIP[action] || CLIP.idle;
    const next = actions[name];
    if (!next) return;
    const prev = current.current;
    if (prev === next) return;

    // One-shot emotes play once and hold their last frame; the director flips
    // us back to idle on a timer, so looping them would double up.
    const oneShot = ['Jump', 'Wave', 'ThumbsUp', 'Yes', 'No'].includes(name);
    next.reset();
    next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
    next.clampWhenFinished = oneShot;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(0.28).play();
    if (prev) prev.fadeOut(0.28);
    current.current = next;
  }, [action, actions]);

  useFrame((state, delta) => {
    // (drei's useAnimations drives the mixer itself — we only add expression
    // and talking motion on top of the playing clip.)

    // ── expressions: ease morph influences toward the target mood ──
    const h = head.current;
    if (h?.morphTargetDictionary) {
      const target = MORPH[mood] || {};
      for (const key of Object.keys(h.morphTargetDictionary)) {
        const idx = h.morphTargetDictionary[key];
        const want = target[key] || 0;
        const cur = morphRef.current[key] ?? 0;
        const nextVal = cur + (want - cur) * Math.min(1, delta * 6);
        morphRef.current[key] = nextVal;
        h.morphTargetInfluences[idx] = nextVal;
      }
    }

    // ── talking: bob the head per word so he reads as actually speaking ──
    if (group.current) {
      if (speaking) {
        talkPhase.current += delta * 14;
        const amp = 0.05 + intensity * 0.09;
        group.current.rotation.x = Math.sin(talkPhase.current) * amp * 0.5;
        group.current.position.y = Math.abs(Math.sin(talkPhase.current * 0.5)) * amp * 0.25;
      } else {
        talkPhase.current = 0;
        group.current.rotation.x += (0 - group.current.rotation.x) * Math.min(1, delta * 5);
        group.current.position.y += (0 - group.current.position.y) * Math.min(1, delta * 5);
      }
      // gentle idle sway so he's never perfectly still
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
    }
  });

  // Measured world height is 4.79 units (the armature node scales the geometry
  // x100). At scale 0.48 he stands ~2.3 units tall, centred at y=-1.15, which
  // leaves headroom inside the ~3.8-unit camera frame below — arms raised in a
  // wave still clear the top edge.
  return <group ref={group} dispose={null}><primitive object={scene} scale={0.48} position={[0, -1.15, 0]} /></group>;
}

// NB: no module-scope preload here. `useLoader.preload` does not exist in
// @react-three/fiber v9 — calling it throws while the module is evaluating,
// which silently rejects the lazy import and drops us to the 2D rig forever.

/**
 * @param {string} action   semantic action from the director
 * @param {string} mood
 * @param {boolean} speaking
 * @param {number} intensity
 * @param {boolean} big      stage mode (bigger framing) vs corner companion
 */
export default function Chiti3D({ action, mood, speaking, intensity, big = false, onReady }) {
  // Start visible so the scene always mounts and the model loads. If we
  // initialised from `document.hidden` instead, a tab that's backgrounded at
  // load time would get frameloop="never", R3F would never mount the scene
  // graph, and the character would stay frozen even after the tab is focused.
  const [visible, setVisible] = useState(true);
  const onScreen = useRef(true);          // ref, not state — the observer must
  const hostRef = useRef(null);           // not re-subscribe on every change

  // Once loaded, pause the render loop when the tab is hidden or the canvas
  // scrolls out of view — essential for battery on phones and weak laptops.
  useEffect(() => {
    const sync = () => setVisible(!document.hidden && onScreen.current);
    document.addEventListener('visibilitychange', sync);
    let io;
    if (hostRef.current && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => { onScreen.current = e.isIntersecting; sync(); },
                                    { threshold: 0.05 });
      io.observe(hostRef.current);
    }
    return () => { document.removeEventListener('visibilitychange', sync); io?.disconnect(); };
  }, []);

  return (
    <div ref={hostRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={DPR_CAP}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: false, powerPreference: 'low-power', alpha: true }}
        camera={{ position: big ? [0, 0.1, 5.0] : [0, 0.1, 5.4], fov: 42 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#8ea2ff" />
        <React.Suspense fallback={null}>
          <Model action={action} mood={mood} speaking={speaking} intensity={intensity} onReady={onReady} />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
