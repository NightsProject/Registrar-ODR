import React, { useState, useEffect } from "react";
import { getCSRFToken } from "../../utils/csrf";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import "./Logs.css";

function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        console.log('Fetching logs from /api/admin/logs');
        try {
            const response = await fetch('/api/admin/logs', {
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
            setLogs(data.logs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading logs..." />;
    }

    if (error) {
        return <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
                <h1 className="logs-header text-3xl font-semibold mb-6 text-gray-800">Logs</h1>
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center">No logs available</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-3 px-4 border-b text-left">Admin ID</th>
                                    <th className="py-3 px-4 border-b text-left">Action</th>
                                    <th className="py-3 px-4 border-b text-left">Details</th>
                                    <th className="py-3 px-4 border-b text-left">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 border-b">{log.admin_id}</td>
                                        <td className="py-3 px-4 border-b">{log.action}</td>
                                        <td className="py-3 px-4 border-b">{log.details}</td>
                                        <td className="py-3 px-4 border-b">{log.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Logs;
