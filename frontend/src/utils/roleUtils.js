/**
 * Navigation item metadata.
 * This list defines order, display names, route paths, and icon names.
 * Which items a user actually sees is decided by the server —
 * AuthContext.getFilteredNavigationItems() returns the server's filtered list.
 */
export const NAVIGATION_ITEMS = [
  { key: 'dashboard',    name: 'Dashboard',    path: '/admin/Dashboard',    icon: 'DashboardIcon' },
  { key: 'requests',     name: 'Requests',     path: '/admin/Requests',     icon: 'RequestsIcon'  },
  { key: 'transactions', name: 'Transactions', path: '/admin/Transactions', icon: 'PaidIcon'      },
  { key: 'documents',    name: 'Documents',    path: '/admin/Documents',    icon: 'DocumentsIcon' },
  { key: 'logs',         name: 'Logs',         path: '/admin/Logs',         icon: 'LogsIcon'      },
  { key: 'settings',     name: 'Settings',     path: '/admin/Settings',     icon: 'SettingsIcon'  },
  { key: 'developers',   name: 'Developers',   path: '/admin/Developers',   icon: 'CodeIcon'      },
];