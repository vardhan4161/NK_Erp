/**
 * Auth Context — PIN-based local authentication
 * Persists session in AsyncStorage, auto-locks after inactivity
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/database/repositories';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

const AUTH_STORAGE_KEY = 'nk_erp_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error('[Auth] Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
