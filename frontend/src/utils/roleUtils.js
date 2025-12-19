
// Role-based access control utilities

/**
 * Define role permissions for navigation items
 * This is the single source of truth for all role permissions
 */
export const ROLE_PERMISSIONS = {
  admin: {
    dashboard: true,
    requests: true,
    transactions: true,
    documents: true,
    logs: true,
    settings: true,
    developers: true,  
    view_request_details: true,
  },
  developer: {
    dashboard: true,
    requests: true,
    transactions: true,
    documents: true,
    logs: true,
    settings: true,
    developers: true,  
    view_request_details: true,
  },
  manager: {
    dashboard: true,
    requests: true,
    transactions: true,
    documents: true,
    logs: true,
    settings: false,
    developers: false,
    view_request_details: true,
  },
  auditor: {
    dashboard: true,
    requests: false,
    transactions: true,
    documents: false,
    logs: true,
    settings: false,
    developers: false,
    view_request_details: true,
  },
  staff: {
    dashboard: true,
    requests: true,
    transactions: false,
    documents: false,
    logs: false,
    settings: false,
    developers: false,
    view_request_details: true,
  },
  none: {
    dashboard: false,
    requests: false,
    transactions: false,
    documents: false,
    logs: false,
    settings: false,
    developers: false,
    view_request_details: false,
  },
};



/**
 * Define navigation items with their corresponding permission keys
 * This includes icon information for the Sidebar component
 */
export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: '/admin/dashboard', permission: 'dashboard', icon: 'DashboardIcon' },
  { name: 'Requests', path: '/admin/requests', permission: 'requests', icon: 'RequestsIcon' },
  { name: 'Transactions', path: '/admin/transactions', permission: 'transactions', icon: 'PaidIcon' },
  { name: 'Documents', path: '/admin/document', permission: 'documents', icon: 'DocumentsIcon' },
  { name: 'Logs', path: '/admin/logs', permission: 'logs', icon: 'LogsIcon' },
  { name: 'Settings', path: '/admin/settings', permission: 'settings', icon: 'SettingsIcon' },
  { name: 'Developers', path: '/admin/developers', permission: 'developers', icon: 'CodeIcon' }
];

/**
 * Check if user has permission to access a specific page
 * @param {string} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[role.toLowerCase()];
  if (!rolePermissions) return false;
  
  return rolePermissions[permission] || false;
};


/**
 * Get navigation items filtered by user role
 * @param {string} role - User's role
 * @returns {Array} - Filtered navigation items
 */
export const getFilteredNavigationItems = (role) => {
  if (!role) return [];
  
  return NAVIGATION_ITEMS.filter(item => hasPermission(role, item.permission));
};


/**
 * Check if user can access a specific route
 * @param {string} role - User's role
 * @param {string} path - Route path to check
 * @returns {boolean} - True if user can access route
 */
export const canAccessRoute = (role, path) => {
  if (!role || !path) return false;
  
  const navItem = NAVIGATION_ITEMS.find(item => item.path === path);
  if (!navItem) return true; // Allow access to unknown routes for now
  
  return hasPermission(role, navItem.permission);
};

/**
 * Get the default redirect path for a user's role
 * @param {string} role - User's role
 * @returns {string} - Default path for the role
 */
export const getDefaultPathForRole = (role) => {
  if (!role) return '/admin/login';
  
  // Find first allowed navigation item for the role
  const allowedItems = getFilteredNavigationItems(role);
  if (allowedItems.length > 0) {
    return allowedItems[0].path;
  }
  
  // If no items allowed, redirect to waiting page
  return '/admin/waiting';
};


/**
 * Validate and normalize user role
 * @param {string} role - Raw role from server
 * @returns {string} - Normalized role
 */
export const normalizeRole = (role) => {
  if (!role) return 'none';
  
  const validRoles = ['admin', 'manager', 'auditor', 'staff', 'developer', 'none'];
  const normalizedRole = role.toLowerCase().trim();
  
  return validRoles.includes(normalizedRole) ? normalizedRole : 'none';
};
