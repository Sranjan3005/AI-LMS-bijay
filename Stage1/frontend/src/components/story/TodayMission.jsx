import React from 'react';
import { Ico } from '../sutra/icons';
import { firstName } from '../sutra/SutraShell';
import ChitiRobot from './ChitiRobot';
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
  const abilities = abilityState(activity).filter(a => a.unlocked).map(a => a.id);
  const rail = abilityState(activity);
  const story = current ? storyFor(current.moduleTitle) : null;
  const beat = current ? (beatFor(current.moduleTitle, current.subType) || story?.hook) : '';

  const KIND = { theory: 'Briefing', demo: 'Watch Chiti try', hands: 'Your turn', assign: 'The verdict' };

  return (
    <section className="st-mission" aria-label="Today's mission">
      <div className="st-mission-grid">
        <div style={{ justifySelf: 'center' }}>
          <ChitiRobot abilities={abilities} mood={current ? 'point' : 'cheer'} size={150} />
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
