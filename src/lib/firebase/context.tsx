"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  refreshToken: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
      const tokenResult = await getIdTokenResult(auth.currentUser);
      setRole((tokenResult.claims.role as string) || "customer");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const tokenResult = await getIdTokenResult(firebaseUser);
          setRole((tokenResult.claims.role as string) || "customer");
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setRole("customer");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
