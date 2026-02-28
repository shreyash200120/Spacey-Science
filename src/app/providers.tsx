'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "@/lib/firebaseAuth";

type AuthState = {
  user: User | null;
  hasLoaded: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, hasLoaded: false });

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setHasLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, hasLoaded }), [user, hasLoaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

