import React, { useEffect, useState } from 'react';
import SutraBackground from './SutraBackground';
import { BrandMark } from './icons';
import '../../styles/sutra.css';

// Shared shell for the student-facing Sutra pages: background + sticky nav + footer.
const NAV = [
  { key: 'dashboard', label: 'Home' },
  { key: 'cbse', label: 'CBSE Curriculum' },
  { key: 'contact', label: 'Contact Instructor' },
];

const initials = (name) => (name || 'Student').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const firstName = (name) => (name || 'Student').trim().split(/\s+/)[0];

const SutraShell = ({ currentView, onNavigate, user, children }) => {
  const [scrolled, setScrolled] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sutra">
      <SutraBackground />
      <div className="s-content">
        <nav className={`s-nav${scrolled ? ' scrolled' : ''}`}>
          <div className="s-nav-in">
            <div className="brand" onClick={() => onNavigate('dashboard')}>
              <span className="brand-mark"><BrandMark /></span>
              Sutra
            </div>
            <div className="nav-links">
              {NAV.map(n => (
                <a key={n.key}
                   className={currentView === n.key ? 'is-active' : ''}
                   onClick={() => onNavigate(n.key)}>{n.label}</a>
              ))}
            </div>
            <div className="nav-right">
              <div className="profile-chip" role="button" tabIndex={0}
                   onClick={() => onNavigate('profile')}
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('profile'); }}>
                <span className="pc-av">{initials(user?.name)}</span>
                <span className="pc-name">{firstName(user?.name)}</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </div>
        </nav>

        {children}

        <footer className="s-foot">
          <div className="wrap">
            <div className="foot-grid">
              <div>
                <div className="brand" onClick={() => onNavigate('dashboard')}>
                  <span className="brand-mark"><BrandMark /></span>Sutra
                </div>
                <p className="foot-tag">The thread from arithmetic to intelligence. A hands-on AI curriculum for Classes 6–12, aligned to CBSE's CT &amp; AI framework.</p>
              </div>
              <div className="foot-col"><h5>Learn</h5>
                <a onClick={() => onNavigate('dashboard')}>My learning flow</a>
                <a onClick={() => onNavigate('cbse')}>CBSE curriculum</a>
                <a onClick={() => onNavigate('contact')}>Contact instructor</a>
              </div>
              <div className="foot-col"><h5>Account</h5>
                <a onClick={() => onNavigate('profile')}>Profile</a>
                <a onClick={() => onNavigate('contact')}>Raise a request</a>
              </div>
              <div className="foot-col"><h5>School</h5>
                <a onClick={() => onNavigate('cbse')}>Class 6–8 syllabus</a>
                <a onClick={() => onNavigate('contact')}>Your instructor</a>
              </div>
            </div>
            <div className="foot-bottom">
              <span>© {year} Sutra Learning. Built for classrooms, designed for curiosity.</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '.82rem' }}>CBSE CT &amp; AI aligned</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SutraShell;
export { initials, firstName };
