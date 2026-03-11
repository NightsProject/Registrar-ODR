
import React, { useState, useEffect, useCallback } from "react";
import { getCSRFToken } from "../../utils/csrf";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import SearchBar from "../../components/common/SearchBar";

import DownloadIcon from "../../components/icons/DownloadIcon";
import ClockIcon from "../../components/icons/ClockIcon";
import "./Logs.css";

const CACHE_KEY = "logs_enhanced_cache";

const getStoredState = (key, defaultValue) => {
    try {
        const stored = sessionStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error){
        console.warn("Failed to parse session storage", error)
        return defaultValue;
    }       
}

function Logs() {
    const cachedData = getStoredState(CACHE_KEY, null);
    
    // State management
    const [logs, setLogs] = useState(cachedData?.logs || []);
    const [loading, setLoading] = useState(cachedData == null);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(cachedData?.total_count || 0);
    const [currentPage, setCurrentPage] = useState(cachedData?.page || 1);
    const [perPage] = useState(50);
    const [totalPages, setTotalPages] = useState(cachedData?.total_pages || 1);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Filter and search state
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
        admin_id: '',
        log_level: '',
        category: '',
        request_id: '',
        date_from: '',
        date_to: ''
    });
    const [quickFilters, setQuickFilters] = useState('');
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Filter options
    const [filterOptions, setFilterOptions] = useState({
        admin_ids: [],
        log_levels: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        categories: ['SYSTEM', 'AUTHENTICATION', 'REQUEST_MANAGEMENT', 'DOCUMENT_MANAGEMENT', 'USER_MANAGEMENT', 'PAYMENT', 'ADMINISTRATION', 'SECURITY', 'ERROR']
    });
    
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Load filter options
    useEffect(() => {
        loadFilterOptions();
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText !== (cachedData?.search_text || '')) {
                setCurrentPage(1);
                fetchLogs();
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [searchText]);

    // Fetch logs when filters change
    useEffect(() => {
        if (JSON.stringify(filters) !== JSON.stringify(cachedData?.filters || {})) {
            setCurrentPage(1);
            fetchLogs();
        }
    }, [filters]);

    useEffect(() => {
        if (quickFilters !== (cachedData?.quick_filters || '')) {
            setCurrentPage(1);
            fetchLogs();
        }
    }, [quickFilters]);

    const loadFilterOptions = async () => {
        try {
            const response = await fetch('/api/admin/logs/filter-options', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken(),
                },
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                setFilterOptions(prev => ({
                    ...prev,
                    ...data
                }));
            }
        } catch (err) {
            console.warn('Failed to load filter options:', err);
        }
    };

    const fetchLogs = async (page = currentPage) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
                sort_by: sortBy,
                sort_order: sortOrder
            });

            if (searchText) params.append('search', searchText);
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            if (quickFilters) params.append('quick_filter', quickFilters);

            const response = await fetch(`/api/admin/logs?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken(),
                },
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            
            const data = await response.json();
            
            setLogs(data.logs || []);
            setTotalCount(data.total_count || 0);
            setCurrentPage(data.page || 1);
            setTotalPages(data.total_pages || 1);
            
            // Cache the data
            const cacheData = {
                ...data,
                search_text: searchText,
                filters,
                quick_filters: quickFilters,
                sort_by: sortBy,
                sort_order: sortOrder
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column) => {
        const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortBy(column);
        setSortOrder(newOrder);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            admin_id: '',
            log_level: '',
            category: '',
            request_id: '',
            date_from: '',
            date_to: ''
        });
        setSearchText('');
        setQuickFilters('');
        setCurrentPage(1);
    };

    const exportLogs = async (format = 'json') => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                format
            });

            if (searchText) params.append('search', searchText);
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            if (quickFilters) params.append('quick_filter', quickFilters);

            const response = await fetch(`/api/admin/logs/export?${params}`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(`Export failed: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return '↕️';
        return sortOrder === 'desc' ? '⬇️' : '⬆️';
    };

    const getLogLevelBadge = (level) => {
        const colors = {
            'DEBUG': 'bg-gray-100 text-gray-800',
            'INFO': 'bg-blue-100 text-blue-800',
            'WARNING': 'bg-yellow-100 text-yellow-800',
            'ERROR': 'bg-red-100 text-red-800',
            'CRITICAL': 'bg-red-200 text-red-900'
        };
        return colors[level] || colors['INFO'];
    };

    const getCategoryBadge = (category) => {
        const colors = {
            'SYSTEM': 'bg-gray-100 text-gray-800',
            'AUTHENTICATION': 'bg-green-100 text-green-800',
            'REQUEST_MANAGEMENT': 'bg-blue-100 text-blue-800',
            'DOCUMENT_MANAGEMENT': 'bg-purple-100 text-purple-800',
            'USER_MANAGEMENT': 'bg-indigo-100 text-indigo-800',
            'PAYMENT': 'bg-yellow-100 text-yellow-800',
            'ADMINISTRATION': 'bg-gray-100 text-gray-800',
            'SECURITY': 'bg-red-100 text-red-800',
            'ERROR': 'bg-red-100 text-red-800'
        };
        return colors[category] || colors['ADMINISTRATION'];
    };

    if (loading && logs.length === 0) {
        return <LoadingSpinner message="Loading logs..." />;
    }

    if (error && logs.length === 0) {
        return (
            <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                    <button 
                        onClick={() => fetchLogs()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <h1 className="logs-header text-3xl font-semibold mb-4 lg:mb-0 text-gray-800">
                        System Logs
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                showFilters ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Filters
                        </button>
                        <div 
                            className="export-select-wrapper" 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            tabIndex={0}
                            onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                setShowExportMenu(false);
                            }
                            }}
                        >
                            <DownloadIcon className="export-icon" width="16" height="16" />
                            <span className="export-select-text">Export</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`export-select-arrow ${showExportMenu ? 'rotate' : ''}`}>
                            <path d="M6 9l6 6 6-6" />
                            </svg>
                            {showExportMenu && (
                            <div className="export-dropdown-menu">
                                <div className="export-option" onClick={() => exportLogs('csv')}>CSV</div>
                                <div className="export-option" onClick={() => exportLogs('json')}>JSON</div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-6">
                    <div className="mb-4">
                        <SearchBar
                            placeholder="Search logs (action, details, admin, etc.)"
                            value={searchText}
                            onChange={setSearchText}
                            className="w-full"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setQuickFilters('last_24h')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                                quickFilters === 'last_24h' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Last 24 Hours
                        </button>
                        <button
                            onClick={() => setQuickFilters('last_7d')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                                quickFilters === 'last_7d' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => setQuickFilters('last_30d')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                                quickFilters === 'last_30d' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => {clearFilters(); setCurrentPage(1);}}
                            className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
                                <select
                                    value={filters.admin_id}
                                    onChange={(e) => handleFilterChange('admin_id', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Admins</option>
                                    {filterOptions.admin_ids.map(admin => (
                                        <option key={admin} value={admin}>{admin}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
                                <select
                                    value={filters.log_level}
                                    onChange={(e) => handleFilterChange('log_level', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Levels</option>
                                    {filterOptions.log_levels.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Categories</option>
                                    {filterOptions.categories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                                <input
                                    type="text"
                                    value={filters.request_id}
                                    onChange={(e) => handleFilterChange('request_id', e.target.value)}
                                    placeholder="e.g., R0000001"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                                <input
                                    type="datetime-local"
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                                <input
                                    type="datetime-local"
                                    value={filters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                    <div>
                        Showing {logs.length} of {totalCount.toLocaleString()} logs
                        {searchText && ` matching "${searchText}"`}
                        {quickFilters && ` (${quickFilters.replace('_', ' ')})`}
                    </div>
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>Page {currentPage} of {totalPages}</span>
                    </div>
                </div>

                {/* Logs Table */}
                {logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <div className="text-lg">No logs found</div>
                        <div className="text-sm mt-2">
                            Try adjusting your search criteria or filters
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('timestamp')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Timestamp {getSortIcon('timestamp')}
                                        </div>
                                    </th>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('admin_id')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Admin {getSortIcon('admin_id')}
                                        </div>
                                    </th>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('action')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Action {getSortIcon('action')}
                                        </div>
                                    </th>
                                    <th className="py-3 px-4 border-b text-left">Details</th>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('request_id')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Request {getSortIcon('request_id')}
                                        </div>
                                    </th>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('log_level')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Level {getSortIcon('log_level')}
                                        </div>
                                    </th>
                                    <th 
                                        className="py-3 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('category')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Category {getSortIcon('category')}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 border-b text-sm">
                                            <div className="font-mono">
                                                {log.timestamp}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            <div className="font-medium text-blue-600">
                                                {log.admin_id}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            <div className="font-medium">
                                                {log.action}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            <div className="max-w-xs truncate" title={log.details}>
                                                {log.details || '-'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            {log.request_id && log.request_id !== 'none' ? (
                                                <span className="text-purple-600 font-mono">
                                                    {log.request_id}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogLevelBadge(log.log_level)}`}>
                                                {log.log_level}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 border-b text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadge(log.category)}`}>
                                                {log.category}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <button
                            onClick={() => fetchLogs(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => fetchLogs(page)}
                                        className={`px-3 py-2 rounded-lg ${
                                            currentPage === page
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => fetchLogs(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Logs;
