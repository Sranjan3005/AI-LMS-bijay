import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Plus, Zap } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Breaking Point — the "Understanding AI" demonstration.
 * Act 1: if-else rules deliver a parcel on a calm street (rules work).
 * Act 2: the street changes — cow, puddle, moving dog — rules pile up and fail.
 * Act 3: a tiny Q-learning agent learns the same job by trial and reward.
 */

const COLS = 6, ROWS = 5;
const START = { x: 0, y: 0 };
const GOAL = { x: 5, y: 4 };

// video slot — drop the AI-generated clip here when ready (see plan Appendix A1)
const VIDEO = '';

const key = (x, y) => `${x},${y}`;

/* Scripted rule-following attempts for Acts 1–2. Each attempt: the obstacles on
   the map, the exact path the rules produce, and where/why it fails. */
const ATTEMPTS = [
  {
    obstacles: {},
    path: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[5,3],[5,4]],
    fail: null,
    rulesAfter: 2,
    msg: 'Delivered! Two simple rules were enough: “move right if clear, else move down.”',
  },
  {
    obstacles: { [key(3,0)]: '🐄' },
    path: [[0,0],[1,0],[2,0]],
    fail: { at: [2,0], toward: [3,0], msg: 'A cow sat down on the route. Your rules never mention cows — the robot is stuck bumping into it.' },
    newRule: 'IF cow ahead → go around it',
    rulesAfter: 4,
  },
  {
    obstacles: { [key(3,0)]: '🐄', [key(2,1)]: '💧' },
    path: [[0,0],[1,0],[2,0],[2,1]],
    fail: { at: [2,1], toward: null, msg: 'It went around the cow — straight into a rain puddle. Splash. No rule for puddles either.' },
    newRule: 'IF puddle ahead → jump over',
    rulesAfter: 7,
  },
  {
    obstacles: { [key(3,0)]: '🐄', [key(2,1)]: '💧', [key(4,3)]: '🐕' },
    path: [[0,0],[0,1],[1,1],[1,2],[2,2],[3,2],[4,2],[4,3]],
    fail: { at: [4,3], toward: null, msg: 'A dog ran onto the street — and dogs MOVE. You would need a new rule for every position of every dog in every street in India.' },
    newRule: 'IF dog ahead → wait?? IF dog left…',
    rulesAfter: 12,
  },
];

function Grid({ obstacles, robot, trail, flash }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${COLS}, 52px)`, gridAutoRows: '52px',
      gap: 5, justifyContent: 'center', margin: '14px auto', width: 'max-content',
      background: 'rgba(255,255,255,.03)', padding: 10, borderRadius: 14,
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      {Array.from({ length: ROWS }).flatMap((_, y) =>
        Array.from({ length: COLS }).map((_, x) => {
          const k = key(x, y);
          const isRobot = robot && robot.x === x && robot.y === y;
          const inTrail = trail?.has(k);
          const isGoal = x === GOAL.x && y === GOAL.y;
          return (
            <div key={k} style={{
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', position: 'relative',
              background: inTrail ? 'rgba(94,92,230,.22)' : 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.06)',
              transition: 'background .2s',
              animation: isRobot && flash ? 'bpShake .3s' : 'none',
            }}>
              {isGoal && !isRobot && '🏪'}
              {obstacles[k] && !isRobot && obstacles[k]}
              {isRobot && '🤖'}
            </div>
          );
        })
      )}
      <style>{'@keyframes bpShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'}</style>
    </div>
  );
}

/* ── Acts 1–2: scripted rule-following ── */
function RuleActs({ onBrokenDown }) {
  const [attempt, setAttempt] = useState(0);
  const [robot, setRobot] = useState(START);
  const [trail, setTrail] = useState(new Set([key(0, 0)]));
  const [phase, setPhase] = useState('idle');   // idle | running | success | failed | broken
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);
  const a = ATTEMPTS[attempt];

  const reset = () => {
    clearInterval(timer.current);
    setRobot(START); setTrail(new Set([key(0, 0)])); setPhase('idle'); setFlash(false);
  };

  const run = () => {
    reset(); setPhase('running');
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (i < a.path.length) {
        const [x, y] = a.path[i];
        setRobot({ x, y });
        setTrail(t => new Set([...t, key(x, y)]));
      } else {
        clearInterval(timer.current);
        if (!a.fail) { setPhase('success'); }
        else {
          setFlash(true);
          setPhase(attempt === ATTEMPTS.length - 1 ? 'broken' : 'failed');
          if (attempt === ATTEMPTS.length - 1) onBrokenDown();
        }
      }
    }, 320);
  };

  useEffect(() => () => clearInterval(timer.current), []);

  const rules = ['IF path ahead is clear → move right', 'ELSE → move down',
    ...ATTEMPTS.slice(1, attempt + 1).filter(x => x.newRule).map(x => x.newRule)];

  return (
    <div className={s.card}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <h3 style={{ margin: '0 0 6px' }}>
            {attempt === 0 ? 'Act 1 · Program the robot' : `Act 2 · The street changes (attempt ${attempt + 1})`}
          </h3>
          <p className={s.muted} style={{ margin: '0 0 10px', lineHeight: 1.55 }}>
            {attempt === 0
              ? 'The robot follows your rules exactly — nothing more, nothing less. Deliver the parcel to the shop 🏪.'
              : 'Same rules, new street. Run it and see what happens.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {rules.map((r, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 10, fontSize: '.88rem',
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                fontFamily: 'Consolas, monospace',
                color: i >= 2 ? '#ffd60a' : '#cdd1e0',
              }}>{i + 1}. {r}</div>
            ))}
            <div style={{ fontSize: '.85rem', color: '#9aa0b5' }}>Rules written: <b style={{ color: '#fff' }}>{a.rulesAfter ?? rules.length}</b>{phase === 'broken' && ' → ∞'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className={s.navBtn} onClick={run} disabled={phase === 'running'}>
              <Play size={15} /> Run the robot
            </button>
            <button className={`${s.navBtn} ${s.navGhost}`} onClick={reset}><RotateCcw size={15} /> Reset</button>
            {phase === 'failed' && attempt < ATTEMPTS.length - 1 && (
              <button className={s.pillBtn} onClick={() => { setAttempt(attempt + 1); reset(); }}>
                <Plus size={15} /> Add rule &amp; try the next street
              </button>
            )}
            {phase === 'success' && attempt === 0 && (
              <button className={s.pillBtn} onClick={() => { setAttempt(1); reset(); }}>
                Next: the street changes →
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: '1 1 340px' }}>
          <Grid obstacles={a.obstacles} robot={robot} trail={trail} flash={flash} />
        </div>
      </div>

      {phase === 'success' && <div className={s.banner}>✅ {a.msg}</div>}
      {phase === 'failed' && <div className={`${s.banner} ${s.bannerWarn}`}>💥 {a.fail.msg}</div>}
      {phase === 'broken' && (
        <div className={`${s.banner} ${s.bannerWarn}`}>
          🛑 <b>This is the breaking point.</b> {a.fail.msg}<br />
          Writing rules for every situation is impossible. What if, instead of telling the robot
          <i> how</i> to do the job… we let it <b>learn</b> the job? Open <b>Act 3</b> below. ↓
        </div>
      )}
    </div>
  );
}

/* ── Act 3: real Q-learning on the same street ── */
const ACTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function LearnAct() {
  const baseObstacles = { [key(3, 0)]: '🐄', [key(2, 1)]: '💧', [key(4, 3)]: '🐕' };
  const [extraObs, setExtraObs] = useState(null);
  const obstacles = extraObs ? { ...baseObstacles, [extraObs]: '🚧' } : baseObstacles;

  const q = useRef({});
  const [robot, setRobot] = useState(START);
  const [trail, setTrail] = useState(new Set());
  const [episode, setEpisode] = useState(0);
  const [scores, setScores] = useState([]);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);
  const obsRef = useRef(obstacles);
  obsRef.current = obstacles;

  const qGet = (st, ai) => q.current[`${st}|${ai}`] ?? 0;
  const qSet = (st, ai, v) => { q.current[`${st}|${ai}`] = v; };

  const runEpisodes = (count) => {
    if (running) return;
    setRunning(true);
    let ep = 0, pos = { ...START }, score = 0, steps = 0;
    let epsNow = Math.max(0.05, 0.6 * Math.pow(0.75, episode));
    setTrail(new Set([key(START.x, START.y)]));

    timer.current = setInterval(() => {
      const st = key(pos.x, pos.y);
      // ε-greedy action choice
      let ai;
      if (Math.random() < epsNow) ai = Math.floor(Math.random() * 4);
      else ai = ACTIONS.map((_, i) => i).reduce((b, i) => (qGet(st, i) > qGet(st, b) ? i : b), 0);

      const nx = Math.min(COLS - 1, Math.max(0, pos.x + ACTIONS[ai][0]));
      const ny = Math.min(ROWS - 1, Math.max(0, pos.y + ACTIONS[ai][1]));
      const nk = key(nx, ny);
      let reward = -0.2, moved = true;
      if (obsRef.current[nk]) { reward = -5; moved = false; setFlash(true); setTimeout(() => setFlash(false), 250); }
      else if (nx === GOAL.x && ny === GOAL.y) reward = 10;

      const ns = moved ? nk : st;
      const maxNext = Math.max(...ACTIONS.map((_, i) => qGet(ns, i)));
      qSet(st, ai, qGet(st, ai) + 0.5 * (reward + 0.9 * maxNext - qGet(st, ai)));

      if (moved) { pos = { x: nx, y: ny }; setRobot({ ...pos }); setTrail(t => new Set([...t, nk])); }
      score += reward; steps += 1;

      const done = (pos.x === GOAL.x && pos.y === GOAL.y) || steps > 60;
      if (done) {
        setScores(sc => [...sc.slice(-11), Math.round(score)]);
        setEpisode(e => e + 1);
        ep += 1; epsNow = Math.max(0.05, epsNow * 0.75);
        if (ep >= count) { clearInterval(timer.current); setRunning(false); return; }
        pos = { ...START }; score = 0; steps = 0;
        setRobot({ ...START }); setTrail(new Set([key(START.x, START.y)]));
      }
    }, 45);
  };

  useEffect(() => () => clearInterval(timer.current), []);

  const dropObstacle = () => {
    // block a cell the learned route loves, forcing a re-learn
    setExtraObs(key(5, 2));
  };
  const best = scores.length ? Math.max(...scores) : null;

  return (
    <div className={s.card} style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <h3 style={{ margin: '0 0 6px' }}>Act 3 · Let it learn</h3>
          <p className={s.muted} style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
            No rules this time. The robot only knows: reaching the shop earns <b>+10</b>,
            bumping into trouble costs <b>−5</b>, and wandering wastes time. Watch it get
            better at the job <i>by itself</i> — that is reinforcement learning.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <button className={s.navBtn} onClick={() => runEpisodes(6)} disabled={running}>
              <Zap size={15} /> {episode === 0 ? 'Start learning (6 tries)' : 'Keep practising'}
            </button>
            {episode >= 6 && !extraObs && (
              <button className={s.pillBtn} onClick={dropObstacle}>🚧 Drop a new obstacle on its route</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={s.score}>Tries: {episode}</span>
            {best !== null && <span className={s.score}>Best score: {best}</span>}
          </div>
          {scores.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64, marginTop: 14 }}>
              {scores.map((v, i) => (
                <div key={i} title={`try ${i + 1}: ${v}`} style={{
                  width: 18, borderRadius: 4,
                  height: `${Math.max(6, ((v + 25) / 35) * 100)}%`,
                  background: v > 0 ? 'linear-gradient(180deg,#30d158,#0a84ff)' : 'rgba(255,69,58,.6)',
                }} />
              ))}
            </div>
          )}
          {episode >= 6 && (
            <div className={s.banner} style={{ marginTop: 14 }}>
              🧠 Nobody wrote a single new rule — the robot <b>earned</b> its knowledge from
              experience. Rules are <i>written</i>; learning is <i>earned</i>. That difference
              is what makes AI different from ordinary programs.
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 340px' }}>
          <Grid obstacles={obstacles} robot={robot} trail={trail} flash={flash} />
          <p className={s.muted} style={{ textAlign: 'center', fontSize: '.85rem' }}>
            Purple cells = places it tried this run. Early tries look drunk — that&apos;s the point.
          </p>
        </div>
      </div>
    </div>
  );
}

const BreakingPoint = ({ onBack }) => {
  const [, setBroken] = useState(false);
  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Understanding AI · Demonstration"
      accent="#BF5AF2"
      title={<>When rules break — <span className="grad" style={{ background: 'linear-gradient(120deg,#5E5CE6,#BF5AF2 52%,#64D2FF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>and robots learn.</span></>}
      lede="First program a delivery robot the old way — with if-else rules. Then watch the real world break them. Then let the robot learn the job itself."
      video={VIDEO}
      tryLabel="Try it"
      realLife={[
        { icon: '📧', title: 'Spam filters', text: 'Nobody can write rules for every trick spammers invent — so your inbox learns from millions of examples instead.' },
        { icon: '📺', title: 'YouTube recommendations', text: 'No rulebook says what you will like. The system learns from what you (and crores of others) watch.' },
        { icon: '🤖', title: 'Robot vacuum cleaners', text: 'Every home has different furniture. The robot learns the map of your house by exploring it — trial and error.' },
        { icon: '🚗', title: 'Self-driving cars', text: 'Indian roads have cows, carts and surprise scooters. Impossible to hard-code — the car must learn from experience.' },
      ]}
      check={{
        q: 'Quick check: why did the if-else robot keep failing?',
        options: [
          'The computer was too slow',
          'The real world keeps changing, and rules can’t cover every situation',
          'The robot was badly built',
          'It needed a bigger battery',
        ],
        answer: 1,
        explain: 'Exactly. Rules only cover situations the programmer imagined. Learning systems improve from experience — that is the core idea of machine learning.',
      }}
    >
      <RuleActs onBrokenDown={() => setBroken(true)} />
      <LearnAct />
    </DemoFlow>
  );
};

export default BreakingPoint;
