import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { apiFetch, getStoredTokens, setStoredTokens, clearStoredTokens } from '../api';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, name: string) => Promise<UserProfile>;
  loginWithGoogle: (email: string, name: string, avatar?: string) => Promise<UserProfile>;
  logout: () => void;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check initial login state via GET /auth/me
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      apiFetch<UserProfile>('/auth/me')
        .then((user) => {
          setCurrentUser({
            ...user,
            avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            provider: user.provider || 'email',
          });
        })
        .catch(() => {
          clearStoredTokens();
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
      user: UserProfile;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setStoredTokens(data.access_token, data.refresh_token);
    const user: UserProfile = {
      ...data.user,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'email',
    };
    setCurrentUser(user);
    return user;
  };

  const register = async (email: string, password: string, name: string): Promise<UserProfile> => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
      user: UserProfile;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    setStoredTokens(data.access_token, data.refresh_token);
    const user: UserProfile = {
      ...data.user,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'email',
    };
    setCurrentUser(user);
    return user;
  };

  const loginWithGoogle = async (email: string, name: string, avatar?: string): Promise<UserProfile> => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
      user: UserProfile;
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, avatar }),
    });

    setStoredTokens(data.access_token, data.refresh_token);
    const user: UserProfile = {
      ...data.user,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'google',
    };
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    clearStoredTokens();
    setCurrentUser(null);
  };

  const continueAsGuest = () => {
    clearStoredTokens();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, loginWithGoogle, logout, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
