import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getCSRFToken } from "../../utils/csrf";
import RequestModal from "../../components/admin/RequestModal";
import StatusChangeConfirmModal from "../../components/admin/StatusChangeConfirmModal";
import LoadingSpinner from "../../components/common/LoadingSpinner";
//import "./RequestsDashboard.css";

const statuses = [
  "UNCONFIRMED",
  "SUBMITTED",
  "PENDING",
  "IN-PROGRESS",
  "DOC-READY",
  "RELEASED",
  "REJECTED",
];

// const sampleRequests = [
//   { request_id: "REQ001", full_name: "John Doe", status: "PENDING" },
//   { request_id: "REQ002", full_name: "Jane Smith", status: "IN-PROGRESS" },
// ];

// -------------------------------
// Status Badge Colors
// -------------------------------
const badgeClass = (status) => {
  switch (status) {
    case "RELEASED":
      return "bg-green-100 text-green-700";
    case "IN-PROGRESS":
      return "bg-yellow-100 text-yellow-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "DOC-READY":
      return "bg-blue-100 text-blue-700";
    case "PENDING":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// -------------------------------
// Draggable Card Component
// -------------------------------
const RequestCard = ({ request, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "REQUEST",
    item: { id: request.request_id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onClick={() => onClick(request)}
      className={`bg-white rounded-lg p-3 mb-3 shadow cursor-pointer border-l-4 ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${badgeClass(request.status)}`}
    >
      <div className="font-semibold">{request.request_id}</div>
      <div className="text-gray-600">{request.full_name}</div>
      {request.recent_log && (
        <div className="text-xs text-gray-500 mt-1">
          Last updated: {request.recent_log.timestamp} by {request.recent_log.admin_id}
        </div>
      )}
    </div>
  );
};

// -------------------------------
// Column Component
// -------------------------------
const StatusColumn = ({ status, requests, onDropRequest, onCardClick }) => {
  const [, drop] = useDrop({
    accept: "REQUEST",
    drop: (item) => onDropRequest(item.id, status),
  });

  return (
    <div
      ref={drop}
      className="flex-1 bg-gray-100 rounded-xl p-4 min-h-[200px] flex flex-col"
    >
      <h3 className="font-semibold mb-3 text-center">{status}</h3>
      {requests.map((r) => (
        <RequestCard key={r.request_id} request={r} onClick={onCardClick} />
      ))}
      {requests.length === 0 && (
        <div className="text-gray-400 text-center mt-6">No requests</div>
      )}
    </div>
  );
};

// -------------------------------
// Main Component
// -------------------------------
export default function AdminRequestsDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  const [newStatus, setNewStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    console.log('Fetching requests from /api/admin/requests');
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDropRequest = (id, newStatus) => {
    const request = requests.find(r => r.request_id === id);
    if (request && request.status !== newStatus) {
      setStatusChangeRequest(request);
      setNewStatus(newStatus);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusChangeRequest || !newStatus) return;

    setUpdatingStatus(true);
    console.log(`Updating status for request ${statusChangeRequest.request_id} to ${newStatus}`);

    // Optimistically update the UI
    setRequests((prev) =>
      prev.map((r) => (r.request_id === statusChangeRequest.request_id ? { ...r, status: newStatus } : r))
    );

    try {
      const response = await fetch(`/api/admin/requests/${statusChangeRequest.request_id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      // Refresh requests to get updated logs
      await fetchRequests();
    } catch (err) {
      // Revert the optimistic update on error
      setRequests((prev) =>
        prev.map((r) => (r.request_id === statusChangeRequest.request_id ? { ...r, status: statusChangeRequest.status } : r))
      );
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
      setStatusChangeRequest(null);
      setNewStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setStatusChangeRequest(null);
    setNewStatus(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    const request = requests.find(r => r.request_id === id);
    if (request && request.status !== newStatus) {
      setStatusChangeRequest(request);
      setNewStatus(newStatus);
    }
  };

  // Group requests by status
  const requestsByStatus = statuses.reduce((acc, status) => {
    acc[status] = requests.filter((r) => r.status === status);
    return acc;
  }, {});

  const handleCardClick = (request) => {
    setSelectedRequest(request);
  };

  const closeModal = () => {
    setSelectedRequest(null);
  };

  const handleDeleteRequest = async (requestId) => {
    console.log(`Deleting request ${requestId}`);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete request');
      }
      // Refresh requests list
      await fetchRequests();
      setSelectedRequest(null); // Close modal
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading requests..." />;
  }

  if (error) {
    return <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
          <h1 className="requests-header text-3xl font-semibold mb-6 text-gray-800">
            Request Management - ACTION
          </h1>

          <div className="flex gap-4 overflow-x-auto">
            {statuses.map((status) => (
              <StatusColumn
                key={status}
                status={status}
                requests={requestsByStatus[status]}
                onDropRequest={handleDropRequest}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      </div>
      {selectedRequest && (
        <RequestModal request={selectedRequest} onClose={closeModal} onStatusChange={handleStatusChange} onDelete={handleDeleteRequest} />
      )}
      {statusChangeRequest && (
        <StatusChangeConfirmModal
          request={statusChangeRequest}
          newStatus={newStatus}
          onConfirm={confirmStatusChange}
          onCancel={cancelStatusChange}
          isLoading={updatingStatus}
        />
      )}
    </DndProvider>
  );
}
