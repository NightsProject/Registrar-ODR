import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeRole, hasPermission as checkPermission, canAccessRoute as checkRouteAccess, getFilteredNavigationItems as checkFilteredItems } from '../utils/roleUtils';
import { getCSRFToken } from '../utils/csrf';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      // Don't set isLoading(true) here if it's already true from initialization
      // to avoid unnecessary re-renders
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
        setUser(userData);
        setRole(normalizeRole(userData.role));
        setIsAuthenticated(true);
        return true;
      } else {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Update user role
   * @param {string} newRole - New role to set
   */
  const updateRole = (newRole) => {
    const normalizedRole = normalizeRole(newRole);
    setRole(normalizedRole);
    
    if (user) {
      setUser({
        ...user,
        role: normalizedRole,
      });
    }
  };


  /**
   * Logout user
   */
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
      // Clear local state regardless of API call success
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  };



  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} - True if user has permission
   */
  const hasPermission = (permission) => {
    return checkPermission(role, permission);
  };


  /**
   * Check if user can access specific route
   * @param {string} path - Route path to check
   * @returns {boolean} - True if user can access route
   */
  const canAccessRoute = (path) => {
    return checkRouteAccess(role, path);
  };



  /**
   * Get filtered navigation items based on user role
   * @returns {Array} - Filtered navigation items
   */
  const getFilteredNavigationItems = () => {
    if (!role) return [];
    
    // Use the centralized function from roleUtils
    return checkFilteredItems(role);
  };

  // Initialize authentication state on component mount
  useEffect(() => {
    const initAuth = async () => {
      // Always attempt to fetch the user on mount.
      // The browser will automatically send the HttpOnly cookie.
      await fetchCurrentUser();
      setInitialAuthCheckComplete(true);
    };
    
    initAuth();
  }, []);

  const contextValue = {
    // State
    user,
    role,
    isLoading,
    isAuthenticated,
    initialAuthCheckComplete,
    
    // Actions
    updateRole,
    logout,
    refreshUser: fetchCurrentUser,
    
    // Permission checks
    hasPermission,
    canAccessRoute,
    getFilteredNavigationItems,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use authentication context
 * @returns {Object} - Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
