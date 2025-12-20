import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeRole, hasPermission as checkPermission, canAccessRoute as checkRouteAccess, getFilteredNavigationItems as checkFilteredItems } from '../utils/roleUtils';
import { getCSRFToken } from '../utils/csrf';

const AuthContext = createContext();

/**
 * Check if JWT token exists in cookies
 * @returns {boolean} - True if JWT token cookie exists
 */
const hasJWTToken = () => {
  const cookies = document.cookie.split(';');
  return cookies.some(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    return name === 'access_token_cookie' && valueParts.join('=').length > 0;
  });
};

/**
 * Authentication Provider Component
 * Manages global authentication state and user role
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);



  /**
   * Fetch current user information and role
   */

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
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
        console.log('User authentication successful:', userData);
        return true;
      } else if (response.status === 401) {
        // Token expired or invalid, clear authentication state
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
        console.log('Authentication token expired or invalid');
        return false;
      } else {
        // User not authenticated or token invalid
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setUser(null);
      setRole(null);
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
    // Only attempt to fetch current user if JWT token exists
    if (hasJWTToken()) {
      fetchCurrentUser();
    } else {
      // No JWT token found, user is not authenticated
      setIsLoading(false);
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  }, []);

  const contextValue = {
    // State
    user,
    role,
    isLoading,
    isAuthenticated,
    
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
