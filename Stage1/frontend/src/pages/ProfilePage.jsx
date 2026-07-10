import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Ico } from '../components/sutra/icons';
import { initials, firstName } from '../components/sutra/SutraShell';

const ProfilePage = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow"><Ico name="user" />Your profile</span>
        <h1>Hello, <span className="grad">{firstName(user?.name)}.</span></h1>
        <p>Your account, your class, and how far you've come on the Sutra AI track.</p>
      </div>

      <div className="prof-grid">
        <div className="prof-card prof-hero">
          <div className="prof-av-lg">{initials(user?.name)}</div>
          <div className="prof-name">{user?.name || 'Student'}</div>
          <div className="prof-sub">Class {user?.grade || '8'} · AI track</div>
          <div className="prof-stats">
            <div className="prof-stat"><div className="v">48%</div><div className="l">Track done</div></div>
            <div className="prof-stat"><div className="v">5</div><div className="l">Day streak</div></div>
            <div className="prof-stat"><div className="v">2</div><div className="l">Due soon</div></div>
            <div className="prof-stat"><div className="v">A−</div><div className="l">Avg grade</div></div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
            <Ico name="logout" />Log out
          </button>
        </div>

        <div className="prof-card">
          <h3 className="card-title">Account details</h3>
          <p className="prof-sub" style={{ marginBottom: 14 }}>Managed by your school. Contact your instructor to change these.</p>
          <div className="info-row"><span className="k">Full name</span><span className="v">{user?.name || 'Student'}</span></div>
          <div className="info-row"><span className="k">Email</span><span className="v">{user?.email || '—'}</span></div>
          <div className="info-row"><span className="k">Class / grade</span><span className="v">Class {user?.grade || '8'}</span></div>
          <div className="info-row"><span className="k">Enrolled track</span><span className="v">AI (CBSE CT &amp; AI)</span></div>
          <div className="info-row"><span className="k">Instructor</span><span className="v">Ananya Iyer</span></div>
          <div className="inst-subjects" style={{ marginTop: 20 }}>
            <span className="maptag">AI Foundations ✓</span>
            <span className="maptag">Maths for AI ✓</span>
            <span className="maptag">Data &amp; Analysis · 60%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
