import React from 'react';
import { motion } from 'framer-motion';
import { Ico } from '../sutra/icons';
import ChitiRobot from './ChitiRobot';
import { storyFor } from '../../content/moduleStory';
import { abilityState } from '../../utils/chitiProgress';
import './story.css';

// StoryBeat — the reveal after finishing a chapter. Instead of dumping the
// student back onto a scrolled accordion, Chiti reacts, shows what was unlocked,
// and points at the next chapter. This is where the story keeps its momentum.
//
// props:
//   moduleTitle   the module just worked on
//   subType       the chapter just finished (theory/demo/hands/assign)
//   m             module object (for chapter order + module_key `open`)
//   activity      updated {module_key: [subtypes]}
//   onNextChapter(subType), onOpenCaseFile(), onBackToMissions()
const KIND = { theory: 'briefing', demo: 'demo', hands: 'hands-on', assign: 'verdict' };
const CORE = ['theory', 'demo', 'hands'];

export default function StoryBeat({ moduleTitle, subType, m, activity = {}, onNextChapter, onOpenCaseFile, onBackToMissions }) {
  const story = storyFor(moduleTitle);
  const opened = activity[m?.open] || [];
  const order = story.chapters.map(c => c.ty);
  const next = order.find(ty => !opened.includes(ty) && !(ty === 'assign' && !CORE.every(c => opened.includes(c))));
  const moduleComplete = CORE.every(c => opened.includes(c));
  const justUnlockedAbility = moduleComplete && CORE.includes(subType) &&
    // the completing chapter was the last of the three
    CORE.filter(c => opened.includes(c)).length === 3;

  const abilities = abilityState(activity).filter(a => a.unlocked).map(a => a.id);
  const nextBeat = next ? story.chapters.find(c => c.ty === next)?.beat : null;

  return (
    <div className="st-page">
      <motion.div className="st-beatcard"
        initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        <ChitiRobot abilities={abilities} mood="cheer" size={130} />

        {justUnlockedAbility && story.ability ? (
          <>
            <h1>Mission complete!</h1>
            <p className="st-beat-say">{story.reward}</p>
            <div className="st-reward"><span>{story.ability.emoji}</span>New ability unlocked: {story.ability.name}</div>
          </>
        ) : (
          <>
            <h1>Nice work! 🎯</h1>
            <p className="st-beat-say">
              You finished the <strong>{KIND[subType]}</strong> for <strong style={{ color: '#64D2FF' }}>{story.codename}</strong>.
              {' '}Chiti is one step closer.
            </p>
          </>
        )}

        {next && nextBeat && (
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: 'rgba(100,210,255,.08)', border: '1px solid rgba(100,210,255,.24)', textAlign: 'left' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#64D2FF', marginBottom: 4 }}>Next chapter</div>
            <div style={{ color: '#e3e7f5', lineHeight: 1.45 }}>{nextBeat}</div>
          </div>
        )}

        <div className="st-beat-cta">
          {next
            ? <button className="st-btn" onClick={() => onNextChapter(next)}>Next chapter<Ico name="arrowR" size={18} /></button>
            : <button className="st-btn" onClick={onOpenCaseFile}>Review the case file<Ico name="arrowR" size={18} /></button>}
          <button className="st-btn ghost" onClick={onBackToMissions}>Back to my missions</button>
        </div>
      </motion.div>
    </div>
  );
}
