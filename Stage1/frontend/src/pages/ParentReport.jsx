import React, { useEffect, useState } from 'react';
import { Ico } from '../components/sutra/icons';
import '../components/story/story.css';
import api from '../api';

// ParentReport — a student (or teacher) previews today's progress digest and
// sends it to the guardian on WhatsApp with one tap. The wa.me link works with
// no third-party setup; automated daily delivery is handled server-side by the
// `send_daily_reports` management command.
export default function ParentReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Editable guardian contact (saved to the student profile).
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/assignments/daily-report/')
      .then((r) => { setData(r.data); setParentName(r.data.parent_name || ''); setParentPhone(r.data.parent_phone || ''); })
      .catch(() => setErr('Could not load today\'s report. Please try again.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get('/auth/profile/').then((r) => setOptIn(r.data.daily_report_opt_in ?? true)).catch(() => {});
  }, []);

  const saveContact = () => {
    setSaving(true); setSavedMsg('');
    api.patch('/auth/profile/', { parent_name: parentName, parent_phone: parentPhone, daily_report_opt_in: optIn })
      .then(() => { setSavedMsg('Saved ✓'); load(); })
      .catch(() => setSavedMsg('Could not save.'))
      .finally(() => setSaving(false));
  };

  const report = data?.report;
  const waLink = data?.whatsapp_link;

  return (
    <section className="jour">
      <div className="wrap st-parent">
        <span className="eyebrow"><Ico name="users" />For parents &amp; guardians</span>
        <h2 style={{ marginTop: 12 }}>Today's progress report</h2>
        <p className="st-parent-intro">
          A short, friendly summary of what your child did on Sutra today — chapters completed, tasks graded,
          and their learning streak. Send it home over WhatsApp, or let Sutra deliver it automatically every evening.
        </p>

        {loading && <p style={{ color: '#9aa0b5' }}>Loading today's report…</p>}
        {err && <p style={{ color: '#ff8a80' }}>{err}</p>}

        {report && (
          <>
            {/* The report card — styled like a printed note so it reads well when screenshotted too. */}
            <div className="st-report">
              <div className="st-report-head">
                <span className="st-report-brand">Sutra</span>
                <span className="st-report-date">{new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              </div>
              <h3>{report.student_name} · Class {report.grade}</h3>
              <div className="st-report-sub">Daily learning report for {report.parent_name}</div>

              <div className="st-stats">
                <div className="st-statc"><div className="n">{report.activities_count}</div><div className="l">Chapters done</div></div>
                <div className="st-statc"><div className="n">{report.graded_count}</div><div className="l">Tasks graded</div></div>
                <div className="st-statc"><div className="n">{report.streak_days}🔥</div><div className="l">Day streak</div></div>
              </div>

              {report.active ? (
                <>
                  {report.activities_today.length > 0 && (
                    <>
                      <strong>What they worked on</strong>
                      <ul>
                        {report.activities_today.map((a, i) => <li key={i}>{a.module} — {a.did}</li>)}
                      </ul>
                    </>
                  )}
                  {report.graded_today.length > 0 && (
                    <>
                      <strong style={{ display: 'block', marginTop: 12 }}>Graded work{report.avg_percent != null ? ` · average ${report.avg_percent}%` : ''}</strong>
                      <ul>
                        {report.graded_today.map((g, i) => (
                          <li key={i}>{g.title}{g.percent != null ? ` — ${g.percent}%` : ''}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <p style={{ color: '#6a7089' }}>No activity was logged today.</p>
              )}

              <div className="st-encourage">{report.encouragement}</div>
              <div className="st-signoff">— Team Sutra · your child's AI-literacy classroom</div>
            </div>

            <div className="st-parent-actions">
              <a className="st-btn wa" href={waLink} target="_blank" rel="noopener noreferrer">
                <Ico name="send" size={18} />Send on WhatsApp
              </a>
              <button className="st-btn ghost" onClick={load}><Ico name="clock" size={16} />Refresh</button>
            </div>
          </>
        )}

        {/* Guardian contact + auto-send opt-in */}
        <div style={{ marginTop: 34 }}>
          <h3 style={{ color: '#eef0f8' }}>Guardian contact</h3>
          <p className="st-note">Set this once so the WhatsApp button is pre-addressed and Sutra can send the evening report automatically.</p>
          <div className="st-field">
            <label>Guardian name</label>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Mrs. Sharma" />
          </div>
          <div className="st-field">
            <label>WhatsApp number (with country code, digits only)</label>
            <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 919876543210" inputMode="tel" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#c3c8de', margin: '10px 0 4px', cursor: 'pointer' }}>
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            Send an automatic progress report every evening
          </label>
          <div className="st-parent-actions">
            <button className="st-btn" onClick={saveContact} disabled={saving}>
              {saving ? 'Saving…' : 'Save guardian details'}
            </button>
            {savedMsg && <span style={{ alignSelf: 'center', color: savedMsg.includes('✓') ? '#8ff0a6' : '#ff8a80' }}>{savedMsg}</span>}
          </div>
          <p className="st-note">
            Automatic delivery runs from the school's server. Ask your teacher to enable the evening send
            (<code>send_daily_reports</code>) if it isn't on yet.
          </p>
        </div>
      </div>
    </section>
  );
}
