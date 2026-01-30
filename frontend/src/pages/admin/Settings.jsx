
import React, { useState, useEffect } from 'react';
import './Settings.css';
import { getCSRFToken } from "../../utils/csrf";
import RoleChangeConfirmModal from '../../components/admin/RoleChangeConfirmModal';
import AddAdminPopup from '../../components/admin/AddAdminPopup';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


const Settings = () => {
    const [admins, setAdmins] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('admin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterRole, setFilterRole] = useState('admin');
    const [roleChangeRequest, setRoleChangeRequest] = useState(null);
    const [showAddAdminPopup, setShowAddAdminPopup] = useState(false);
    const [startHour, setStartHour] = useState('9');
    const [startMinute, setStartMinute] = useState('00');
    const [startAmpm, setStartAmpm] = useState('AM');
    const [endHour, setEndHour] = useState('5');
    const [endMinute, setEndMinute] = useState('00');
    const [endAmpm, setEndAmpm] = useState('PM');
    const [availableDays, setAvailableDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const [adminFee, setAdminFee] = useState('');
    const [initialAdminFee, setInitialAdminFee] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [initialAnnouncement, setInitialAnnouncement] = useState('');

    const [initialAvailability, setInitialAvailability] = useState({
        startHour: '9', startMinute: '00', startAmpm: 'AM',
        endHour: '5', endMinute: '00', endAmpm: 'PM',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    });

    // Date management state
    const [dateSettings, setDateSettings] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [dateAvailability, setDateAvailability] = useState(true);
    const [dateReason, setDateReason] = useState('');
    const [showDateManagement, setShowDateManagement] = useState(false);
    const [bulkDateAction, setBulkDateAction] = useState('available'); // 'available' or 'unavailable'
    const [bulkDateStart, setBulkDateStart] = useState('');
    const [bulkDateEnd, setBulkDateEnd] = useState('');
    const [bulkDateReason, setBulkDateReason] = useState('');
    const [loadingDateOps, setLoadingDateOps] = useState(false);

    // Domain whitelist state
    const [domains, setDomains] = useState([]);
    const [newDomain, setNewDomain] = useState('');
    const [newDomainDescription, setNewDomainDescription] = useState('');
    const [showDomainManagement, setShowDomainManagement] = useState(false);
    const [loadingDomainOps, setLoadingDomainOps] = useState(false);


    useEffect(() => {
        fetchAdmins();
        fetchSettings();
        fetchAdminFee();
        if (showDateManagement) {
            fetchDateSettings();
        }
        if (showDomainManagement) {
            fetchDomains();
        }
    }, [showDateManagement, showDomainManagement]);

    const fetchAdmins = async () => {
        try {
            const response = await fetch('/api/admin/admins', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setAdmins(data);
            } else {
                setError('Failed to fetch admins');
            }
        } catch (err) {
            setError('Error fetching admins');
        }
    };

    const addAdmin = async (email, role) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ email, role }),
            });

            if (response.ok) {
                fetchAdmins();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add admin');
            }
        } catch (err) {
            setError('Error adding admin');
        } finally {
            setLoading(false);
        }
    };

    const updateAdmin = (email, newRole) => {
        const admin = admins.find(a => a.email === email);
        if (admin && admin.role !== newRole) {
            setRoleChangeRequest({ admin, newRole });
        }
    };

    const confirmRoleChange = async () => {
        if (!roleChangeRequest) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/admin/admins/${roleChangeRequest.admin.email}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ role: roleChangeRequest.newRole }),
            });

            if (response.ok) {
                fetchAdmins();
                setRoleChangeRequest(null);
            } else {
                setError('Failed to update admin');
            }
        } catch (err) {
            setError('Error updating admin');
        } finally {
            setLoading(false);
        }
    };

    const deleteAdmin = async (email) => {
        if (!window.confirm(`Are you sure you want to delete admin ${email}?`)) return;

        try {
            const response = await fetch(`/api/admin/admins/${email}`, {
                method: 'DELETE',
                headers: {
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                fetchAdmins();
            } else {
                setError('Failed to delete admin');
            }
        } catch (err) {
            setError('Error deleting admin');
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Parse 24-hour time to 12-hour
                const [startH, startM] = data.start_time.split(':');
                const startHour24 = parseInt(startH);
                const sHour = startHour24 === 0 ? '12' : startHour24 > 12 ? (startHour24 - 12).toString() : startHour24.toString();
                const sAmpm = startHour24 >= 12 ? 'PM' : 'AM';
                
                setStartHour(sHour);
                setStartMinute(startM);
                setStartAmpm(sAmpm);

                const [endH, endM] = data.end_time.split(':');
                const endHour24 = parseInt(endH);
                const eHour = endHour24 === 0 ? '12' : endHour24 > 12 ? (endHour24 - 12).toString() : endHour24.toString();
                const eAmpm = endHour24 >= 12 ? 'PM' : 'AM';


                setEndHour(eHour);
                setEndMinute(endM);
                setEndAmpm(eAmpm);

                setAvailableDays(data.available_days);
                setAnnouncement(data.announcement || '');
                setInitialAnnouncement(data.announcement || '');
                setInitialAvailability({
                    startHour: sHour, startMinute: startM, startAmpm: sAmpm,
                    endHour: eHour, endMinute: endM, endAmpm: eAmpm,
                    availableDays: data.available_days
                });
            } else {
                setError('Failed to fetch settings');
            }
        } catch (err) {
            setError('Error fetching settings');
        }
    };

    const fetchAdminFee = async () => {
        try {
            const response = await fetch('/api/admin/settings/fee', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const fee = parseFloat(data.admin_fee || 0).toFixed(2);
                setAdminFee(fee);
                setInitialAdminFee(fee);
            }
        } catch (err) {
            console.error('Error fetching admin fee:', err);
        }
    };

    const updateSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Convert 12-hour to 24-hour
        const startHour24 = startAmpm === 'PM' && startHour !== '12' ? parseInt(startHour) + 12 : startAmpm === 'AM' && startHour === '12' ? 0 : parseInt(startHour);
        const endHour24 = endAmpm === 'PM' && endHour !== '12' ? parseInt(endHour) + 12 : endAmpm === 'AM' && endHour === '12' ? 0 : parseInt(endHour);
        const startTime24 = `${startHour24.toString().padStart(2, '0')}:${startMinute}`;
        const endTime24 = `${endHour24.toString().padStart(2, '0')}:${endMinute}`;

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ start_time: startTime24, end_time: endTime24, available_days: availableDays, announcement: announcement }),
            });


            if (response.ok) {
                // Settings updated successfully
                setInitialAvailability({
                    startHour, startMinute, startAmpm,
                    endHour, endMinute, endAmpm,
                    availableDays
                });
                setInitialAnnouncement(announcement);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update settings');
            }
        } catch (err) {
            setError('Error updating settings');
        } finally {
            setLoading(false);
        }
    };

    const updateAdminFee = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/settings/fee', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ admin_fee: parseFloat(adminFee) }),
            });

            if (!response.ok) {
                setError('Failed to update admin fee');
            } else {
                const formatted = parseFloat(adminFee).toFixed(2);
                setAdminFee(formatted);
                setInitialAdminFee(formatted);
            }
        } catch (err) {
            setError('Error updating admin fee');
        } finally {
            setLoading(false);
        }
    };


    const toggleDay = (day) => {
        setAvailableDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    // Date management functions
    const fetchDateSettings = async () => {
        try {
            const response = await fetch('/api/admin/available-dates', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setDateSettings(data.date_settings || []);
            } else {
                setError('Failed to fetch date settings');
            }
        } catch (err) {
            setError('Error fetching date settings');
        }
    };

    const updateDateAvailability = async (e) => {
        e.preventDefault();
        if (!selectedDate) return;

        setLoadingDateOps(true);
        setError('');

        try {
            const response = await fetch('/api/admin/available-dates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({
                    date: selectedDate,
                    is_available: dateAvailability,
                    reason: dateReason
                }),
            });

            if (response.ok) {
                setSelectedDate('');
                setDateReason('');
                fetchDateSettings();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update date availability');
            }
        } catch (err) {
            setError('Error updating date availability');
        } finally {
            setLoadingDateOps(false);
        }
    };

    const deleteDateAvailability = async (dateStr) => {
        if (!window.confirm(`Remove availability setting for ${dateStr}?`)) return;

        setLoadingDateOps(true);
        setError('');

        try {
            const response = await fetch(`/api/admin/available-dates/${dateStr}`, {
                method: 'DELETE',
                headers: {
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                fetchDateSettings();
            } else {
                setError('Failed to delete date availability');
            }
        } catch (err) {
            setError('Error deleting date availability');
        } finally {
            setLoadingDateOps(false);
        }
    };

    const bulkUpdateDates = async (e) => {
        e.preventDefault();
        if (!bulkDateStart || !bulkDateEnd) return;

        setLoadingDateOps(true);
        setError('');

        // Generate date range
        const dates = [];
        const startDate = new Date(bulkDateStart);
        const endDate = new Date(bulkDateEnd);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }

        try {
            const response = await fetch('/api/admin/available-dates/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({
                    dates: dates,
                    is_available: bulkDateAction === 'available',
                    reason: bulkDateReason
                }),
            });

            if (response.ok) {
                setBulkDateStart('');
                setBulkDateEnd('');
                setBulkDateReason('');
                fetchDateSettings();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to bulk update dates');
            }
        } catch (err) {
            setError('Error bulk updating dates');
        } finally {
            setLoadingDateOps(false);
        }
    };


    const isAvailabilityChanged = 
        startHour !== initialAvailability.startHour ||
        startMinute !== initialAvailability.startMinute ||
        startAmpm !== initialAvailability.startAmpm ||
        endHour !== initialAvailability.endHour ||
        endMinute !== initialAvailability.endMinute ||
        endAmpm !== initialAvailability.endAmpm ||
        JSON.stringify([...availableDays].sort()) !== JSON.stringify([...initialAvailability.availableDays].sort());

    // Domain management functions
    const fetchDomains = async () => {
        try {
            const response = await fetch('/api/admin/domain-whitelist', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setDomains(data.domains || []);
            } else {
                setError('Failed to fetch domains');
            }
        } catch (err) {
            setError('Error fetching domains');
        }
    };

    const addDomain = async (e) => {
        e.preventDefault();
        if (!newDomain.trim()) return;

        setLoadingDomainOps(true);
        setError('');

        try {
            const response = await fetch('/api/admin/domain-whitelist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({
                    domain: newDomain.trim(),
                    description: newDomainDescription.trim(),
                    is_active: true
                }),
            });

            if (response.ok) {
                setNewDomain('');
                setNewDomainDescription('');
                fetchDomains();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add domain');
            }
        } catch (err) {
            setError('Error adding domain');
        } finally {
            setLoadingDomainOps(false);
        }
    };

    const toggleDomainStatus = async (domainId) => {
        setLoadingDomainOps(true);
        setError('');

        try {
            const response = await fetch(`/api/admin/domain-whitelist/${domainId}/toggle`, {
                method: 'PATCH',
                headers: {
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                fetchDomains();
            } else {
                setError('Failed to toggle domain status');
            }
        } catch (err) {
            setError('Error toggling domain status');
        } finally {
            setLoadingDomainOps(false);
        }
    };

    const deleteDomain = async (domainId) => {
        if (!window.confirm('Are you sure you want to delete this domain?')) return;

        setLoadingDomainOps(true);
        setError('');

        try {
            const response = await fetch(`/api/admin/domain-whitelist/${domainId}`, {
                method: 'DELETE',
                headers: {
                    "X-CSRF-TOKEN": getCSRFToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                fetchDomains();
            } else {
                setError('Failed to delete domain');
            }
        } catch (err) {
            setError('Error deleting domain');
        } finally {
            setLoadingDomainOps(false);
        }
    };

    return (
        <div className="settings-page">

            {error && <div className="error-message">{error}</div>}



            <div className="admin-management-card">
                <div className="admin-management-header">
                    <h2>Current Adminsss</h2>
                    <button onClick={() => setShowAddAdminPopup(true)} className="add-admin-btn">
                        Add Admin
                    </button>
                </div>
                <div className="filter-role-buttons">
                    <button onClick={() => setFilterRole('admin')} className={filterRole === 'admin' ? 'active' : ''}>Admin</button>
                    <button onClick={() => setFilterRole('Manager')} className={filterRole === 'Manager' ? 'active' : ''}>Manager</button>
                    <button onClick={() => setFilterRole('Staff')} className={filterRole === 'Staff' ? 'active' : ''}>Staff</button>
                    <button onClick={() => setFilterRole('Auditor')} className={filterRole === 'Auditor' ? 'active' : ''}>Auditor</button>
                    <button onClick={() => setFilterRole('none')} className={filterRole === 'none' ? 'active' : ''}>Unassigned</button>
                </div>
                <div className="admins-table-wrapper">
                    <table className="admins-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th className="actions-col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.filter(admin => admin.role === filterRole).map((admin) => (
                                <tr key={admin.email}>
                                    <td>{admin.email}</td>
                                    <td>
                                        <select
                                            value={admin.role}
                                            onChange={(e) => updateAdmin(admin.email, e.target.value)}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Staff">Staff</option>
                                            <option value="Auditor">Auditor</option>
                                            <option value="none">None</option>
                                        </select>
                                    </td>
                                    <td className="actions-col">
                                        <button
                                            className="delete-btn"
                                            onClick={() => deleteAdmin(admin.email)}
                                        >
                                           
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="availability-settings">
                <h2>Availability Settings</h2>
                <p>Configure the operating hours and available days for request processing.</p>
                <form className="availability-form" onSubmit={updateSettings}>
                    <div className="time-config-row">
                        <div className="form-group">
                            <label>Start Time:</label>
                            <div className="time-input-group">
                                <select value={startHour} onChange={(e) => setStartHour(e.target.value)}>
                                    {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                                        <option key={h} value={h.toString()}>{h}</option>
                                    ))}
                                </select>
                                <span>:</span>
                                <select value={startMinute} onChange={(e) => setStartMinute(e.target.value)}>
                                    <option value="00">00</option>
                                    <option value="15">15</option>
                                    <option value="30">30</option>
                                    <option value="45">45</option>
                                </select>
                                <select value={startAmpm} onChange={(e) => setStartAmpm(e.target.value)}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>End Time:</label>
                            <div className="time-input-group">
                                <select value={endHour} onChange={(e) => setEndHour(e.target.value)}>
                                    {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                                        <option key={h} value={h.toString()}>{h}</option>
                                    ))}
                                </select>
                                <span>:</span>
                                <select value={endMinute} onChange={(e) => setEndMinute(e.target.value)}>
                                    <option value="00">00</option>
                                    <option value="15">15</option>
                                    <option value="30">30</option>
                                    <option value="45">45</option>
                                </select>
                                <select value={endAmpm} onChange={(e) => setEndAmpm(e.target.value)}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="days-group">
                        <label>Available Days:</label>
                        <div className="days-checkboxes">
                            {DAYS_OF_WEEK.map(day => (
                                <div
                                    key={day}
                                    className={`day-checkbox ${availableDays.includes(day) ? 'active' : ''}`}
                                    onClick={() => toggleDay(day)}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="update-button-wrapper">
                        <button 
                            type="submit" 
                            className="update-settings-btn" 
                            disabled={loading || !isAvailabilityChanged}
                            style={(loading || !isAvailabilityChanged) ? { backgroundColor: '#cccccc', cursor: 'not-allowed' } : {}}
                        >
                            {loading ? 'Updating...' : 'Update Settings'}
                        </button>
                    </div>
                </form>

            </div>

            <div className="availability-settings" style={{ marginTop: '20px' }}>
                <h2>Announcement Configuration</h2>
                <p>Set the announcement text to display on the landing page.</p>
                <form className="availability-form" onSubmit={updateSettings}>
                    <div className="form-group">
                        <label>Announcement Text:</label>
                        <textarea 
                            value={announcement} 
                            onChange={(e) => setAnnouncement(e.target.value)} 
                            placeholder="Enter announcement text that will be displayed on the landing page..."
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', height: '100px', resize: 'vertical' }}
                        />
                    </div>
                    <div className="update-button-wrapper">
                        <button 
                            type="submit" 
                            className="update-settings-btn" 
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Announcement'}
                        </button>
                    </div>
                </form>
            </div>


            <div className="availability-settings" style={{ marginTop: '20px' }}>
                <h2>Admin Fee Configuration</h2>
                <p>Set the administrative fee applied to requests.</p>
                <form className="availability-form" onSubmit={updateAdminFee}>
                    <div className="form-group">
                        <label>Fee Amount (₱):</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={adminFee} 
                            onChange={(e) => setAdminFee(e.target.value)} 
                            onBlur={(e) => setAdminFee(parseFloat(e.target.value || 0).toFixed(2))}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '120px' }}
                        />
                    </div>
                    <div className="update-button-wrapper">
                        <button 
                            type="submit" 
                            className="update-settings-btn" 
                            disabled={loading || !adminFee || parseFloat(adminFee) === parseFloat(initialAdminFee)}
                            style={(loading || !adminFee || parseFloat(adminFee) === parseFloat(initialAdminFee)) ? { backgroundColor: '#cccccc', cursor: 'not-allowed' } : {}}
                        >
                            {loading ? 'Updating...' : 'Update Fee'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="availability-settings" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <h2>Date Availability Management</h2>
                        <p>Configure specific dates as available or unavailable for requests. Date restrictions override time/day restrictions.</p>
                    </div>
                    <button 
                        onClick={() => setShowDateManagement(!showDateManagement)} 
                        className="add-admin-btn"
                        style={{ backgroundColor: showDateManagement ? '#dc3545' : '#007bff' }}
                    >
                        {showDateManagement ? 'Hide Date Management' : 'Manage Dates'}
                    </button>
                </div>

                {showDateManagement && (
                    <div className="date-management-section">
                        {/* Single Date Update */}
                        <div className="date-management-card">
                            <h3>Update Single Date</h3>
                            <form onSubmit={updateDateAvailability}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Date:</label>
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Status:</label>
                                        <select 
                                            value={dateAvailability ? 'available' : 'unavailable'} 
                                            onChange={(e) => setDateAvailability(e.target.value === 'available')}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        >
                                            <option value="available">Available</option>
                                            <option value="unavailable">Unavailable</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label>Reason (optional):</label>
                                        <input 
                                            type="text" 
                                            value={dateReason} 
                                            onChange={(e) => setDateReason(e.target.value)}
                                            placeholder="e.g., Holiday, Maintenance"
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="update-settings-btn"
                                        disabled={!selectedDate || loadingDateOps}
                                    >
                                        {loadingDateOps ? 'Updating...' : 'Update Date'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Bulk Date Update */}
                        <div className="date-management-card">
                            <h3>Bulk Update Date Range</h3>
                            <form onSubmit={bulkUpdateDates}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Start Date:</label>
                                        <input 
                                            type="date" 
                                            value={bulkDateStart} 
                                            onChange={(e) => setBulkDateStart(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>End Date:</label>
                                        <input 
                                            type="date" 
                                            value={bulkDateEnd} 
                                            onChange={(e) => setBulkDateEnd(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Status:</label>
                                        <select 
                                            value={bulkDateAction} 
                                            onChange={(e) => setBulkDateAction(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        >
                                            <option value="available">Available</option>
                                            <option value="unavailable">Unavailable</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label>Reason (optional):</label>
                                        <input 
                                            type="text" 
                                            value={bulkDateReason} 
                                            onChange={(e) => setBulkDateReason(e.target.value)}
                                            placeholder="e.g., Holiday period"
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="update-settings-btn"
                                        disabled={!bulkDateStart || !bulkDateEnd || loadingDateOps}
                                    >
                                        {loadingDateOps ? 'Updating...' : 'Bulk Update'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Current Date Settings */}
                        <div className="date-management-card">
                            <h3>Current Date Settings</h3>
                            {dateSettings.length === 0 ? (
                                <p>No specific date settings configured.</p>
                            ) : (
                                <div className="date-settings-table-wrapper">
                                    <table className="date-settings-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th>Reason</th>
                                                <th>Last Updated</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dateSettings.map((setting) => (
                                                <tr key={setting.id}>
                                                    <td>{setting.date}</td>
                                                    <td>
                                                        <span className={`status-badge ${setting.is_available ? 'available' : 'unavailable'}`}>
                                                            {setting.is_available ? 'Available' : 'Unavailable'}
                                                        </span>
                                                    </td>
                                                    <td>{setting.reason || '-'}</td>
                                                    <td>{setting.updated_at}</td>
                                                    <td>
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => deleteDateAvailability(setting.date)}
                                                            disabled={loadingDateOps}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="availability-settings" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <h2>Domain Whitelist Management</h2>
                        <p>Manage domains allowed for admin authentication. Only users from whitelisted domains can access the admin panel.</p>
                    </div>
                    <button
                        onClick={() => setShowDomainManagement(!showDomainManagement)}
                        className="add-admin-btn"
                        style={{ backgroundColor: showDomainManagement ? '#dc3545' : '#007bff' }}
                    >
                        {showDomainManagement ? 'Hide Domain Management' : 'Manage Domains'}
                    </button>
                </div>

                {showDomainManagement && (
                    <div className="date-management-section">
                        {/* Add New Domain */}
                        <div className="date-management-card">
                            <h3>Add New Domain</h3>
                            <form onSubmit={addDomain}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Domain:</label>
                                        <input
                                            type="text"
                                            value={newDomain}
                                            onChange={(e) => setNewDomain(e.target.value)}
                                            placeholder="e.g., g.msuiit.edu.ph"
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label>Description (optional):</label>
                                        <input
                                            type="text"
                                            value={newDomainDescription}
                                            onChange={(e) => setNewDomainDescription(e.target.value)}
                                            placeholder="Brief description of the domain"
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="update-settings-btn"
                                        disabled={!newDomain.trim() || loadingDomainOps}
                                    >
                                        {loadingDomainOps ? 'Adding...' : 'Add Domain'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Current Domains */}
                        <div className="date-management-card">
                            <h3>Current Whitelisted Domains</h3>
                            {domains.length === 0 ? (
                                <p>No domains configured. Add domains above to allow admin authentication.</p>
                            ) : (
                                <div className="date-settings-table-wrapper">
                                    <table className="date-settings-table">
                                        <thead>
                                            <tr>
                                                <th>Domain</th>
                                                <th>Description</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {domains.map((domain) => (
                                                <tr key={domain.id}>
                                                    <td>{domain.domain}</td>
                                                    <td>{domain.description || '-'}</td>
                                                    <td>
                                                        <span className={`status-badge ${domain.is_active ? 'available' : 'unavailable'}`}>
                                                            {domain.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>{domain.created_at}</td>
                                                    <td>
                                                        <button
                                                            className="update-settings-btn"
                                                            onClick={() => toggleDomainStatus(domain.id)}
                                                            disabled={loadingDomainOps}
                                                            style={{ marginRight: '5px', padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            {domain.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => deleteDomain(domain.id)}
                                                            disabled={loadingDomainOps}
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {roleChangeRequest && (
                <RoleChangeConfirmModal
                    admin={roleChangeRequest.admin}
                    newRole={roleChangeRequest.newRole}
                    onConfirm={confirmRoleChange}
                    onCancel={() => setRoleChangeRequest(null)}
                    isLoading={loading}
                />
            )}

            {showAddAdminPopup && (
                <AddAdminPopup
                    onClose={() => setShowAddAdminPopup(false)}
                    onSave={addAdmin}
                />
            )}
        </div>
    );
};

export default Settings;
