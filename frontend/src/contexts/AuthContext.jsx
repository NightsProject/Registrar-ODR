

import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeRole } from '../utils/roleUtils';
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
    if (!role || !permission) return false;
    



    const rolePermissions = {
      admin: ['dashboard', 'requests', 'transactions', 'documents', 'logs', 'settings'],
      manager: ['dashboard', 'requests', 'documents', 'logs'],
      auditor:['dashboard', 'transactions', 'view_request_details'],
      staff: ['dashboard', 'requests'],
      none: [],
    };
    
    return rolePermissions[role]?.includes(permission) || false;
  };

  /**
   * Check if user can access specific route
   * @param {string} path - Route path to check
   * @returns {boolean} - True if user can access route
   */
  const canAccessRoute = (path) => {
    if (!role || !path) return false;
    
    const routePermissions = {
      '/admin/dashboard': 'dashboard',
      '/admin/requests': 'requests',
      '/admin/transactions': 'transactions',
      '/admin/document': 'documents',
      '/admin/logs': 'logs',
      '/admin/settings': 'settings',
    };
    
    const permission = routePermissions[path];
    return permission ? hasPermission(permission) : true;
  };

  /**
   * Get filtered navigation items based on user role
   * @returns {Array} - Filtered navigation items
   */
  const getFilteredNavigationItems = () => {
    if (!role) return [];
    
    const navigationItems = [
      { name: 'Dashboard', path: '/admin/dashboard', permission: 'dashboard' },
      { name: 'Requests', path: '/admin/requests', permission: 'requests' },
      { name: 'Transactions', path: '/admin/transactions', permission: 'transactions' },
      { name: 'Documents', path: '/admin/document', permission: 'documents' },
      { name: 'Logs', path: '/admin/logs', permission: 'logs' },
      { name: 'Settings', path: '/admin/settings', permission: 'settings' }
    ];
    
    return navigationItems.filter(item => hasPermission(item.permission));
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
