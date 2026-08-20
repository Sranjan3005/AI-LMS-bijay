import React, { useEffect } from 'react';
import { Ico } from '../sutra/icons';
import { firstName } from '../sutra/SutraShell';
import ChitiCharacter from '../chiti/ChitiCharacter';
import { useChiti } from '../chiti/ChitiProvider';
import { storyFor, beatFor } from '../../content/moduleStory';
import { abilityState } from '../../utils/chitiProgress';
import './story.css';

// TodayMission — the first thing a logged-in student sees. Replaces the old
// marketing hero (which was written for buyers, not kids). One robot, one clear
// next step, and a visible sense of Chiti growing.
//
// props:
//   user, activity        (activity = {module_key: [subtypes]})
//   current               { moduleTitle, subType, moduleKey } — the next chapter to do
//   onStartMission()      open the case file for `current.moduleTitle`
//   onResumeChapter()     jump straight into the next chapter's activity
export default function TodayMission({ user, activity = {}, current, onStartMission, onResumeChapter }) {
  const rail = abilityState(activity);
  const story = current ? storyFor(current.moduleTitle) : null;
  const beat = current ? (beatFor(current.moduleTitle, current.subType) || story?.hook) : '';

  const KIND = { theory: 'Briefing', demo: 'Watch Chiti try', hands: 'Your turn', assign: 'The verdict' };
  const chiti = useChiti();

  // Chiti welcomes the student back and names the next mission — once per visit
  // to the dashboard, not on every re-render.
  useEffect(() => {
    chiti.dismiss();   // he's inline here, so no corner companion
    const line = current
      ? `Welcome back, ${firstName(user?.name)}! Next up is ${story.codename}. Ready when you are.`
      : `We did it, ${firstName(user?.name)}! I'm fully built — thanks to you.`;
    const t = setTimeout(() => {
      chiti.perform(current ? 'wave' : 'dance', { mood: 'happy', say: line, holdMs: 3200 });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.moduleTitle, current?.subType]);

  // Clicking Chiti gets a reaction — kids will try it immediately.
  const poke = () => {
    const lines = current
      ? [`We're on ${story.codename}. ${beat}`, "Come on, let's get this one done!", "I can't learn this by myself, you know."]
      : ['Look at me now! Brain, eyes, hands — the lot.', 'Want to run a mission again for practice?'];
    chiti.perform('jump', { mood: 'happy', say: lines[Math.floor(Math.random() * lines.length)], holdMs: 2600 });
  };

  return (
    <section className="st-mission" aria-label="Today's mission">
      <div className="st-mission-grid">
        <div style={{ justifySelf: 'center', width: 160, height: 190, cursor: 'pointer' }}
             onClick={poke} role="button" tabIndex={0} aria-label="Chiti — click to talk to him"
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } }}>
          <ChitiCharacter renderer={chiti.renderer} action={chiti.action} mood={chiti.mood}
                          speaking={chiti.speaking} intensity={chiti.intensity} />
        </div>
        <div>
          <span className="st-mission-eyebrow"><Ico name="spark" size={14} />Today · raising Chiti</span>
          {current ? (
            <>
              <h2>Next up: <span className="st-codename">{story.codename}</span></h2>
              <p className="st-beat">
                <strong style={{ color: '#8ea2ff' }}>{KIND[current.subType] || 'Chapter'} — </strong>
                {beat}
              </p>
              <div className="st-mission-cta">
                <button className="st-btn" onClick={onResumeChapter}>
                  Continue the mission<Ico name="arrowR" size={18} />
                </button>
                <button className="st-btn ghost" onClick={onStartMission}>
                  Open the case file
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Chiti is fully built, {firstName(user?.name)}. 🎉</h2>
              <p className="st-beat">
                You've raised Chiti from a clueless robot into one that can see, think, judge and act — with a conscience.
                Replay any mission to sharpen a skill, or help a classmate raise theirs.
              </p>
            </>
          )}

          <div className="st-rail" aria-label="Chiti's abilities">
            {rail.map(a => (
              <span key={a.id} className={`st-chip ${a.unlocked ? 'on' : 'off'}`} title={a.module}>
                <span className="st-chip-em">{a.emoji}</span>{a.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
