import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Ico } from '../components/sutra/icons';

const KIND_LABEL = { quiz: 'Quiz', task: 'Task', submission: 'Submission' };
const MODULE_TITLE = {
  foundations: 'Foundations', data: 'Working with Data', regression: 'Linear Regression',
  classification: 'Classification', neural: 'Neural Networks', vision: 'Computer Vision',
  agentic: 'Agentic Flow Studio', ethics: 'AI Ethics Arena',
};

function AssignmentCard({ item, onGraded, onOpenAgentStudio }) {
  const a = item.assignment;
  const [answers, setAnswers] = useState({});   // quiz: {questionIndex: optionIndex}
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sub = item.submission;
  const done = sub && sub.status === 'graded';
  // Submitted but the grader hasn't returned a score (LLM async / offline).
  const pending = sub && sub.status !== 'graded';
  // Agentic tasks aren't answered with text — the student builds a pipeline in
  // the Agent Studio and submits it there for AI evaluation.
  const isAgentic = a.module_key === 'agentic' && a.kind !== 'quiz';

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const base = a.kind === 'quiz'
        ? { answers: a.questions.map((_, i) => (answers[i] ?? -1)) }
        : { content: text };
      // Practice items (no teacher placement) submit against the assignment id.
      const url = item.practice ? '/assignments/practice/submit/' : `/assignments/${item.id}/submit/`;
      const payload = item.practice ? { ...base, assignment: a.id } : base;
      const { data } = await api.post(url, payload);
      onGraded(item._key, data);
    } catch (e) {
      setErr('Could not submit — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="asn-card">
      <div className="asn-head">
        <div>
          <span className="asn-kind">{KIND_LABEL[a.kind] || 'Task'}</span>
          {item.practice && (
            <span className="asn-kind" style={{ marginLeft: 8, background: 'rgba(100,210,255,.14)', color: '#64D2FF' }}>Practice</span>
          )}
          <h3>{a.title}</h3>
        </div>
        {done && (
          <div className="asn-score" title="Your score">
            <div className="ring" style={{ '--p': sub.percent ?? 0, '--rc': '#30D158' }}><span>{sub.percent ?? 0}</span></div>
          </div>
        )}
      </div>
      {a.description ? <p className="asn-desc">{a.description}</p> : null}

      {done ? (
        <div className="asn-feedback">
          <div className="asn-fb-head"><Ico name="tick" />Graded · {sub.score}/{sub.max_score}</div>
          {sub.llm_feedback ? <p>{sub.llm_feedback}</p> : null}
          {isAgentic && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => onOpenAgentStudio?.(item)}>
              <Ico name="nodes" w={2.2} />Improve your pipeline &amp; resubmit
            </button>
          )}
        </div>
      ) : pending ? (
        <div className="asn-feedback">
          <div className="asn-fb-head"><Ico name="check" />Submitted — pending grade</div>
          <p>Your answer is in. It’s waiting for the AI tutor to grade it — check back shortly and your score will appear here.</p>
        </div>
      ) : isAgentic ? (
        <div className="asn-agentic">
          <div className="asn-agentic-hint">
            <Ico name="nodes" />
            Build your agent pipeline in the Studio, drag &amp; connect the right nodes, then submit it there for AI evaluation.
          </div>
          <button className="btn btn-thread btn-sm" onClick={() => onOpenAgentStudio?.(item)}>
            Open the Agent Studio<Ico name="arrowR" w={2.2} />
          </button>
        </div>
      ) : a.kind === 'quiz' ? (
        <div className="asn-quiz">
          {a.questions.map((q, qi) => (
            <div className="asn-q" key={qi}>
              <div className="asn-q-text">{qi + 1}. {q.q}</div>
              <div className="asn-opts">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`asn-opt${answers[qi] === oi ? ' on' : ''}`}>
                    <input type="radio" name={`q-${item._key}-${qi}`} checked={answers[qi] === oi}
                           onChange={() => setAnswers({ ...answers, [qi]: oi })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {err ? <div className="asn-err">{err}</div> : null}
          <button className="btn btn-thread btn-sm" disabled={busy} onClick={submit}>
            {busy ? 'Submitting…' : 'Submit quiz'}
          </button>
        </div>
      ) : (
        <div className="asn-text">
          <textarea value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Write your answer here — explain it in your own words." />
          {err ? <div className="asn-err">{err}</div> : null}
          <button className="btn btn-thread btn-sm" disabled={busy || !text.trim()} onClick={submit}>
            {busy ? 'Grading…' : 'Submit for grading'}
          </button>
        </div>
      )}
    </div>
  );
}

// One compact row in the assignments list (no content — just the summary).
const dueLabel = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch { return ''; }
};

function AssignmentRow({ item, onOpen }) {
  const a = item.assignment;
  const sub = item.submission;
  const st = sub?.status === 'graded' ? 'done' : sub ? 'live' : 'soon';
  const stLabel = sub?.status === 'graded' ? `Graded · ${sub.percent ?? 0}%` : sub ? 'Submitted' : 'To do';
  return (
    <div className="asn-row" role="button" tabIndex={0} onClick={onOpen}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
      <div className="asn-row-ic"><Ico name={a.kind === 'quiz' ? 'check' : 'edit'} /></div>
      <div className="asn-row-main">
        <div className="asn-row-title">{a.title}</div>
        <div className="asn-row-sub">
          <span className="asn-kind">{KIND_LABEL[a.kind] || 'Task'}</span>
          {item.practice && <span className="asn-kind" style={{ color: '#64D2FF' }}>Practice</span>}
          {MODULE_TITLE[a.module_key] && <span className="asn-row-mod">{MODULE_TITLE[a.module_key]}</span>}
        </div>
      </div>
      <div className="asn-row-end">
        <span className={`pill ${st}`}><span className="dot" />{stLabel}</span>
        {item.due_date && <span className="asn-row-due">Due {dueLabel(item.due_date)}</span>}
      </div>
      <div className="sub-go"><Ico name="arrowR" w={2.2} /></div>
    </div>
  );
}

const AssignmentsView = ({ moduleFilter, focused = false, onBack, onOpenAgentStudio }) => {
  const [items, setItems] = useState(null);   // null = loading
  const [error, setError] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);  // which assignment's content is open

  // Changing which module/tab we're viewing drops back to the list.
  useEffect(() => { setSelectedKey(null); }, [moduleFilter, focused]);

  const load = useCallback(() => {
    // Merge teacher-placed assignments with self-serve practice templates so the
    // tab is never empty. A practice template a teacher has already placed is
    // shown once (the placement wins — it carries the due date + status).
    const practiceUrl = moduleFilter ? `/assignments/practice/?module=${moduleFilter}` : '/assignments/practice/';
    Promise.allSettled([api.get('/assignments/mine/'), api.get(practiceUrl)])
      .then(([mineRes, practiceRes]) => {
        const mine = mineRes.status === 'fulfilled' && Array.isArray(mineRes.value.data) ? mineRes.value.data : [];
        const practice = practiceRes.status === 'fulfilled' && Array.isArray(practiceRes.value.data) ? practiceRes.value.data : [];
        const placedIds = new Set(mine.map((it) => it.assignment?.id));
        const merged = [
          ...mine.map((it) => ({ ...it, _key: `p-${it.id}`, practice: false })),
          ...practice
            .filter((it) => !placedIds.has(it.assignment?.id))
            .map((it) => ({ ...it, _key: `t-${it.assignment?.id}`, practice: true })),
        ];
        setItems(merged);
        if (mineRes.status === 'rejected' && practiceRes.status === 'rejected') setError(true);
      });
  }, [moduleFilter]);
  useEffect(() => { load(); }, [load]);

  const onGraded = (key, submission) => {
    setItems((prev) => prev.map((it) => it._key === key ? { ...it, submission } : it));
  };

  const shown = (items || []).filter((it) => !moduleFilter || it.assignment.module_key === moduleFilter);
  const selected = (items || []).find((it) => it._key === selectedKey);

  // ── Detail section: the actual assignment content, opened from the list ──
  if (selected) {
    return (
      <div className="wrap">
        <div className="page-head" style={{ paddingBottom: 12 }}>
          <div style={{ marginBottom: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKey(null)}>
              <Ico name="arrowL" w={2.2} />Back to assignments
            </button>
          </div>
          <span className="eyebrow"><Ico name="edit" />
            {MODULE_TITLE[selected.assignment.module_key] ? `${MODULE_TITLE[selected.assignment.module_key]} · ` : ''}
            {KIND_LABEL[selected.assignment.kind] || 'Task'}
          </span>
        </div>
        <div className="asn-list" style={{ paddingBottom: 56 }}>
          <AssignmentCard item={selected} onGraded={onGraded} onOpenAgentStudio={onOpenAgentStudio} />
        </div>
      </div>
    );
  }

  // ── List section: only the assignments, no content ──
  return (
    <div className="wrap">
      <div className="page-head">
        {focused && moduleFilter ? (
          <>
            <span className="eyebrow"><Ico name="edit" />{MODULE_TITLE[moduleFilter] || 'Module'} · Assignment</span>
            <h1>Your <span className="grad">{MODULE_TITLE[moduleFilter] || 'module'}</span> task.</h1>
            <p>Open a task below to work on it — it’s graded automatically and feeds this module’s performance score.</p>
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-sm" onClick={onBack}><Ico name="arrowL" w={2.2} />Back to my flow</button>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow"><Ico name="edit" />Assignments &amp; grading</span>
            <h1>Your <span className="grad">assignments.</span></h1>
            <p>Open any assignment to work on it. Quizzes are graded instantly; written tasks are graded by an AI tutor with feedback.</p>
          </>
        )}
      </div>

      <div className="asn-list" style={{ paddingBottom: 56 }}>
        {items === null ? (
          <div className="asn-empty">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="asn-empty">
            <Ico name="check" />
            <h3>No assignments yet</h3>
            <p>{error
              ? 'Assignments will appear here once the grading service is live.'
              : 'Finish a module’s activities to unlock its task, or your teacher will assign one here.'}</p>
          </div>
        ) : (
          shown.map((it) => <AssignmentRow key={it._key} item={it} onOpen={() => setSelectedKey(it._key)} />)
        )}
      </div>
    </div>
  );
};

export default AssignmentsView;
