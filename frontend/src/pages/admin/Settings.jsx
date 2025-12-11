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

    useEffect(() => {
        fetchAdmins();
        fetchSettings();
    }, []);

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

    const addAdmin = async (e) => {
        e.preventDefault();
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
                body: JSON.stringify({ email: newEmail, role: newRole }),
            });

            if (response.ok) {
                setNewEmail('');
                setNewRole('admin');
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
                setStartHour(startHour24 === 0 ? '12' : startHour24 > 12 ? (startHour24 - 12).toString() : startHour24.toString());
                setStartMinute(startM);
                setStartAmpm(startHour24 >= 12 ? 'PM' : 'AM');

                const [endH, endM] = data.end_time.split(':');
                const endHour24 = parseInt(endH);
                setEndHour(endHour24 === 0 ? '12' : endHour24 > 12 ? (endHour24 - 12).toString() : endHour24.toString());
                setEndMinute(endM);
                setEndAmpm(endHour24 >= 12 ? 'PM' : 'AM');

                setAvailableDays(data.available_days);
            } else {
                setError('Failed to fetch settings');
            }
        } catch (err) {
            setError('Error fetching settings');
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
                body: JSON.stringify({ start_time: startTime24, end_time: endTime24, available_days: availableDays }),
            });

            if (response.ok) {
                // Settings updated successfully
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

    const toggleDay = (day) => {
        setAvailableDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    return (
        <div className="settings-page">

            {error && <div className="error-message">{error}</div>}



            <div className="admin-management-card">
                <div className="admin-management-header">
                    <h2>Current Admins</h2>
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
                                            Delete
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
                        <button type="submit" className="update-settings-btn" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Settings'}
                        </button>
                    </div>
                </form>
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
