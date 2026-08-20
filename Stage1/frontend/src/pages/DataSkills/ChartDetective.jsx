import React, { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Chart Detective — "Working with Data" demonstration.
 * 4 rounds: read a bar, line and pie chart correctly, then catch a biased survey.
 */

// video slot — drop the AI-generated clip here when ready (plan Appendix A2)
const VIDEO = '';

const COLORS = ['#64D2FF', '#5E5CE6', '#BF5AF2', '#30D158', '#FF9F0A', '#FF453A'];

const canteen = [
  { name: 'Samosa', sold: 92 }, { name: 'Sandwich', sold: 41 },
  { name: 'Idli', sold: 63 }, { name: 'Fruit cup', sold: 22 }, { name: 'Maggi', sold: 78 },
];
const attendance = [
  { month: 'Jan', pct: 92 }, { month: 'Feb', pct: 90 }, { month: 'Mar', pct: 84 },
  { month: 'Apr', pct: 76 }, { month: 'May', pct: 61 }, { month: 'Jun', pct: 88 }, { month: 'Jul', pct: 93 },
];
const transport = [
  { name: 'School bus', v: 45 }, { name: 'Cycle', v: 25 }, { name: 'Walk', v: 18 }, { name: 'Car', v: 12 },
];
const biased = [
  { name: 'Cricket', v: 34 }, { name: 'Football', v: 3 }, { name: 'Badminton', v: 2 }, { name: 'Chess', v: 1 },
];

const ROUNDS = [
  {
    title: 'Round 1 · The canteen bar chart',
    intro: 'The canteen uncle counted what he sold on Monday. Bars compare categories — taller bar, bigger number.',
    chart: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={canteen} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
          <XAxis dataKey="name" stroke="#9aa0b5" fontSize={12} />
          <YAxis stroke="#9aa0b5" fontSize={12} />
          <Tooltip contentStyle={{ background: '#12142a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10 }} />
          <Bar dataKey="sold" radius={[6, 6, 0, 0]}>
            {canteen.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ),
    q: 'If the uncle can stock only TWO snacks tomorrow, which two should he pick?',
    options: ['Samosa & Maggi', 'Fruit cup & Sandwich', 'Idli & Fruit cup', 'Sandwich & Maggi'],
    answer: 0,
    explain: 'The two tallest bars — Samosa (92) and Maggi (78) — sell the most. Bar charts answer “which category wins?” at a glance.',
  },
  {
    title: 'Round 2 · The attendance line',
    intro: 'A line chart shows how something changes over time. Read the shape, not just the points.',
    chart: (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={attendance} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
          <XAxis dataKey="month" stroke="#9aa0b5" fontSize={12} />
          <YAxis domain={[50, 100]} stroke="#9aa0b5" fontSize={12} />
          <Tooltip contentStyle={{ background: '#12142a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10 }} />
          <Line type="monotone" dataKey="pct" stroke="#64D2FF" strokeWidth={3} dot={{ r: 4, fill: '#64D2FF' }} />
        </LineChart>
      </ResponsiveContainer>
    ),
    q: 'Attendance dips hard in May, then shoots back up. What most likely explains the dip?',
    options: ['Students stopped liking school', 'Summer holidays / exam break in May', 'The data is wrong', 'A new principal joined'],
    answer: 1,
    explain: 'A detective asks WHY a line moves. A deep dip in May in India almost always means summer break — context explains data.',
  },
  {
    title: 'Round 3 · The transport pie',
    intro: 'A pie shows parts of a whole — all slices together = 100% of students.',
    chart: (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={transport} dataKey="v" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
            {transport.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 12, color: '#9aa0b5' }} />
          <Tooltip contentStyle={{ background: '#12142a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    ),
    q: 'Roughly what fraction of students do NOT use the school bus?',
    options: ['About a quarter', 'About half', 'A little more than half', 'Almost all'],
    answer: 2,
    explain: 'The bus slice is 45%, so the rest — 55%, a little more than half — come by cycle, walking or car. Pies are for “share of total”.',
  },
  {
    title: 'Round 4 · Something smells wrong 🕵️',
    intro: '“Favourite sport of our school” — survey of 40 students, taken during cricket practice, next to the cricket nets.',
    chart: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={biased} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
          <XAxis dataKey="name" stroke="#9aa0b5" fontSize={12} />
          <YAxis stroke="#9aa0b5" fontSize={12} />
          <Tooltip contentStyle={{ background: '#12142a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10 }} />
          <Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#FF9F0A" />
        </BarChart>
      </ResponsiveContainer>
    ),
    q: 'The chart says 85% of the school loves cricket. What’s wrong here?',
    options: [
      'Nothing — cricket IS that popular',
      'The sample is biased: they only asked students already at cricket practice',
      'The bars are the wrong colour',
      '40 students is too many to survey',
    ],
    answer: 1,
    explain: 'A chart is only as honest as its data. Asking cricket players “do you like cricket?” guarantees the answer. This is sampling bias — the #1 way data (and AI trained on it) goes wrong.',
  },
];

const ChartDetective = ({ onBack }) => {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const done = round >= ROUNDS.length;
  const r = ROUNDS[Math.min(round, ROUNDS.length - 1)];

  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === r.answer) setScore(sc => sc + 1);
  };

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Working with Data · Demonstration"
      accent="#64D2FF"
      title="Chart Detective."
      lede="Charts are how data talks. Read three charts like a detective — then catch one that's lying to you."
      video={VIDEO}
      realLife={[
        { icon: '📱', title: 'Screen-time dashboard', text: 'Your phone shows a bar chart of app usage — same reading skill, real decisions.' },
        { icon: '🏏', title: 'Cricket scorecards', text: 'The run-rate “worm” on TV is a line chart. You already read charts every match.' },
        { icon: '🗳️', title: 'News & elections', text: 'Vote-share pies and trend lines are everywhere — and sometimes drawn to mislead. Detective eyes on.' },
        { icon: '🤖', title: 'Why AI cares', text: 'Models learn from data. If the data is biased (round 4!), the AI learns the bias too.' },
      ]}
    >
      <div className={s.card}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{r.title}</h3>
              <span className={s.score}>Score: {score}</span>
            </div>
            <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.55 }}>{r.intro}</p>
            {r.chart}
            <div className={s.check}>
              <div className={s.checkQ}>{r.q}</div>
              {r.options.map((o, i) => (
                <button key={i}
                  className={`${s.opt} ${picked !== null && i === r.answer ? s.optRight : ''} ${picked === i && i !== r.answer ? s.optWrong : ''}`}
                  onClick={() => pick(i)} disabled={picked !== null}>
                  {o}
                </button>
              ))}
              {picked !== null && (
                <>
                  <div className={s.explain}>{r.explain}</div>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button className={s.navBtn} onClick={() => { setRound(x => x + 1); setPicked(null); }}>
                      {round === ROUNDS.length - 1 ? 'See my result' : 'Next round'} →
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem' }}>{score === 4 ? '🏆' : score >= 2 ? '🎉' : '💪'}</div>
            <h3 style={{ fontSize: '1.4rem', margin: '8px 0' }}>{score} / 4 solved</h3>
            <p className={s.muted} style={{ maxWidth: 470, margin: '0 auto 16px', lineHeight: 1.6 }}>
              You can now read the three big chart types — and you know the most important lesson in all of
              data science: <b style={{ color: '#fff' }}>always ask who was asked.</b>
            </p>
            <button className={`${s.navBtn} ${s.navGhost}`} onClick={() => { setRound(0); setPicked(null); setScore(0); }}>
              <RotateCcw size={15} /> Play again
            </button>
          </div>
        )}
      </div>
    </DemoFlow>
  );
};

export default ChartDetective;
