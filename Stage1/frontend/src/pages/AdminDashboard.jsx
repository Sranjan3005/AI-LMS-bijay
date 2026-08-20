import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  LogOut, Settings, Users, Database, LayoutDashboard, Workflow,
  GraduationCap, Search, RefreshCw, BookOpen, Award, AlertCircle,
} from 'lucide-react';
import api from '../api';

/**
 * Admin / Teacher console.
 * Fetches live data from existing endpoints (scenarios, agentic workflows) and
 * degrades gracefully to empty states where a backend is not yet wired
 * (e.g. the gradebook, which depends on the planned `evaluation.Attempt` model).
 */

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'content', label: 'Content', icon: Database },
  { key: 'workflows', label: 'Workflows', icon: Workflow },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const card = {
  background: 'var(--glass-bg, rgba(255,255,255,0.03))',
  border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
  borderRadius: '14px',
  padding: '22px',
};

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('overview');

  const [scenarios, setScenarios] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    // Fetch each source independently so one missing endpoint never blanks the page.
    const results = await Promise.allSettled([
      api.get('/scenarios/'),
      api.get('/agentic/workflows/'),
      api.get('/auth/students/'), // may not exist yet — handled gracefully
    ]);

    const [scenRes, wfRes, stuRes] = results;
    if (scenRes.status === 'fulfilled') {
      setScenarios(Array.isArray(scenRes.value.data) ? scenRes.value.data : scenRes.value.data?.results || []);
    }
    if (wfRes.status === 'fulfilled') {
      setWorkflows(Array.isArray(wfRes.value.data) ? wfRes.value.data : wfRes.value.data?.results || []);
    }
    if (stuRes.status === 'fulfilled') {
      setStudents(Array.isArray(stuRes.value.data) ? stuRes.value.data : stuRes.value.data?.results || []);
    }
    if (scenRes.status === 'rejected' && wfRes.status === 'rejected') {
      setError('Could not reach the backend. Is the API running?');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const templates = useMemo(() => workflows.filter(w => w.is_template), [workflows]);
  const studentFlows = useMemo(() => workflows.filter(w => !w.is_template), [workflows]);

  const stats = [
    { label: 'Scenarios', value: scenarios.length, icon: BookOpen, color: 'var(--accent-cyan, #00f0ff)' },
    { label: 'Students', value: students.length, icon: Users, color: 'var(--accent-green, #10b981)' },
    { label: 'Student Flows', value: studentFlows.length, icon: Workflow, color: 'var(--accent-purple, #b200ff)' },
    { label: 'Templates', value: templates.length, icon: Award, color: '#fbbf24' },
  ];

  const filteredScenarios = scenarios.filter(s =>
    (s.title || s.name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', color: 'var(--text-primary, #e2e8f0)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '230px', flexShrink: 0, padding: '28px 16px',
        borderRight: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
          <GraduationCap size={26} color="var(--accent-purple, #b200ff)" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Teacher Console</span>
        </div>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px',
              borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: '0.95rem', fontWeight: tab === key ? 600 : 400,
              background: tab === key ? 'rgba(178,0,255,0.12)' : 'transparent',
              color: tab === key ? 'var(--accent-purple, #b200ff)' : 'var(--text-secondary, #94a3b8)',
            }}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>
              {TABS.find(t => t.key === tab)?.label}
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)' }}>Welcome back, {user?.name || 'Teacher'}.</p>
          </div>
          <button className="btn-secondary" onClick={loadData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div style={{ ...card, borderColor: 'var(--accent-red, #ef4444)', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
            <AlertCircle size={18} color="var(--accent-red, #ef4444)" /> {error}
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '24px' }}>
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>{label}</span>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card }}>
              <h3 style={{ marginBottom: '10px' }}>Gradebook</h3>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Per-student scores across the Prediction Engine, Agentic Workflows and Ethics Arena
                will appear here once the <code>evaluation.Attempt</code> API is live. Each activity
                posts an Attempt on completion; this console reads them to build CBSE-417 practical marks.
              </p>
            </div>
          </>
        )}

        {/* STUDENTS */}
        {tab === 'students' && (
          <div style={card}>
            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No student roster yet"
                body="Connect the /auth/students/ endpoint (or import a class list) to see enrolment, last-active, and progress against 417 learning outcomes here."
              />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px' }}>Name</th><th style={{ padding: '10px' }}>Grade</th><th style={{ padding: '10px' }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.08))' }}>
                      <td style={{ padding: '12px 10px' }}>{s.name}</td>
                      <td style={{ padding: '12px 10px' }}>{s.grade || '—'}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary, #94a3b8)' }}>{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CONTENT */}
        {tab === 'content' && (
          <>
            <div style={{ position: 'relative', marginBottom: '18px', maxWidth: '360px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #94a3b8)' }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)} placeholder="Search scenarios…"
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', color: 'inherit' }}
              />
            </div>
            {filteredScenarios.length === 0 ? (
              <div style={card}><EmptyState icon={Database} title="No scenarios found"
                body="Run `python manage.py seed_scenarios` on the backend, or adjust your search." /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {filteredScenarios.map((s, i) => (
                  <div key={s.id || i} style={card}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: 'var(--accent-cyan, #00f0ff)', marginBottom: '8px' }}>{s.category || 'Scenario'}</div>
                    <h4 style={{ marginBottom: '8px' }}>{s.title || s.name}</h4>
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {(s.description || '').slice(0, 110)}{(s.description || '').length > 110 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* WORKFLOWS */}
        {tab === 'workflows' && (
          <div style={card}>
            {workflows.length === 0 ? (
              <EmptyState icon={Workflow} title="No agentic workflows yet"
                body="Templates you publish and flows students build will be listed here." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px' }}>Name</th><th style={{ padding: '10px' }}>Type</th><th style={{ padding: '10px' }}>Nodes</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((w, i) => (
                    <tr key={w.id || i} style={{ borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.08))' }}>
                      <td style={{ padding: '12px 10px' }}>{w.name}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px',
                          background: w.is_template ? 'rgba(251,191,36,0.15)' : 'rgba(178,0,255,0.15)',
                          color: w.is_template ? '#fbbf24' : 'var(--accent-purple, #b200ff)' }}>
                          {w.is_template ? 'Template' : 'Student'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary, #94a3b8)' }}>
                        {w.flow_data?.nodes?.length ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'grid', gap: '16px', maxWidth: '640px' }}>
            <div style={card}>
              <h4 style={{ marginBottom: '10px' }}>Daily point quota</h4>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginBottom: '12px' }}>
                Controls how many LLM points each student gets per day (currently defaults to 100 in
                <code> UserQuota</code>). A settings endpoint can make this editable.
              </p>
              <input type="number" defaultValue={100} disabled
                style={{ padding: '10px 12px', borderRadius: '10px', width: '140px',
                  background: 'transparent', border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', color: 'inherit' }} />
            </div>
            <div style={card}>
              <h4 style={{ marginBottom: '10px' }}>API keys</h4>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
                LLM keys (OpenRouter / Azure OpenAI) are read from backend environment variables
                and are never exposed to the browser. Manage them in your Azure Container App secrets.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, body }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary, #94a3b8)', marginBottom: '16px' }}>
      <Icon size={30} />
    </div>
    <h3 style={{ marginBottom: '8px' }}>{title}</h3>
    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>{body}</p>
  </div>
);

export default AdminDashboard;
