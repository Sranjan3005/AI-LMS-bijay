import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '../api';
import { Ico } from '../components/sutra/icons';
import styles from './Landing.module.css';

// Company admin portal = Django admin, which lives at <origin>/admin/ (not under /api/v1).
const ADMIN_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/admin/';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('student');   // 'student' | 'instructor'
  const { login, googleLogin } = useContext(AuthContext);
  const isInstructor = role === 'instructor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, false);
    } catch (err) {
      const data = err.response && err.response.data;
      if (data?.email) setError('Email: ' + data.email[0]);
      else if (data?.password) setError('Password: ' + data.password[0]);
      else if (data?.detail) setError(data.detail);
      else setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroMesh} aria-hidden="true" />
      
      {/* --- Floating Snippets --- */}
      <div className={`${styles.floatingSnippet} ${styles.posTopLeft} ${styles.delay1}`}>
        <div className={styles.miniHeader}>Data Lab</div>
        <div className={styles.miniGrid}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className={i % 4 === 0 ? styles.active : ''} />
          ))}
        </div>
        <div className={styles.miniSub}>Collect it. Clean it.<br/>Question it.</div>
      </div>

      <div className={`${styles.floatingSnippet} ${styles.posBottomLeft} ${styles.delay2}`}>
        <div className={styles.miniHeader} style={{ color: 'var(--text-secondary)' }}>CBSE CT & AI · ALIGNED</div>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: '8px' }}>This week</div>
        <div className={styles.miniRow}>
          <span className={styles.miniTime} style={{ color: '#7C7AFF' }}>8:30</span>
          <div className={styles.miniDetails}>
            <span className={styles.miniTitle}>Maths for AI</span>
            <span className={styles.miniSub}>The auto-rickshaw fare meter</span>
          </div>
        </div>
        <div className={styles.miniRow}>
          <span className={styles.miniTime} style={{ color: '#64D2FF' }}>9:30</span>
          <div className={styles.miniDetails}>
            <span className={styles.miniTitle}>Data & Analysis</span>
            <span className={styles.miniSub}>Chart Detective</span>
          </div>
        </div>
      </div>

      <div className={`${styles.floatingSnippet} ${styles.posTopRight} ${styles.delay3}`}>
        <div className={styles.miniHeader} style={{ color: '#BF5AF2' }}>Teacher Dashboards</div>
        <div className={styles.miniRow}>
          <div className={styles.miniIcon} style={{ color: '#BF5AF2', background: 'rgba(191,90,242,0.1)' }}>
             <Ico name="trend" />
          </div>
          <span className={styles.miniTitle}>Track progress</span>
        </div>
        <div className={styles.miniRow}>
          <div className={styles.miniIcon}><Ico name="bars" /></div>
          <span className={styles.miniSub}>Module performance</span>
        </div>
        <div className={styles.miniRow}>
          <div className={styles.miniIcon}><Ico name="check" /></div>
          <span className={styles.miniSub}>Assignment scores</span>
        </div>
      </div>

      <div className={`${styles.floatingSnippet} ${styles.posBottomRight} ${styles.delay4}`} style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
         <div className={styles.miniPill}>
           <Ico name="nodes" />
           Wire real AI agents, node by node
         </div>
      </div>

      {/* --- Central Content --- */}
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>
          <Ico name="spark" /> THE AI-BUILDING SCHOOL · CBSE CT & AI ALIGNED
        </span>
        <h1 className={styles.tagline}>
          AI literacy,<br />
          <span className={styles.grad}>taught through building.</span>
        </h1>
        <p className={styles.subtitle}>
          Sutra is a hands-on AI curriculum for Classes 6–8. You don't watch AI — you train real models, wire live agents, and argue the ethics.
        </p>

        <div className={`glass-panel ${styles.loginWrapper}`} style={{ padding: '30px' }}>
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
                : 'Log in to your AI learning flow.'}
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
