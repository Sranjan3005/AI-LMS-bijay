import React from 'react';
import { Ico } from '../sutra/icons';
import ChitiRobot from './ChitiRobot';
import { storyFor } from '../../content/moduleStory';
import { abilityState } from '../../utils/chitiProgress';
import './story.css';

// CaseFile — the module intro. Opens BEFORE the first chapter: sets the scene
// (hook + stakes), then lists chapters that route through the existing lessons.
// It changes nothing about how the activities themselves run.
//
// props:
//   m           module object from StudentHome PHASES (has t, open, subs, m, rc)
//   activity    {module_key: [subtypes opened]}
//   onOpenChapter(subType)   launch that chapter's real activity
//   onBack()
const KIND = { theory: 'Briefing', demo: 'Watch Chiti try', hands: 'Your turn', assign: 'The verdict' };
const CORE = ['theory', 'demo', 'hands'];

export default function CaseFile({ m, activity = {}, onOpenChapter, onBack }) {
  const story = storyFor(m.t);
  const opened = activity[m.open] || [];
  const coreDone = CORE.every(c => opened.includes(c));
  const abilities = abilityState(activity).filter(a => a.unlocked).map(a => a.id);
  const cc = m.rc || '#64D2FF';

  const isDone = (ty) => opened.includes(ty);
  const isLocked = (ty) => ty === 'assign' && !coreDone;

  return (
    <div className="st-page">
      <div className="st-wrap">
        <button className="st-back" onClick={onBack}><Ico name="arrowL" size={16} />Back to my missions</button>

        <div className="st-casefile">
          <div className="st-casefile-head">
            <ChitiRobot abilities={abilities} mood="think" size={92} />
            <div>
              <div className="st-casefile-tag">Case file · {m.cls}</div>
              <h1>{story.codename}</h1>
            </div>
          </div>

          <p className="st-hook">{story.hook}</p>

          {story.stakes && (
            <div className="st-stakes">
              <Ico name="bolt" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>The stake:</strong> {story.stakes}</span>
            </div>
          )}

          <div className="st-chapters">
            {story.chapters.map((ch, i) => {
              const done = isDone(ch.ty);
              const locked = isLocked(ch.ty);
              return (
                <div
                  key={ch.ty}
                  className={`st-chapter${locked ? ' locked' : ''}`}
                  style={{ '--cc': cc }}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-disabled={locked || undefined}
                  onClick={() => !locked && onOpenChapter(ch.ty)}
                  onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpenChapter(ch.ty); } }}
                >
                  <div className="st-ch-no">{i + 1}</div>
                  <div>
                    <div className="st-ch-kind">{KIND[ch.ty]}</div>
                    <div className="st-ch-beat">{ch.beat}</div>
                  </div>
                  <div className="st-ch-state">
                    {locked
                      ? <><Ico name="lock" size={15} />Finish the first three</>
                      : done
                        ? <span className="st-ch-done"><Ico name="tick" size={16} /> Done</span>
                        : <>Start<Ico name="arrowR" size={16} /></>}
                  </div>
                </div>
              );
            })}
          </div>

          {story.ability && (
            <p style={{ marginTop: 22, color: '#aeb4cd', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico name="spark" size={16} style={{ color: '#8ff0a6' }} />
              Finish all four chapters to unlock Chiti's ability: <strong style={{ color: '#8ff0a6' }}>{story.ability.emoji} {story.ability.name}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
