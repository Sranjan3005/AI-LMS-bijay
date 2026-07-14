import React, { useState } from 'react';
import api from '../api';
import { Ico } from './sutra/icons';

// The instructor's AI "Plan an assignment" helper. A 3-step modal:
//   1. Configure — module + focus + kind (+ notes) → generate
//   2. Pick — choose one of the 2-3 AI-drafted options
//   3. Assign — to the whole class or one student, with a due date
const MODULES = [
  { key: 'foundations', label: 'Understanding AI / Foundations' },
  { key: 'data', label: 'Working with Data' },
  { key: 'regression', label: 'Linear Regression' },
  { key: 'classification', label: 'Classification' },
  { key: 'neural', label: 'Neural Networks' },
  { key: 'vision', label: 'Computer Vision' },
  { key: 'agentic', label: 'Agentic Flow Studio' },
  { key: 'ethics', label: 'AI Ethics Arena' },
];
const SUBS = [
  { key: '', label: 'The whole module' },
  { key: 'theory', label: 'Theory' },
  { key: 'demo', label: 'Demonstration' },
  { key: 'hands', label: 'Hands-on' },
];

export default function AssignmentPlanner({ roster, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [cfg, setCfg] = useState({ module_key: 'foundations', sub_type: '', kind: 'task', notes: '' });
  const [options, setOptions] = useState([]);
  const [fallback, setFallback] = useState(false);
  const [picked, setPicked] = useState(null);
  const [target, setTarget] = useState('class');       // 'class' | 'student'
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });

  const generate = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/assignments/plan/', cfg);
      setOptions(data.options || []);
      setFallback(!!data.fallback);
      setStep(2);
    } catch (e) {
      setErr(e.response?.data?.error || 'The planner is unavailable right now — please try again.');
    } finally { setBusy(false); }
  };

  const assign = async () => {
    if (!picked) return;
    if (target === 'student' && !studentId) { setErr('Pick a student.'); return; }
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/assignments/plan/create/', {
        option: picked, module_key: cfg.module_key, target,
        student_id: target === 'student' ? studentId : undefined,
        due_date: dueDate || undefined,
      });
      setResult(data); setStep(4);
      onDone?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not create the assignment.');
    } finally { setBusy(false); }
  };

  return (
    <div className="planner-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="planner" onClick={(e) => e.stopPropagation()}>
        <div className="planner-top">
          <div className="planner-title"><Ico name="spark" />Plan an assignment with AI</div>
          <button className="sap-x" onClick={onClose} aria-label="Close"><Ico name="logout" /></button>
        </div>

        <div className="planner-steps">
          {['Design', 'Choose', 'Assign'].map((t, i) => (
            <span key={t} className={`pstep${step === i + 1 ? ' on' : ''}${step > i + 1 ? ' done' : ''}`}>{i + 1}. {t}</span>
          ))}
        </div>

        <div className="planner-body">
          {step === 1 && (
            <div className="planner-form">
              <p className="planner-hint">Tell the AI what you want. It’ll draft 2–3 ready-to-assign options for Classes 6–8.</p>
              <label className="planner-field">
                <span>Module</span>
                <select value={cfg.module_key} onChange={set('module_key')}>
                  {MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </label>
              <label className="planner-field">
                <span>Focus on</span>
                <select value={cfg.sub_type} onChange={set('sub_type')}>
                  {SUBS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label className="planner-field">
                <span>Type</span>
                <select value={cfg.kind} onChange={set('kind')}>
                  <option value="task">Written task (AI-graded)</option>
                  <option value="quiz">Multiple-choice quiz (auto-graded)</option>
                </select>
              </label>
              <label className="planner-field">
                <span>Notes (optional)</span>
                <textarea value={cfg.notes} onChange={set('notes')} rows={2}
                          placeholder="e.g. keep it about real Indian examples; make it a bit challenging" />
              </label>
              {err && <div className="asn-err">{err}</div>}
              <button className="btn btn-thread btn-sm" disabled={busy} onClick={generate}>
                {busy ? 'Thinking…' : <><Ico name="spark" />Generate options</>}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="planner-options">
              {fallback && (
                <div className="planner-fallback"><Ico name="shield" />The AI planner is offline — here are ready-made templates you can assign right away.</div>
              )}
              {options.length === 0 ? <p className="sap-muted">No options came back — go back and try again.</p> : options.map((o, i) => (
                <div key={i} className={`planner-opt${picked === o ? ' on' : ''}`} role="button" tabIndex={0}
                     onClick={() => setPicked(o)}
                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked(o); } }}>
                  <div className="planner-opt-head">
                    <span className="asn-kind">{o.kind === 'quiz' ? 'Quiz' : 'Task'}</span>
                    <h4>{o.title}</h4>
                    {picked === o && <span className="planner-check"><Ico name="tick" /></span>}
                  </div>
                  {o.description && <p>{o.description}</p>}
                  {o.kind === 'quiz' && Array.isArray(o.questions) && (
                    <div className="planner-qs">{o.questions.length} question{o.questions.length === 1 ? '' : 's'} · e.g. “{o.questions[0]?.q}”</div>
                  )}
                  {o.kind !== 'quiz' && o.rubric && <div className="planner-qs">Graded on: {o.rubric}</div>}
                </div>
              ))}
              {err && <div className="asn-err">{err}</div>}
              <div className="planner-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}><Ico name="arrowL" />Back</button>
                <button className="btn btn-thread btn-sm" disabled={!picked} onClick={() => setStep(3)}>Use this one<Ico name="arrowR" /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="planner-form">
              <div className="planner-picked">
                <span className="asn-kind">{picked?.kind === 'quiz' ? 'Quiz' : 'Task'}</span>
                <b>{picked?.title}</b>
              </div>
              <label className="planner-field">
                <span>Give it to</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="class">The whole class</option>
                  <option value="student">One student</option>
                </select>
              </label>
              {target === 'student' && (
                <label className="planner-field">
                  <span>Student</span>
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Choose a student…</option>
                    {(roster || []).map(s => <option key={s.id} value={s.id}>{s.name} · Class {s.grade}</option>)}
                  </select>
                </label>
              )}
              <label className="planner-field">
                <span>Due date (optional)</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
              {err && <div className="asn-err">{err}</div>}
              <div className="planner-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}><Ico name="arrowL" />Back</button>
                <button className="btn btn-thread btn-sm" disabled={busy} onClick={assign}>{busy ? 'Assigning…' : 'Assign it'}</button>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="planner-done">
              <div className="planner-done-ic"><Ico name="tick" /></div>
              <h3>Assigned!</h3>
              <p>“{result.assignment?.title}” is now on {result.placed} student{result.placed === 1 ? '' : 's'}’ dashboard{result.placed === 1 ? '' : 's'}.</p>
              <button className="btn btn-thread btn-sm" onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
