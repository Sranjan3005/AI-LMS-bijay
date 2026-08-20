import React, { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists on load
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUserProfile();
    } else {
      autoGuestLogin();
    }
  }, []);

  const autoGuestLogin = async () => {
    try {
      // Try to login directly first
      await login('guest@example.com', 'guestpassword');
    } catch (e) {
      // If login fails, user probably doesn't exist, so register then login
      try {
        await api.post('/auth/register/', { 
          name: 'Guest Student', 
          email: 'guest@example.com', 
          password: 'guestpassword', 
          password2: 'guestpassword', 
          grade: '8' 
        });
        await login('guest@example.com', 'guestpassword');
      } catch (e2) {
        console.error("Auto guest login failed", e2);
        setLoading(false);
      }
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, isAdminLogin = false) => {
    const response = await api.post('/auth/login/', { email, password, is_admin: isAdminLogin });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    await fetchUserProfile();
  };

  const googleLogin = async (credential) => {
    const response = await api.post('/auth/google/', { credential });
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    await fetchUserProfile();
  };

  const registerUser = async (name, email, password, grade) => {
    await api.post('/auth/register/', { name, email, password, password2: password, grade });
    await login(email, password, false);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register: registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
