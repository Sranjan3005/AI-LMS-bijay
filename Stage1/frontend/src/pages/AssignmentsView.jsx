import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Ico } from '../components/sutra/icons';

const KIND_LABEL = { quiz: 'Quiz', task: 'Task', submission: 'Submission' };

function AssignmentCard({ item, onGraded }) {
  const a = item.assignment;
  const [answers, setAnswers] = useState({});   // quiz: {questionIndex: optionIndex}
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sub = item.submission;
  const done = sub && sub.status === 'graded';

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const payload = a.kind === 'quiz'
        ? { answers: a.questions.map((_, i) => (answers[i] ?? -1)) }
        : { content: text };
      const { data } = await api.post(`/assignments/${item.id}/submit/`, payload);
      onGraded(item.id, data);
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
        </div>
      ) : a.kind === 'quiz' ? (
        <div className="asn-quiz">
          {a.questions.map((q, qi) => (
            <div className="asn-q" key={qi}>
              <div className="asn-q-text">{qi + 1}. {q.q}</div>
              <div className="asn-opts">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`asn-opt${answers[qi] === oi ? ' on' : ''}`}>
                    <input type="radio" name={`q-${item.id}-${qi}`} checked={answers[qi] === oi}
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

const AssignmentsView = ({ moduleFilter, onBack }) => {
  const [items, setItems] = useState(null);   // null = loading
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    api.get('/assignments/mine/')
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setItems([]); setError(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const onGraded = (placementId, submission) => {
    setItems((prev) => prev.map((it) => it.id === placementId ? { ...it, submission } : it));
  };

  const shown = (items || []).filter((it) => !moduleFilter || it.assignment.module_key === moduleFilter);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow"><Ico name="edit" />Assignments &amp; grading</span>
        <h1>Your <span className="grad">assignments.</span></h1>
        <p>Quizzes are graded instantly; written tasks are graded by an AI tutor with feedback. Your scores feed your module progress.</p>
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
              : 'Your teacher will assign tasks here. Check back soon!'}</p>
          </div>
        ) : (
          shown.map((it) => <AssignmentCard key={it.id} item={it} onGraded={onGraded} />)
        )}
      </div>
    </div>
  );
};

export default AssignmentsView;
