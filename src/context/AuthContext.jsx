import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { localApi } from '../services/localApi';

const TOKEN_KEY = 'cura_token';
const isMockMode = import.meta.env.VITE_USE_MOCK === 'true';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active auth service based on VITE_USE_MOCK switch
  const authService = isMockMode ? localApi : apiClient;

  useEffect(() => {
    async function loadSession() {
      try {
        // Do not treat a missing token as an authenticated session in API mode
        if (!isMockMode && !localStorage.getItem(TOKEN_KEY)) {
          setUser(null);
          setLoading(false);
          return;
        }

        const u = await authService.getCurrentUser();
        setUser(u || null);
      } catch (err) {
        console.error('Failed to load user session', err);
        if (!isMockMode) {
          localStorage.removeItem(TOKEN_KEY);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const u = await authService.login(email, password);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      const u = await authService.signup(userData);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;
    const userId = user.id || user._id;
    const updated = await authService.updateProfile(userId, updates);
    setUser(updated);
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) return;
    const userId = user.id || user._id;
    const updated = await authService.changePassword(userId, currentPassword, newPassword);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUserProfile,
        changePassword,
        isTechnician: user?.role === 'Technician',
        isClinician: user?.role === 'Clinician',
        isAdmin: user?.role === 'Admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
