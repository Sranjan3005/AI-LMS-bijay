import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ico } from '../sutra/icons';
import ChitiCharacter from '../chiti/ChitiCharacter';
import { useChiti } from '../chiti/ChitiProvider';
import { storyFor } from '../../content/moduleStory';
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

  const nextBeat = next ? story.chapters.find(c => c.ty === next)?.beat : null;
  const chiti = useChiti();

  // Chiti reacts to what just happened — a dance for a completed mission, a
  // thumbs-up for a finished chapter — and says it out loud.
  useEffect(() => {
    chiti.dismiss();   // no corner companion; he's the centrepiece here
    const line = justUnlockedAbility && story.ability
      ? `${story.reward} I just unlocked ${story.ability.name}!`
      : `Nice work! That's the ${KIND[subType]} done. I'm one step closer.`;
    const t = setTimeout(() => {
      chiti.perform(justUnlockedAbility ? 'dance' : 'thumbsup', {
        mood: 'happy', say: line, holdMs: justUnlockedAbility ? 6000 : 3000,
      });
    }, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleTitle, subType]);

  return (
    <div className="st-page">
      <motion.div className="st-beatcard"
        initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        <div style={{ width: 210, height: 240, margin: '0 auto' }}>
          <ChitiCharacter renderer={chiti.renderer} action={chiti.action} mood={chiti.mood}
                          speaking={chiti.speaking} intensity={chiti.intensity} big />
        </div>

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
