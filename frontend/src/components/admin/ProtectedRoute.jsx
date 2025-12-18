import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Protected Route Component for Role-Based Access Control
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {Array<string>} props.requiredPermissions - Array of required permissions
 * @param {string} props.redirectTo - Path to redirect if unauthorized
 */
const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [], 
  redirectTo = '/admin/waiting' 
}) => {

  const { user, role, isLoading, isAuthenticated, canAccessRoute, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Checking permissions..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Redirect to waiting page if role is 'none' (pending approval)
  if (role === 'none') {
    return <Navigate to="/admin/waiting" state={{ from: location }} replace />;
  }

  // Check if user can access current route
  const currentPath = location.pathname;
  if (!canAccessRoute(currentPath)) {
    // Redirect to the first accessible page or waiting page
    const accessiblePath = getFirstAccessiblePath(role);
    return <Navigate to={accessiblePath} state={{ from: location }} replace />;
  }


  // Check individual permissions if specified
  if (requiredPermissions.length > 0) {
    // Check if user has ANY of the required permissions (OR logic)
    const hasAnyPermission = requiredPermissions.some(permission => {
      if (permission === 'view_request_details') {
        // Special handling for view_request_details permission
        return hasPermission('view_request_details');
      }
      return canAccessRoute(getPathForPermission(permission));
    });

    if (!hasAnyPermission) {
      const accessiblePath = getFirstAccessiblePath(role);
      return <Navigate to={accessiblePath} state={{ from: location }} replace />;
    }
  }

  // User is authorized, render the protected content
  return children;
};

/**
 * Get the first accessible path for a user's role
 * @param {string} role - User's role
 * @returns {string} - First accessible path
 */
const getFirstAccessiblePath = (role) => {
  const rolePaths = {
    admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    staff: '/admin/dashboard',
    none: '/admin/waiting',
  };

  return rolePaths[role] || '/admin/waiting';
};

/**
 * Get path for a specific permission
 * @param {string} permission - Permission name
 * @returns {string} - Corresponding path
 */
const getPathForPermission = (permission) => {
  const permissionPaths = {
    dashboard: '/admin/dashboard',
    requests: '/admin/requests',
    transactions: '/admin/transactions',
    documents: '/admin/document',
    logs: '/admin/logs',
    settings: '/admin/settings',
  };

  return permissionPaths[permission] || '/admin/dashboard';
};

/**
 * Access Denied Component
 * @param {Object} props - Component props
 * @param {string} props.message - Custom error message
 */
export const AccessDenied = ({ message = "You don't have permission to access this page." }) => {
  const { getFilteredNavigationItems } = useAuth();
  const accessibleItems = getFilteredNavigationItems();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg 
            className="mx-auto h-16 w-16 text-red-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {accessibleItems.length > 0 ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">You can access:</p>
            <div className="space-y-2">
              {accessibleItems.slice(0, 3).map((item) => (
                <div key={item.path} className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Contact an administrator to request access.
          </div>
        )}
        
        <button 
          onClick={() => window.history.back()}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

/**
 * Higher-Order Component for creating protected components
 * @param {React.ReactNode} Component - Component to protect
 * @param {Array<string>} requiredPermissions - Required permissions
 * @returns {React.ReactNode} - Protected component
 */
export const withRoleProtection = (Component, requiredPermissions = []) => {
  return (props) => (
    <ProtectedRoute requiredPermissions={requiredPermissions}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;
