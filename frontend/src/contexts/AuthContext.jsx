
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCSRFToken } from '../utils/csrf';

const AuthContext = createContext();

const EMPTY_PERMISSIONS = {
  dashboard:            false,
  requests:             false,
  transactions:         false,
  documents:            false,
  logs:                 false,
  settings:             false,
  developers:           false,
  view_request_details: false,
};

export const AuthProvider = ({ children }) => {
  const [user,                     setUser]                     = useState(null);
  const [role,                     setRole]                     = useState(null);
  const [permissions,              setPermissions]              = useState(EMPTY_PERMISSIONS);
  const [navigation,               setNavigation]               = useState([]);
  const [isLoading,                setIsLoading]                = useState(true);
  const [isAuthenticated,          setIsAuthenticated]          = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  // ------------------------------------------------------------------
  // Fetch the current user from the server.
  // The response now includes permissions + navigation from the server.
  // ------------------------------------------------------------------
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/admin/current-user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
      });

      if (response.ok) {
        const userData = await response.json();

        setUser({ email: userData.email, role: userData.role });
        setRole(userData.role);
        setPermissions(userData.permissions ?? EMPTY_PERMISSIONS);
        setNavigation(userData.navigation ?? []);
        setIsAuthenticated(true);
        return true;
      } else {
        _clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      _clearAuth();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const _clearAuth = () => {
    setUser(null);
    setRole(null);
    setPermissions(EMPTY_PERMISSIONS);
    setNavigation([]);
    setIsAuthenticated(false);
  };

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      _clearAuth();
    }
  };

  // ------------------------------------------------------------------
  // Permission helpers — read from the server-supplied permissions object.
  // ------------------------------------------------------------------

  /** Returns true if the server said the current user can access this feature. */
  const hasPermission = (feature) => {
    return permissions[feature] ?? false;
  };

  /**
   * Returns true if the current path corresponds to a feature the user
   * has permission for.  Unknown paths are allowed through (sub-pages, etc.).
   */
  const canAccessRoute = (path) => {
    const match = navigation.find(item => {
      // Normalise both sides: lowercase, strip trailing slash
      const itemPath = item.path.toLowerCase().replace(/\/$/, '');
      const checkPath = path.toLowerCase().replace(/\/$/, '');
      return checkPath === itemPath || checkPath.startsWith(itemPath + '/');
    });

    // If the path isn't a top-level nav route, allow it (detail pages, etc.)
    if (!match) return true;

    return permissions[match.key] ?? false;
  };

  /** Returns the server-filtered navigation array (already permission-gated). */
  const getFilteredNavigationItems = () => navigation;

  /**
   * Returns the first accessible path for the current user, based on the
   * server-supplied navigation list.  Falls back to /admin/waiting if the
   * navigation list is empty (role = "none" or not yet loaded).
   */
  const getDefaultPath = () => navigation[0]?.path ?? '/admin/waiting';

  // ------------------------------------------------------------------
  // Initialise on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      await fetchCurrentUser();
      setInitialAuthCheckComplete(true);
    };
    init();
  }, []);

  const contextValue = {
    // State
    user,
    role,
    permissions,
    navigation,
    isLoading,
    isAuthenticated,
    initialAuthCheckComplete,

    // Actions
    logout,
    refreshUser: fetchCurrentUser,

    // Permission helpers
    hasPermission,
    canAccessRoute,
    getFilteredNavigationItems,
    getDefaultPath,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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

export default AuthContext;