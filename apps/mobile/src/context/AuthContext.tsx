import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  clearTokens,
  getTokens,
} from '../services/authStorage';

import {
  logoutUser, getCurrentUser
} from '../services/authService';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'SUPPORT'
  | 'CLIENT'
  | 'WORKER';

export type AuthUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  status: string;
};

type BackendAuthUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  status: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  refreshAuthState: () => Promise<void>;
  setAuthenticatedUser: (
    user: BackendAuthUser,
  ) => void;
  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

function isUserRole(
  role: string,
): role is UserRole {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'OPERATIONS' ||
    role === 'FINANCE' ||
    role === 'SUPPORT' ||
    role === 'CLIENT' ||
    role === 'WORKER'
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const setAuthenticatedUser = useCallback(
  (authenticatedUser: BackendAuthUser) => {
    if (!isUserRole(authenticatedUser.role)) {
      throw new Error(
        `Unsupported user role: ${authenticatedUser.role}`,
      );
    }

    setUser({
      ...authenticatedUser,
      role: authenticatedUser.role,
    });

    setIsAuthenticated(true);
  },
  [],
);

const refreshAuthState =
  useCallback(async () => {
    try {
      const tokens = await getTokens();

      if (!tokens?.accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const response =
        await getCurrentUser();

      setAuthenticatedUser(response.user);
    } catch {
      await clearTokens();

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setAuthenticatedUser]);

  const logout = useCallback(async () => {
    await logoutUser();

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    void refreshAuthState();
  }, [refreshAuthState]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        refreshAuthState,
        setAuthenticatedUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}