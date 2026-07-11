import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const { login, googleLogin } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, isAdminLogin);
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
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        
        {/* Toggle Switch */}
        <div style={{ display: 'flex', marginBottom: '30px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px' }}>
          <button 
            type="button"
            onClick={() => setIsAdminLogin(false)}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              background: !isAdminLogin ? 'var(--accent-cyan)' : 'transparent',
              color: !isAdminLogin ? '#000' : 'var(--text-secondary)',
              fontWeight: '600', transition: 'all 0.2s'
            }}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setIsAdminLogin(true)}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              background: isAdminLogin ? 'var(--accent-purple)' : 'transparent',
              color: isAdminLogin ? '#FFF' : 'var(--text-secondary)',
              fontWeight: '600', transition: 'all 0.2s'
            }}
          >
            Admin
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: isAdminLogin ? 'var(--accent-purple)' : 'var(--accent-cyan)', marginBottom: '10px' }}>
            {isAdminLogin ? 'Admin Portal' : 'AI Laboratory'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to access your dashboard</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--accent-red)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={isAdminLogin ? "admin@school.edu" : "student@example.com"}
              required 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              background: isLoading ? 'var(--glass-border)' : (isAdminLogin ? 'linear-gradient(135deg, var(--accent-purple), #FF00FF)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))'),
              color: isLoading ? 'var(--text-secondary)' : 'white', border: 'none', padding: '12px 20px', borderRadius: '8px',
              fontFamily: 'Outfit', fontWeight: '600', fontSize: '1rem', cursor: isLoading ? 'wait' : 'pointer',
              marginTop: '10px', transition: 'transform 0.2s'
            }}
          >
            {isLoading ? 'Authenticating...' : (isAdminLogin ? 'Enter Admin Panel' : 'Log in')}
          </button>
        </form>

        {!isAdminLogin && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
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
                width="320"
              />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Students: use the login your school gave you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
