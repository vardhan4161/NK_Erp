/**
 * Database Context — Provides database and repositories to all screens
 * Works on both native (expo-sqlite) and web (in-memory mock)
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase } from '@/database/db';
import { createRepositories, type Repositories } from '@/database/repositories';

interface DatabaseContextType {
  db: any | null;
  repos: Repositories | null;
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  repos: null,
  isReady: false,
  error: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<any | null>(null);
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const database = await initializeDatabase();
        if (!mounted) return;
        setDb(database);
        setRepos(createRepositories(database));
        setIsReady(true);
      } catch (e: any) {
        console.error('[DatabaseProvider] Init error:', e);
        if (mounted) setError(e.message || 'Failed to initialize database');
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, repos, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx.repos) throw new Error('useDatabase must be used within DatabaseProvider and after DB is ready');
  return ctx.repos;
}

export function useDatabaseStatus() {
  return useContext(DatabaseContext);
}
