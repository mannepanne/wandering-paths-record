// ABOUT: Authentication context using Cloudflare Access + Google OAuth
// ABOUT: Auth state derived from /api/auth/me; login/logout via CF Access redirects

import { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signInWithEmail: (email: string) => void; // kept for backwards compatibility — email param ignored
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data?.email ? { email: data.email } : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = () => {
    // Navigate to /auth/login — CF Access enforces auth on this path,
    // completes Google OAuth, sets the CF-Authorization cookie, then redirects
    // back to /auth/login where the Worker redirects to /.
    window.location.href = '/auth/login';
  };

  const signOut = () => {
    setUser(null);
    window.location.href = '/cdn-cgi/access/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithEmail: signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
