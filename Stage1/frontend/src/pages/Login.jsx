import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '../api';
import { BrandMark } from '../components/sutra/icons';
import ChitiCharacter from '../components/chiti/ChitiCharacter';
import { useChiti } from '../components/chiti/ChitiProvider';
import './landing.css';

// Company admin portal = Django admin, which lives at <origin>/admin/ (not under /api/v1).
const ADMIN_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/admin/';

// Chiti introduces himself and the course. Each line is typed out, spoken, and
// acted — this is the student's first contact with the character.
const GREETING = [
  { text: "Hi! I'm Chiti. I'm a robot, and right now I know absolutely nothing.", action: 'wave', mood: 'happy' },
  { text: "That's where you come in — you're going to teach me.", action: 'yes', mood: 'happy' },
  { text: "We'll do it together: first a brain, then eyes, then I'll learn to predict, to judge, and to build things on my own.", action: 'think', mood: 'neutral' },
  { text: "Sign in and let's start with mission one.", action: 'thumbsup', mood: 'happy' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('student');   // 'student' | 'instructor'
  const { login, googleLogin } = useContext(AuthContext);
  const isInstructor = role === 'instructor';

  const chiti = useChiti();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const timers = useRef([]);

  // Type the current line out, and have Chiti act + speak it.
  useEffect(() => {
    const line = GREETING[step];
    if (!line) { setDone(true); return; }
    chiti.perform(line.action, { mood: line.mood, say: line.text, holdMs: 2600 });

    setTyped('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(line.text.slice(0, i));
      if (i >= line.text.length) {
        clearInterval(id);
        const next = setTimeout(() => {
          if (step < GREETING.length - 1) setStep((s) => s + 1);
          else setDone(true);
        }, 2200);
        timers.current.push(next);
      }
    }, 26);
    timers.current.push(id);
    return () => { clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => () => { timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); }); }, []);

  // Clicking Chiti makes him react — the first thing most kids will try.
  const pokeChiti = () => {
    const moves = [
      { a: 'jump', m: 'surprised', s: 'Whoa! Careful, I only just booted up.' },
      { a: 'dance', m: 'happy', s: "Is that a yes? Let's get started!" },
      { a: 'wave', m: 'happy', s: 'Hello again!' },
      { a: 'thumbsup', m: 'happy', s: "You and me — we're going to build something good." },
    ];
    const pick = moves[Math.floor(Math.random() * moves.length)];
    setTyped(pick.s);
    setDone(true);
    chiti.perform(pick.a, { mood: pick.m, say: pick.s, holdMs: 2600 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, false);
    } catch (err) {
      if (!err.response) {
        setError('Could not connect to server. Is the backend running?');
      } else {
        const data = err.response.data;
        if (data?.email) setError('Email: ' + data.email[0]);
        else if (data?.password) setError('Password: ' + data.password[0]);
        else if (data?.detail) setError(data.detail);
        else setError('Invalid credentials. Please try again.');
      }
      chiti.perform('no', { mood: 'sad', say: "Hmm, that didn't work. Want to try again?" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-mesh" aria-hidden="true" />

      {/* ── Chiti greets you ── */}
      <div className="lp-stage">
        <div className="lp-figure" onClick={pokeChiti} style={{ cursor: 'pointer' }}
             role="button" tabIndex={0} aria-label="Chiti the robot — click to say hello"
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pokeChiti(); } }}>
          <ChitiCharacter
            renderer={chiti.renderer}
            action={chiti.action}
            mood={chiti.mood}
            speaking={chiti.speaking}
            intensity={chiti.intensity}
            big
          />
        </div>

        <div className="lp-bubble">
          <div className="lp-name">
            Chiti
            <button className="lp-mute" onClick={() => chiti.setMuted(!chiti.muted)}
                    title={chiti.muted ? 'Unmute Chiti' : 'Mute Chiti'}
                    aria-label={chiti.muted ? 'Unmute Chiti' : 'Mute Chiti'}>
              {chiti.muted ? '🔇' : '🔊'}
            </button>
          </div>
          <p className="lp-line">
            {typed}{!done && <span className="lp-caret" />}
          </p>
          <div className="lp-hint">Tap Chiti to poke him 👆</div>
        </div>
      </div>

      {/* ── sign in ── */}
      <div className="lp-auth">
        <div className="lp-card">
          <div className="lp-brand">
            <span style={{ width: 26, height: 26, display: 'inline-block', color: '#64D2FF' }}><BrandMark /></span>
            Sutra
          </div>
          <div className="lp-tag">Learn AI by raising a robot · Classes 6–10</div>

          {/* Role toggle: Student vs Instructor */}
          <div style={{ display: 'flex', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px' }}>
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem',
                background: !isInstructor ? 'var(--accent-cyan)' : 'transparent',
                color: !isInstructor ? '#000' : 'var(--text-secondary)',
                fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('instructor'); setError(''); }}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem',
                background: isInstructor ? 'var(--accent-purple)' : 'transparent',
                color: isInstructor ? '#FFF' : 'var(--text-secondary)',
                fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              Instructor
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: isInstructor ? 'var(--accent-purple)' : 'var(--accent-cyan)', marginBottom: '6px', fontSize: '1.2rem' }}>
              {isInstructor ? 'Instructor Sign-in' : 'Student Sign-in'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {isInstructor
                ? 'Manage your class and grading.'
                : 'Log in and pick up your mission.'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--accent-red)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isInstructor ? 'instructor email' : 'student email'}
                required
                style={{ fontSize: '0.9rem', padding: '10px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ fontSize: '0.9rem', padding: '10px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? 'var(--glass-border)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                color: isLoading ? 'var(--text-secondary)' : 'white', border: 'none', padding: '12px', borderRadius: '8px',
                fontFamily: 'Outfit', fontWeight: '600', fontSize: '0.95rem', cursor: isLoading ? 'wait' : 'pointer',
                marginTop: '10px', transition: 'transform 0.2s'
              }}
            >
              {isLoading ? 'Authenticating...' : 'Log in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            {!isInstructor && (
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={credentialResponse => {
                    googleLogin(credentialResponse.credential).catch(err => {
                      const msg = err.response?.data?.error || err.message;
                      setError(`Google Login failed: ${msg}`);
                    });
                  }}
                  onError={() => {
                    setError('Google Login failed.');
                  }}
                  theme="filled_black"
                  shape="pill"
                  text="signin_with"
                  width="280"
                />
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
              {isInstructor
                ? 'Use the instructor login your school set up.'
                : 'Students: use the login your school gave you.'}
            </p>
          </div>

          {/* Company admin (Django) — secondary, not a primary role */}
          <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <a href={ADMIN_URL} target="_blank" rel="noreferrer"
               style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Company admin? Open the admin portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
