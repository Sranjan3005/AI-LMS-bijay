import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import SutraBackground from '../components/sutra/SutraBackground';
import { BrandMark, Ico } from '../components/sutra/icons';
import { initials } from '../components/sutra/SutraShell';
import '../styles/sutra.css';

const KIND_LABEL = { quiz: 'Quiz', task: 'Task', submission: 'Submission' };

/* ── one student, expandable to manage their tasks ── */
function StudentRow({ s, templates }) {
  const [open, setOpen] = useState(false);
  const [placements, setPlacements] = useState(null);
  const [sel, setSel] = useState('');
  const [busy, setBusy] = useState(false);

  const loadP = useCallback(() => {
    api.get(`/assignments/student/${s.id}/`).then(r => setPlacements(r.data || [])).catch(() => setPlacements([]));
  }, [s.id]);

  const toggle = () => {
    const n = !open; setOpen(n);
    if (n && placements === null) loadP();
  };
  const assign = async () => {
    if (!sel) return; setBusy(true);
    try { await api.post('/assignments/assign/', { assignment: sel, student: s.id }); loadP(); setSel(''); }
    catch (e) { /* ignore */ } finally { setBusy(false); }
  };
  const setActive = async (pid, val) => {
    try { await api.post(`/assignments/placements/${pid}/remove/`, { is_active: val }); loadP(); } catch (e) { /* ignore */ }
  };

  return (
    <div className={`sap-card${open ? ' open' : ''}`}>
      <div className="sap-srow" role="button" tabIndex={0} onClick={toggle}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>
        <div className="sap-av">{initials(s.name)}</div>
        <div className="sap-sname">
          <div className="nm">{s.name}</div>
          <div className="sb">{s.email} · Class {s.grade}</div>
        </div>
        <div className="ring" style={{ '--p': s.avg_percent ?? 0, '--rc': '#30D158' }}>
          <span>{s.avg_percent ?? '—'}</span>
        </div>
        <div className="mrow-exp"><Ico name="plus" w={2.4} /></div>
      </div>

      {open && (
        <div className="sap-detail">
          <div className="sap-assign">
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Assign a task…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{KIND_LABEL[t.kind]} · {t.title}</option>)}
            </select>
            <button className="btn btn-thread btn-sm" disabled={!sel || busy} onClick={assign}>Assign</button>
          </div>

          {placements === null ? <div className="sap-muted">Loading…</div>
            : placements.length === 0 ? <div className="sap-muted">No tasks assigned yet.</div>
              : placements.map(p => (
                <div key={p.id} className={`sap-place${p.is_active ? '' : ' off'}`}>
                  <span className="sap-kchip">{KIND_LABEL[p.kind]}</span>
                  <span className="sap-ptitle">{p.title}</span>
                  <span className={`pill ${p.status === 'graded' ? 'done' : p.status === 'submitted' ? 'live' : 'soon'}`}>
                    <span className="dot" />{p.status}
                  </span>
                  {p.is_active
                    ? <button className="sap-x" title="Remove from dashboard" onClick={() => setActive(p.id, false)}><Ico name="logout" /></button>
                    : <button className="btn btn-ghost btn-sm" onClick={() => setActive(p.id, true)}>Restore</button>}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

/* ── query inbox ── */
function QueryCard({ q, onReplied }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!reply.trim()) return; setBusy(true);
    try { const { data } = await api.post(`/schools/queries/${q.id}/reply/`, { reply }); onReplied(data); }
    catch (e) { /* ignore */ } finally { setBusy(false); }
  };
  return (
    <div className="sap-card">
      <div className="sap-qhead">
        <div>
          <div className="sap-qsub">{q.subject}</div>
          <div className="sb">{q.student_name}{q.module ? ` · ${q.module}` : ''}</div>
        </div>
        <span className={`pill ${q.status === 'answered' ? 'done' : 'live'}`}><span className="dot" />{q.status}</span>
      </div>
      <p className="sap-qmsg">{q.message}</p>
      {q.status === 'answered'
        ? <div className="asn-feedback"><div className="asn-fb-head"><Ico name="tick" />Your reply</div><p>{q.reply}</p></div>
        : (
          <div className="sap-assign">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
            <button className="btn btn-thread btn-sm" disabled={busy || !reply.trim()} onClick={send}>Reply</button>
          </div>
        )}
    </div>
  );
}

const SchoolAdminPanel = () => {
  const { user, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('students');
  const [roster, setRoster] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [queries, setQueries] = useState(null);

  useEffect(() => {
    api.get('/schools/roster/').then(r => setRoster(r.data || [])).catch(() => setRoster([]));
    api.get('/assignments/templates/').then(r => setTemplates(r.data || [])).catch(() => setTemplates([]));
    api.get('/schools/queries/').then(r => setQueries(r.data || [])).catch(() => setQueries([]));
  }, []);

  const openQueries = (queries || []).filter(q => q.status !== 'answered').length;

  return (
    <div className="sutra">
      <SutraBackground />
      <div className="s-content">
        <nav className="s-nav scrolled">
          <div className="s-nav-in">
            <div className="brand"><span className="brand-mark"><BrandMark /></span>Sutra</div>
            <span className="sap-badge">School Console</span>
            <div className="nav-right">
              <div className="profile-chip"><span className="pc-av">{initials(user?.name)}</span><span className="pc-name">{user?.name || 'Admin'}</span></div>
              <button className="btn btn-ghost btn-sm" onClick={logout}><Ico name="logout" />Log out</button>
            </div>
          </div>
        </nav>

        <div className="wrap">
          <div className="page-head" style={{ paddingBottom: 10 }}>
            <span className="eyebrow"><Ico name="users" />{user?.school_name || 'Your school'}</span>
            <h1>School <span className="grad">console.</span></h1>
            <p>Manage your students, assign work, and answer their questions.</p>
          </div>

          <div className="classtabs" style={{ display: 'flex', margin: '0 auto 26px', width: 'max-content' }}>
            <button className={tab === 'students' ? 'on' : ''} onClick={() => setTab('students')}>Students {roster ? `(${roster.length})` : ''}</button>
            <button className={tab === 'queries' ? 'on' : ''} onClick={() => setTab('queries')}>Queries {openQueries ? `(${openQueries})` : ''}</button>
          </div>

          <div className="sap-list">
            {tab === 'students' ? (
              roster === null ? <div className="asn-empty">Loading…</div>
                : roster.length === 0 ? <div className="asn-empty"><Ico name="users" /><h3>No students yet</h3><p>Students appear here once they're added to your school.</p></div>
                  : roster.map(s => <StudentRow key={s.id} s={s} templates={templates} />)
            ) : (
              queries === null ? <div className="asn-empty">Loading…</div>
                : queries.length === 0 ? <div className="asn-empty"><Ico name="debate" /><h3>No questions yet</h3><p>Student questions from the "ask the instructor" form land here.</p></div>
                  : queries.map(q => <QueryCard key={q.id} q={q} onReplied={(u) => setQueries(prev => prev.map(x => x.id === u.id ? u : x))} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAdminPanel;
