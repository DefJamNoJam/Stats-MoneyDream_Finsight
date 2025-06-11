// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';

export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 초기 세션 로드 & 리스너 등록
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('getSession error:', error);
        console.log('Initial session:', session);
        setUser(session?.user || null);
      } catch (e) {
        console.error('getSession exception:', e);
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      throw error;
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return;
    }
    setUser(null);
    console.log('Logged out successfully.');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
