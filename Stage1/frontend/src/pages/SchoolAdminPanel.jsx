import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import SutraBackground from '../components/sutra/SutraBackground';
import { BrandMark, Ico } from '../components/sutra/icons';
import { initials } from '../components/sutra/SutraShell';
import AssignmentPlanner from '../components/AssignmentPlanner';
import '../styles/sutra.css';

const KIND_LABEL = { quiz: 'Quiz', task: 'Task', submission: 'Submission' };

/* ── class-wide actions: assign to everyone + open the AI planner ── */
function ClassActions({ templates, roster, onOpenPlanner, onAssigned }) {
  const [sel, setSel] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const assignClass = async () => {
    if (!sel) return; setBusy(true); setMsg('');
    try {
      const { data } = await api.post('/assignments/assign-class/', { assignment: sel, due_date: due || null });
      setMsg(`Assigned to ${data.placed} student${data.placed === 1 ? '' : 's'}.`);
      setSel(''); setDue(''); onAssigned?.();
    } catch (e) { setMsg('Could not assign — please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="sap-card sap-classbar">
      <div className="sap-classrow">
        <div className="sap-classlab"><Ico name="users" w={2.2} />Give an assignment to the whole class</div>
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Choose an assignment…</option>
          {templates.map(t => <option key={t.id} value={t.id}>{KIND_LABEL[t.kind]} · {t.title}</option>)}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date (optional)" />
        <button className="btn btn-thread btn-sm" disabled={!sel || busy} onClick={assignClass}>
          {busy ? 'Assigning…' : 'Give to whole class'}
        </button>
      </div>
      <div className="sap-classrow">
        <div className="sap-classlab"><Ico name="spark" w={2.2} />Need a new one?</div>
        <button className="btn btn-ghost btn-sm" onClick={onOpenPlanner}><Ico name="spark" />Plan an assignment with AI</button>
        {msg && <span className="sap-classmsg">{msg}</span>}
      </div>
    </div>
  );
}

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

/* ── create a student login ── */
function AddStudent({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', grade: 8, password: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.name.trim() || !f.email.trim() || !f.password.trim()) { setMsg('Name, email and password are required.'); return; }
    setBusy(true); setMsg('');
    try {
      await api.post('/schools/students/', f);
      setF({ name: '', email: '', grade: 8, password: '' });
      setOpen(false); onAdded();
    } catch (e) { setMsg(e.response?.data?.error || 'Could not create student.'); }
    finally { setBusy(false); }
  };

  if (!open) {
    return <div className="sap-add"><button className="btn btn-thread btn-sm" onClick={() => setOpen(true)}><Ico name="user" w={2.2} />Add student</button></div>;
  }
  return (
    <div className="sap-add sap-card" style={{ padding: '20px' }}>
      <div className="sap-addgrid">
        <input placeholder="Full name" value={f.name} onChange={set('name')} />
        <input placeholder="Email (their login)" type="email" value={f.email} onChange={set('email')} />
        <input placeholder="Class (e.g. 8)" type="number" value={f.grade} onChange={set('grade')} />
        <input placeholder="Temporary password" value={f.password} onChange={set('password')} />
      </div>
      {msg && <div className="asn-err" style={{ marginTop: 10 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn btn-thread btn-sm" disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create login'}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setMsg(''); }}>Cancel</button>
      </div>
    </div>
  );
}

const SchoolAdminPanel = () => {
  const { user, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('students');
  const [roster, setRoster] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [queries, setQueries] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);

  const loadRoster = useCallback(() => {
    api.get('/schools/roster/').then(r => setRoster(r.data || [])).catch(() => setRoster([]));
  }, []);
  const loadTemplates = useCallback(() => {
    api.get('/assignments/templates/').then(r => setTemplates(r.data || [])).catch(() => setTemplates([]));
  }, []);
  useEffect(() => {
    loadRoster();
    loadTemplates();
    api.get('/schools/queries/').then(r => setQueries(r.data || [])).catch(() => setQueries([]));
  }, [loadRoster, loadTemplates]);

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
              <>
                <ClassActions templates={templates} roster={roster || []}
                  onOpenPlanner={() => setShowPlanner(true)}
                  onAssigned={loadRoster} />
                <AddStudent onAdded={loadRoster} />
                {roster === null ? <div className="asn-empty">Loading…</div>
                  : roster.length === 0 ? <div className="asn-empty"><Ico name="users" /><h3>No students yet</h3><p>Use “Add student” to create their logins.</p></div>
                    : roster.map(s => <StudentRow key={s.id} s={s} templates={templates} />)}
              </>
            ) : (
              queries === null ? <div className="asn-empty">Loading…</div>
                : queries.length === 0 ? <div className="asn-empty"><Ico name="debate" /><h3>No questions yet</h3><p>Student questions from the "ask the instructor" form land here.</p></div>
                  : queries.map(q => <QueryCard key={q.id} q={q} onReplied={(u) => setQueries(prev => prev.map(x => x.id === u.id ? u : x))} />)
            )}
          </div>
        </div>
      </div>

      {showPlanner && (
        <AssignmentPlanner
          roster={roster || []}
          onClose={() => setShowPlanner(false)}
          onDone={() => { loadTemplates(); loadRoster(); }}
        />
      )}
    </div>
  );
};

export default SchoolAdminPanel;
