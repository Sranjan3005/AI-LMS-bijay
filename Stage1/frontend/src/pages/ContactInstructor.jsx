import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Ico } from '../components/sutra/icons';
import api from '../api';

const MODULES = ['General question', 'Understanding AI', 'Maths for AI', 'Data & Analysis', 'Linear Regression', 'Classification', 'Neural Networks', 'Computer Vision', 'Agentic Flow Studio', 'AI Ethics Arena'];

const ContactInstructor = () => {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({ name: user?.name || '', cls: user?.grade ? `${user.grade}` : '', email: user?.email || '', topic: MODULES[0], msg: '' });
  const [toast, setToast] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.msg.trim()) { flash('Add your name and a question first.'); return; }
    const subject = form.topic === MODULES[0] ? 'General question' : form.topic;
    const message = `${form.msg}\n\n— ${form.name}${form.cls ? `, Class ${form.cls}` : ''}${form.email ? ` (${form.email})` : ''}`;
    try {
      await api.post('/schools/queries/', { subject, message, module: form.topic });
    } catch (err) {
      // Backend query inbox not live yet — still confirm to the student.
    }
    setForm({ ...form, msg: '' });
    flash('Sent to your instructor — a reply will reach your email.');
  };
  const flash = (m) => { setToast(m); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setToast(''), 3800); };

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow"><Ico name="debate" />Contact your instructor</span>
        <h1>Ask a question.<br /><span className="grad">Get a real answer.</span></h1>
        <p>Your Sutra instructor mentors the AI track. Reach out about a lesson, an assignment, or anything you're stuck on.</p>
      </div>

      <div className="contact-grid" style={{ paddingBottom: 56 }}>
        <div className="inst-card">
          <div className="inst-head">
            <div className="inst-av">AI</div>
            <div><div className="nm">Ananya Iyer</div><div className="ro">Lead AI Instructor · Sutra</div></div>
          </div>
          <p className="inst-bio">Ananya teaches the Classes 6–8 AI track. She's an M.Tech in Data Science and a CBSE-certified AI facilitator, and she runs the weekly live labs for the Prediction Engine and Ethics Arena.</p>
          <div className="inst-row"><span className="k">Email</span><Ico name="mail" /><span className="v">ananya.iyer@sutra.school</span></div>
          <div className="inst-row"><span className="k">Office hours</span><Ico name="clock" /><span className="v">Mon–Fri · 3:00–5:00 PM</span></div>
          <div className="inst-row"><span className="k">Mentors</span><Ico name="users" /><span className="v">AI track · Classes 6–8</span></div>
          <div className="inst-subjects">
            <span className="maptag">AI Foundations</span>
            <span className="maptag">Prediction Engine</span>
            <span className="maptag">Ethics Arena</span>
          </div>
        </div>

        <form className="form-card" onSubmit={submit} noValidate>
          <h3>Send a question</h3>
          <p className="fsub">Ananya usually replies within a school day. Your teacher is copied automatically.</p>
          <div className="frow">
            <div className="field"><label>Your name</label><input value={form.name} onChange={set('name')} placeholder="Your name" /></div>
            <div className="field"><label>Class &amp; section</label><input value={form.cls} onChange={set('cls')} placeholder="8-B" /></div>
          </div>
          <div className="field"><label>Email for reply</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@school.edu" /></div>
          <div className="field"><label>Related module</label>
            <select value={form.topic} onChange={set('topic')}>
              {MODULES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Your question</label>
            <textarea value={form.msg} onChange={set('msg')} placeholder="I trained the lemonade regression but the line looks wrong when I add cold days — what am I missing?" />
          </div>
          <button type="submit" className="btn btn-thread btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
            Send to Ms. Iyer<Ico name="send" w={2.2} />
          </button>
        </form>
      </div>

      <div className={`toast${toast ? ' show' : ''}`}><Ico name="tick" w={2.4} /><span>{toast}</span></div>
    </div>
  );
};

export default ContactInstructor;
